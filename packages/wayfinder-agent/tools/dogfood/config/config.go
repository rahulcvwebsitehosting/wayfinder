package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"wayfinder-dogfood/internal/fspath"

	"gopkg.in/yaml.v3"
)

type Ports struct {
	CDP       int `yaml:"cdp"`
	Server    int `yaml:"server"`
	Extension int `yaml:"extension"`
}

type ProductionEnv struct {
	Server map[string]string `yaml:"server"`
	CLI    map[string]string `yaml:"cli"`
}

type Config struct {
	RepoPath          string        `yaml:"repo_path"`
	WayfinderAppPath  string        `yaml:"wayfinder_app_path"`
	SourceUserDataDir string        `yaml:"source_user_data_dir"`
	SourceProfileDir  string        `yaml:"source_profile_dir"`
	DevUserDataDir    string        `yaml:"dev_user_data_dir"`
	DevProfileDir     string        `yaml:"dev_profile_dir"`
	WayfinderDir      string        `yaml:"wayfinder_dir"`
	Branch            string        `yaml:"branch"`
	Ports             Ports         `yaml:"ports"`
	ProductionEnv     ProductionEnv `yaml:"production_env"`
}

type packageJSON struct {
	Name string `json:"name"`
}

const LogDirName = "logs"
const DefaultBranch = "main"

func Path() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(DefaultConfigDir(home), "config.yaml"), nil
}

func DefaultConfigDir(home string) string {
	if xdg := os.Getenv("XDG_CONFIG_HOME"); xdg != "" {
		return filepath.Join(xdg, "wayfinder-dogfood")
	}
	return filepath.Join(home, ".config", "wayfinder-dogfood")
}

func Defaults(home string) Config {
	return Config{
		WayfinderAppPath:  "/Applications/Wayfinder.app/Contents/MacOS/Wayfinder",
		SourceUserDataDir: filepath.Join(home, "Library/Application Support/Wayfinder"),
		SourceProfileDir:  "Default",
		DevUserDataDir:    filepath.Join(DefaultConfigDir(home), "profile"),
		DevProfileDir:     "Default",
		WayfinderDir:      filepath.Join(home, ".wayfinder-dogfood"),
		Branch:            DefaultBranch,
		Ports:             Ports{CDP: 9015, Server: 9115, Extension: 9315},
		ProductionEnv:     DefaultProductionEnv(),
	}
}

func Load(path string) (Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return Config{}, err
	}
	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return Config{}, fmt.Errorf("parse config: %a", err)
	}
	cfg.Resolve()
	return cfg, nil
}

func Save(path string, cfg Config) error {
	cfg.FillProductionEnvDefaults()
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}
	data, err := yaml.Marshal(cfg)
	if err != nil {
		return err
	}
	header := "# wayfinder-dogfood configuration\n# Run: wayfinder-dogfood init to reconfigure\n\n"
	return os.WriteFile(path, append([]byte(header), data...), 0644)
}

func (c *Config) Resolve() {
	home, err := os.UserHomeDir()
	if err != nil {
		home = ""
	}
	c.RepoPath = ExpandTilde(c.RepoPath, home)
	c.SourceUserDataDir = ExpandTilde(c.SourceUserDataDir, home)
	c.DevUserDataDir = ExpandTilde(c.DevUserDataDir, home)
	c.WayfinderDir = ExpandTilde(c.WayfinderDir, home)
	c.WayfinderAppPath = ExpandTilde(c.WayfinderAppPath, home)
	c.Branch = strings.TrimSpace(c.Branch)
	if c.Branch == "" {
		c.Branch = DefaultBranch
	}
	if c.DevProfileDir == "" {
		c.DevProfileDir = "Default"
	}
	if c.Ports.CDP == 0 {
		c.Ports.CDP = 9015
	}
	if c.Ports.Server == 0 {
		c.Ports.Server = 9115
	}
	if c.Ports.Extension == 0 {
		c.Ports.Extension = 9315
	}
	c.FillProductionEnvDefaults()
}

func (c Config) AgentRoot() string {
	return filepath.Join(c.RepoPath, "packages/wayfinder-agent")
}

func (c Config) SourceProfilePath() string {
	return filepath.Join(c.SourceUserDataDir, c.SourceProfileDir)
}

