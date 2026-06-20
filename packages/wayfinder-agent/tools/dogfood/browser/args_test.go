package browser

import (
	"strings"
	"testing"

	"wayfinder-dogfood/config"
)

func TestBuildArgs(t *testing.T) {
	args := BuildArgs(ArgsConfig{
		Binary:      "/Applications/Wayfinder.app/Contents/MacOS/Wayfinder",
		AgentRoot:   "/repo/packages/wayfinder-agent",
		UserDataDir: "/tmp/wayfinder-dogfood",
		ProfileDir:  "Default",
		Ports:       config.Ports{CDP: 9015, Server: 9115, Extension: 9315},
	})
	joined := strings.Join(args, "\n")
	for _, want := range []string{
		"--remote-debugging-port=9015",
		"--wayfinder-mcp-port=9115",
		"--wayfinder-server-port=9115",
		"--wayfinder-proxy-port=9115",
		"--wayfinder-extension-port=9315",
		"--user-data-dir=/tmp/wayfinder-dogfood",
		"--profile-directory=Default",
		"--disable-wayfinder-server",
		"--disable-wayfinder-extensions",
		"--wayfinder-dock-icon=alpha",
		"--enable-logging=stderr",
		"--load-extension=/repo/packages/wayfinder-agent/apps/agent/dist/chrome-mv3-dev",
		"chrome://newtab",
	} {
		if !strings.Contains(joined, want) {
			t.Fatalf("missing %s in\n%s", want, joined)
		}
	}
	if strings.Contains(joined, "--use-mock-keychain") {
		t.Fatal("must not use mock keychain")
	}
}

func TestBuildArgsHeadless(t *testing.T) {
	args := BuildArgs(ArgsConfig{
		Binary:      "/bin/browser",
		AgentRoot:   "/repo/packages/wayfinder-agent",
		UserDataDir: "/tmp/wayfinder-dogfood",
		Ports:       config.Ports{CDP: 1, Server: 2, Extension: 3},
		Headless:    true,
	})
	if !contains(args, "--headless=new") {
		t.Fatalf("missing headless arg: %#v", args)
	}
}

func contains(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}
