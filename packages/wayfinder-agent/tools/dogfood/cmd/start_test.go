package cmd

import (
	"reflect"
	"strings"
	"testing"

	"wayfinder-dogfood/config"
)

func TestServerCommandDoesNotWatchFiles(t *testing.T) {
	got := serverCommand()
	want := []string{"bun", "--env-file=.env.development", "src/index.ts"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("server command got %#v want %#v", got, want)
	}
}

func TestReportProgressInvokesConfiguredProgress(t *testing.T) {
	var got []string
	reportProgress(environmentOptions{
		Progress: func(message string) {
			got = append(got, message)
		},
	}, "checking repo")

	want := []string{"checking repo"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("progress got %#v want %#v", got, want)
	}
}

func TestServerRuntimeEnvSetsWayfinderDir(t *testing.T) {
	got := serverRuntimeEnv([]string{"PATH=/bin"}, config.Config{
		WayfinderDir: "/tmp/wayfinder-dogfood",
		Ports:        config.Ports{CDP: 9015, Server: 9115, Extension: 9315},
	})

	assertEnvContains(t, got, "WAYFINDER_DIR=/tmp/wayfinder-dogfood")
}

func TestServerRuntimeEnvOverridesInheritedWayfinderDir(t *testing.T) {
	got := serverRuntimeEnv([]string{
		"WAYFINDER_DIR=/tmp/arong",
		"PATH=/bin",
	}, config.Config{
		WayfinderDir: "/tmp/wayfinder-dogfood",
		Ports:        config.Ports{CDP: 9015, Server: 9115, Extension: 9315},
	})

	if strings.Contains(strings.Join(got, "\n"), "WAYFINDER_DIR=/tmp/arong") {
		t.Fatalf("inherited Wayfinder dir was not overridden: %#v", got)
	}
	assertEnvContains(t, got, "WAYFINDER_DIR=/tmp/wayfinder-dogfood")
}

func assertEnvContains(t *testing.T, env []string, want string) {
	t.Helper()
	for _, entry := range env {
		if entry == want {
			return
		}
	}
	t.Fatalf("env missing %q: %#v", want, env)
}
