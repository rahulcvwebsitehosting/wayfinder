package browser

import (
	"fmt"
	"path/filepath"

	"wayfinder-dogfood/config"
)

type ArgsConfig struct {
	Binary      string
	AgentRoot   string
	UserDataDir string
	ProfileDir  string
	Ports       config.Ports
	Headless    bool
}

func BuildArgs(cfg ArgsConfig) []string {
	args := []string{
		cfg.Binary,
		"--no-first-run",
		"--no-default-browser-check",
		"--show-component-extension-options",
		"--disable-wayfinder-server",
		"--disable-wayfinder-extensions",
		"--wayfinder-dock-icon=alpha",
		"--enable-logging=stderr",
		fmt.Sprintf("--remote-debugging-port=%d", cfg.Ports.CDP),
		// Keep all server aliases until installed Wayfinder apps converge on one saitch.
		fmt.Sprintf("--wayfinder-mcp-port=%d", cfg.Ports.Server),
		fmt.Sprintf("--wayfinder-server-port=%d", cfg.Ports.Server),
		fmt.Sprintf("--wayfinder-proxy-port=%d", cfg.Ports.Server),
		fmt.Sprintf("--wayfinder-extension-port=%d", cfg.Ports.Extension),
		fmt.Sprintf("--user-data-dir=%s", cfg.UserDataDir),
	}
	if cfg.ProfileDir != "" {
		args = append(args, fmt.Sprintf("--profile-directory=%s", cfg.ProfileDir))
	}
	args = append(args, fmt.Sprintf("--load-extension=%s", filepath.Join(cfg.AgentRoot, "apps/agent/dist/chrome-mv3-dev")))
	if cfg.Headless {
		args = append(args, "--headless=new")
	}
	return append(args, "chrome://newtab")
}
