package browser

import (
	"strings"
	"testing"

	"wayfinder-dev/proc"
)

func TestBuildArgsUsesDevDockIcon(t *testing.T) {
	args := BuildArgs(ArgsConfig{
		Root:              "/repo/packages/wayfinder-agent",
		Ports:             proc.Ports{CDP: 9005, Server: 9105, Extension: 9305},
		UserDataDir:       "/tmp/wayfinder-dev",
		LoadDevExtensions: true,
	})
	joined := strings.Join(args, "\n")
	if !strings.Contains(joined, "--wayfinder-dock-icon=dev") {
		t.Fatalf("missing dev dock icon arg in\n%s", joined)
	}
}
