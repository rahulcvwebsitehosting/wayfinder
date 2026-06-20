package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDefaults(t *testing.T) {
	home := t.TempDir()
	t.Setenv("XDG_CONFIG_HOME", "")
	cfg := Defaults(home)

	if cfg.WayfinderAppPath != "/Applications/Wayfinder.app/Contents/MacOS/Wayfinder" {
		t.Fatalf("unexpected browser path: %s", cfg.WayfinderAppPath)
	}
	if cfg.SourceUserDataDir != filepath.Join(home, "Library/Application Support/Wayfinder") {
		t.Fatalf("unexpected source dir: %s", cfg.SourceUserDataDir)
	}
	if cfg.DevUserDataDir != filepath.Join(home, ".config/wayfinder-dogfood/profile") {
		t.Fatalf("unexpected dev dir: %s", cfg.DevUserDataDir)
	}
	if cfg.WayfinderDir != filepath.Join(home, ".wayfinder-dogfood") {
		t.Fatalf("unexpected Wayfinder dir: %s", cfg.WayfinderDir)
	}
	if cfg.Branch != "main" {
		t.Fatalf("unexpected branch: %s", cfg.Branch)
	}
	if cfg.LogDir() != filepath.Join(home, ".config/wayfinder-dogfood/profile/logs") {
		t.Fatalf("unexpected log dir: %s", cfg.LogDir())
	}
	if cfg.DevProfileDir != "Default" {
		t.Fatalf("unexpected dev profile: %s", cfg.DevProfileDir)
	}
	if cfg.Ports.CDP != 9015 || cfg.Ports.Server != 9115 || cfg.Ports.Extension != 9315 {
		t.Fatalf("unexpected ports: %+v", cfg.Ports)
	}
	if cfg.ProductionEnv.Server["WAYFINDER_CONFIG_URL"] == "" {
		t.Fatalf("missing server production env defaults: %#v", cfg.ProductionEnv.Server)
	}
	if cfg.ProductionEnv.Server["LOG_LEVEL"] != "debug" {
		t.Fatalf("server log level got %q want debug", cfg.ProductionEnv.Server["LOG_LEVEL"])
	}
	if cfg.ProductionEnv.CLI["R2_BUCKET"] != "wayfinder" {
		t.Fatalf("missing cli production env defaults: %#v", cfg.ProductionEnv.CLI)
	}
	if cfg.ProductionEnv.CLI["R2_UPLOAD_PREFIX"] != "" {
		t.Fatalf("cli upload prefix got %q want empty", cfg.ProductionEnv.CLI["R2_UPLOAD_PREFIX"])
	}
}