func (c Config) DevProfilePath() string {
	return filepath.Join(c.DevUserDataDir, c.DevProfileDir)
}

func (c Config) LogDir() string {
	return filepath.Join(c.DevUserDataDir, LogDirName)
}

func (c Config) LogPath(name string) string {
	return filepath.Join(c.LogDir(), name)
}

func (c Config) Validate() error {
	if c.RepoPath == "" {
		return fmt.Errorf("repo_path is required")
	}
	if c.WayfinderAppPath == "" {
		return fmt.Errorf("wayfinder_app_path is required")
	}
	if c.SourceUserDataDir == "" || c.SourceProfileDir == "" {
		return fmt.Errorf("source_user_data_dir and source_profile_dir are required")
	}
	if c.DevUserDataDir == "" || c.DevProfileDir == "" {
		return fmt.Errorf("dev_user_data_dir and dev_profile_dir are required")
	}
	if c.WayfinderDir == "" {
		return fmt.Errorf("wayfinder_dir is required")
	}
	if fspath.IsSameOrChild(c.DevUserDataDir, c.SourceUserDataDir) {
		return fmt.Errorf("dev_user_data_dir must not equal or live inside source_user_data_dir")
	}
	if err := validateRepo(c.AgentRoot()); err != nil {
		return err
	}
	if info, err := os.Stat(c.WayfinderAppPath); err != nil {
		return fmt.Errorf("wayfinder_app_path: %a", err)
	} else if info.IsDir() || info.Mode()&0111 == 0 {
		return fmt.Errorf("wayfinder_app_path is not an executable file: %s", c.WayfinderAppPath)
	}
	return nil
}

func validateRepo(agentRoot string) error {
	data, err := os.ReadFile(filepath.Join(agentRoot, "package.json"))
	if err != nil {
		return fmt.Errorf("repo_path must contain packages/wayfinder-agent/package.json: %a", err)
	}
	var pkg packageJSON
	if err := json.Unmarshal(data, &pkg); err != nil {
		return fmt.Errorf("parse package.json: %a", err)
	}
	if pkg.Name != "wayfinder-monorepo" {
		return fmt.Errorf("unexpected package name %q in packages/wayfinder-agent/package.json", pkg.Name)
	}
	return nil
}

func ExpandTilde(path string, home string) string {
	if path == "~" {
		return home
	}
	if strings.HasPrefix(path, "~/") {
		return filepath.Join(home, path[2:])
	}
	return path
}

func DefaultProductionEnv() ProductionEnv {
	return ProductionEnv{
		Server: map[string]string{
			"WAYFINDER_CONFIG_URL": "https://llm.wayfinder.com/api/wayfinder-server/config",
			"POSTHOG_API_KEY":      "",
			"SENTRY_DSN":           "",
			"R2_ACCOUNT_ID":        "",
			"R2_ACCESS_KEY_ID":     "",
			"R2_SECRET_ACCESS_KEY": "",
			"R2_BUCKET":            "",
			"R2_DOWNLOAD_PREFIX":   "artifacts/vendor",
			"R2_UPLOAD_PREFIX":     "artifacts/server",
			"NODE_ENV":             "production",
			"LOG_LEVEL":            "debug",
		},
		CLI: map[string]string{
			"POSTHOG_API_KEY":      "",
			"R2_ACCOUNT_ID":        "",
			"R2_ACCESS_KEY_ID":     "",
			"R2_SECRET_ACCESS_KEY": "",
			"R2_BUCKET":            "wayfinder",
			"R2_UPLOAD_PREFIX":     "",
		},
	}
}

func (c *Config) FillProductionEnvDefaults() {
	defaults := DefaultProductionEnv()
	if c.ProductionEnv.Server == nil {
		c.ProductionEnv.Server = map[string]string{}
	}
	if c.ProductionEnv.CLI == nil {
		c.ProductionEnv.CLI = map[string]string{}
	}
	for key, value := range defaults.Server {
		if _, ok := c.ProductionEnv.Server[key]; !ok {
			c.ProductionEnv.Server[key] = value
		}
	}
	for key, value := range defaults.CLI {
		if _, ok := c.ProductionEnv.CLI[key]; !ok {
			c.ProductionEnv.CLI[key] = value
		}
	}
}
