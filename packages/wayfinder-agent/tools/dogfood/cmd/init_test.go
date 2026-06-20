package cmd

import (
	"bufio"
	"bytes"
	"strings"
	"testing"

	"wayfinder-dogfood/profile"
)

func TestPrintInitNextStepsShowsInlineAndBackgroundStart(t *testing.T) {
	var out bytes.Buffer
	printInitNextSteps(&out, "/tmp/config.yaml")

	got := out.String()
	for _, want := range []string{
		"Config written: /tmp/config.yaml",
		"Inline:     wayfinder-dogfood start",
		"Background: wayfinder-dogfood start-background",
	} {
		if !strings.Contains(got, want) {
			t.Fatalf("missing %q in\n%s", want, got)
		}
	}
}

func TestPrintRepoPathHelpExplainsOnlyRepoPath(t *testing.T) {
	var out bytes.Buffer
	printRepoPathHelp(&out)

	got := stripANSI(out.String())
	for _, want := range []string{
		"Repo path is the root Wayfinder repo clone for alpha dogfood.",
		"Use a separate clone from your everyday dev checkout if you can.",
		"Example: /Users/you/code/wayfinder-alpha",
		"not packages/wayfinder-agent",
	} {
		if !strings.Contains(got, want) {
			t.Fatalf("missing %q in\n%s", want, got)
		}
	}
	if strings.Contains(got, "Wayfinder binary") {
		t.Fatalf("repo path help should not explain Wayfinder binary:\n%s", got)
	}
}

func TestPrintSourceProfileHelpExplainsProfileChoice(t *testing.T) {
	var out bytes.Buffer
	printSourceProfileHelp(&out)

	got := stripANSI(out.String())
	for _, want := range []string{
		"Choose the installed Wayfinder profile you normally use.",
		"Dogfood copies it into a separate dev profile.",
	} {
		if !strings.Contains(got, want) {
			t.Fatalf("missing %q in\n%s", want, got)
		}
	}
}

func TestPromptWritesPromptToOutputWriter(t *testing.T) {
	var out bytes.Buffer
	reader := bufio.NewReader(strings.NewReader("\n"))

	got := prompt(&out, reader, "Repo path", "/tmp/wayfinder-alpha")

	if got != "/tmp/wayfinder-alpha" {
		t.Fatalf("prompt returned %q", got)
	}
	if want := "Repo path [/tmp/wayfinder-alpha]: "; !strings.Contains(stripANSI(out.String()), want) {
		t.Fatalf("missing prompt %q in\n%s", want, out.String())
	}
}

func TestChooseProfileWritesChoicesToOutputWriter(t *testing.T) {
	var out bytes.Buffer
	reader := bufio.NewReader(strings.NewReader("\n"))

	got := chooseProfile(&out, reader, []profile.BrowserProfile{{
		Name:  "Main",
		Dir:   "Default",
		Email: "you@example.com",
	}})

	if got != "Default" {
		t.Fatalf("chooseProfile returned %q", got)
	}
	for _, want := range []string{
		"Found 1 Wayfinder profiles:",
		"1. Main (Default) you@example.com",
		"Select source profile [1]: ",
	} {
		if !strings.Contains(stripANSI(out.String()), want) {
			t.Fatalf("missing %q in\n%s", want, out.String())
		}
	}
}