func TestLogPathUsesProfileLogDir(t *testing.T) {
	cfg := Config{DevUserDataDir: "/tmp/wayfinder-dogfood-profile"}
	got := cfg.LogPath("server.log")
	want := filepath.Join("/tmp/wayfinder-dogfood-profile", "logs", "server.log")
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestSaveLoadRoundTrip(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.yaml")
	cfg := Config{
		RepoPath:          "/repo",
		WayfinderAppPath:  "/Applications/Wayfinder.app/Contents/MacOS/Wayfinder",
		SourceUserDataDir: "/source",
		SourceProfileDir:  "Profile 25",
		DevUserDataDir:    "/dev",
		DevProfileDir:     "Default",
		WayfinderDir:      "/wayfinder-dogfood",
		Branch:            "dogfood",
		Ports:             Ports{CDP: 9015, Server: 9115, Extension: 9315},
		ProductionEnv: ProductionEnv{
			Server: map[string]string{"NODE_ENV": "production"},
			CLI:    map[string]string{"R2_BUCKET": "wayfinder"},
		},
	}

	if err := Save(path, cfg); err != nil {
		t.Fatalf("save: %v", err)
	}
	got, err := Load(path)
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if got.SourceProfileDir != cfg.SourceProfileDir {
		t.Fatalf("source profile mismatch: %q", got.SourceProfileDir)
	}
	if got.Ports.Server != 9115 {
		t.Fatalf("server port mismatch: %d", got.Ports.Server)
	}
	if got.WayfinderDir != cfg.WayfinderDir {
		t.Fatalf("Wayfinder dir mismatch: %q", got.WayfinderDir)
	}
	if got.Branch != cfg.Branch {
		t.Fatalf("branch mismatch: %q", got.Branch)
	}
	if got.ProductionEnv.CLI["R2_BUCKET"] != "wayfinder" {
		t.Fatalf("production env mismatch: %#v", got.ProductionEnv)
	}
}

func TestResolveDefaultsBranch(t *testing.T) {
	cfg := Config{}

	cfg.Resolve()

	if cfg.Branch != "main" {
		t.Fatalf("branch got %q want main", cfg.Branch)
	}
}

func TestExpandTilde(t *testing.T) {
	got := ExpandTilde("~/x", "/Users/test")
	want := filepath.Join("/Users/test", "x")
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestValidateRejectsSourceInsideDev(t *testing.T) {
	cfg := Config{
		RepoPath:          t.TempDir(),
		WayfinderAppPath:  "/bin/sh",
		SourceUserDataDir: "/tmp/source",
		SourceProfileDir:  "Default",
		DevUserDataDir:    "/tmp/source/dev",
		DevProfileDir:     "Default",
		WayfinderDir:      "/tmp/wayfinder-dogfood",
		Ports:             Ports{CDP: 9015, Server: 9115, Extension: 9315},
	}
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected validation error")
	}
}

func TestConfigPathHonorsXDG(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("XDG_CONFIG_HOME", dir)
	got, err := Path()
	if err != nil {
		t.Fatal(err)
	}
	want := filepath.Join(dir, "wayfinder-dogfood", "config.yaml")
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestPathDefault(t *testing.T) {
	t.Setenv("XDG_CONFIG_HOME", "")
	home := t.TempDir()
	t.Setenv("HOME", home)
	got, err := Path()
	if err != nil {
		t.Fatal(err)
	}
	want := filepath.Join(home, ".config", "wayfinder-dogfood", "config.yaml")
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestValidateRepoShape(t *testing.T) {
	repo := t.TempDir()
	agentRoot := filepath.Join(repo, "packages/wayfinder-agent")
	if err := os.MkdirAll(agentRoot, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(agentRoot, "package.json"), []byte(`{"name":"wayfinder-monorepo"}`), 0644); err != nil {
		t.Fatal(err)
	}
	cfg := Config{
		RepoPath:          repo,
		WayfinderAppPath:  "/bin/sh",
		SourceUserDataDir: "/tmp/source",
		SourceProfileDir:  "Default",
		DevUserDataDir:    "/tmp/dev",
		DevProfileDir:     "Default",
		WayfinderDir:      "/tmp/wayfinder-dogfood",
		Ports:             Ports{CDP: 9015, Server: 9115, Extension: 9315},
	}
	if err := cfg.Validate(); err != nil {
		t.Fatalf("validate: %v", err)
	}
}

func TestResolveExpandsWayfinderDir(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	cfg := Config{WayfinderDir: "~/.wayfinder-dogfood"}

	cfg.Resolve()

	want := filepath.Join(home, ".wayfinder-dogfood")
	if cfg.WayfinderDir != want {
		t.Fatalf("expanded Wayfinder dir got %q want %q", cfg.WayfinderDir, want)
	}
}

func TestValidateRequiresWayfinderDir(t *testing.T) {
	cfg := Config{
		RepoPath:          t.TempDir(),
		WayfinderAppPath:  "/bin/sh",
		SourceUserDataDir: "/tmp/source",
		SourceProfileDir:  "Default",
		DevUserDataDir:    "/tmp/dev",
		DevProfileDir:     "Default",
		Ports:             Ports{CDP: 9015, Server: 9115, Extension: 9315},
	}

	if err := cfg.Validate(); err == nil {
		t.Fatal("expected missing Wayfinder dir to fail validation")
	}
}
