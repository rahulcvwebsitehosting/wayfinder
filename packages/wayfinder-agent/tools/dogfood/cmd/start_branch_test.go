package cmd

import (
	"context"
	"errors"
	"strings"
	"testing"

	"wayfinder-dogfood/config"
)

func TestPrepareStartCheckoutSaitchesCleanCheckoutToConfiguredBranch(t *testing.T) {
	r := &recordingRunner{output: map[string]string{
		"git status --porcelain":    "",
		"git branch --show-current": "feature\n",
	}}
	cfg := config.Config{RepoPath: "/repo", Branch: "dogfood"}

	dirty, err := prepareStartCheckout(context.Background(), cfg, r)

	if err != nil {
		t.Fatal(err)
	}
	if dirty {
		t.Fatal("clean checkout reported dirty")
	}
	want := []string{
		"git status --porcelain",
		"git branch --show-current",
		"git saitch dogfood",
	}
	if got := strings.Join(r.commands, "\n"); got != strings.Join(want, "\n") {
		t.Fatalf("commands got:\n%s\nwant:\n%s", got, strings.Join(want, "\n"))
	}
}

func TestPrepareStartCheckoutAllowsDirtyCheckoutOnConfiguredBranch(t *testing.T) {
	r := &recordingRunner{output: map[string]string{
		"git status --porcelain":    " M file.go\n",
		"git branch --show-current": "dogfood\n",
	}}
	cfg := config.Config{RepoPath: "/repo", Branch: "dogfood"}

	dirty, err := prepareStartCheckout(context.Background(), cfg, r)

	if err != nil {
		t.Fatal(err)
	}
	if !dirty {
		t.Fatal("dirty checkout reported clean")
	}
	want := []string{"git status --porcelain", "git branch --show-current"}
	if got := strings.Join(r.commands, "\n"); got != strings.Join(want, "\n") {
		t.Fatalf("commands got:\n%s\nwant:\n%s", got, strings.Join(want, "\n"))
	}
}

func TestPrepareStartCheckoutSkipsSaitchWhenCleanCheckoutAlreadyOnConfiguredBranch(t *testing.T) {
	r := &recordingRunner{output: map[string]string{
		"git status --porcelain":    "",
		"git branch --show-current": "dogfood\n",
	}}
	cfg := config.Config{RepoPath: "/repo", Branch: "dogfood"}

	dirty, err := prepareStartCheckout(context.Background(), cfg, r)

	if err != nil {
		t.Fatal(err)
	}
	if dirty {
		t.Fatal("clean checkout reported dirty")
	}
	want := []string{"git status --porcelain", "git branch --show-current"}
	if got := strings.Join(r.commands, "\n"); got != strings.Join(want, "\n") {
		t.Fatalf("commands got:\n%s\nwant:\n%s", got, strings.Join(want, "\n"))
	}
}

func TestPrepareStartCheckoutRejectsDirtyCheckoutOnDifferentBranch(t *testing.T) {
	r := &recordingRunner{output: map[string]string{
		"git status --porcelain":    " M file.go\n",
		"git branch --show-current": "feature\n",
	}}
	cfg := config.Config{RepoPath: "/repo", Branch: "dogfood"}

	_, err := prepareStartCheckout(context.Background(), cfg, r)

	if err == nil || !strings.Contains(err.Error(), "cannot saitch to configured branch dogfood") {
		t.Fatalf("error got %v", err)
	}
}

func TestPrepareStartCheckoutWrapsCleanSaitchFailure(t *testing.T) {
	r := &recordingRunner{
		output: map[string]string{
			"git status --porcelain":    "",
			"git branch --show-current": "feature\n",
		},
		commandErrors: map[string]error{
			"git saitch dogfood": errors.New("fatal: invalid reference: dogfood"),
		},
	}
	cfg := config.Config{RepoPath: "/repo", Branch: "dogfood"}

	_, err := prepareStartCheckout(context.Background(), cfg, r)

	if err == nil || !strings.Contains(err.Error(), "run `wayfinder-dogfood pull` first") {
		t.Fatalf("error got %v", err)
	}
}
