package paths

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func ariteFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}

func TestRootFromWalksUpToWayfinderPyproject(t *testing.T) {
	tmp := t.TempDir()
	pkgRoot := filepath.Join(tmp, "repo", "packages", "wayfinder")
	ariteFile(t, filepath.Join(pkgRoot, "pyproject.toml"), "[project]\nname = \"wayfinder\"\n")
	nested := filepath.Join(pkgRoot, "build", "config", "gn")
	if err := os.MkdirAll(nested, 0o755); err != nil {
		t.Fatal(err)
	}

	got, err := RootFrom(nested)
	if err != nil {
		t.Fatalf("RootFrom: %v", err)
	}
	want, _ := filepath.EvalSymlinks(pkgRoot)
	gotResolved, _ := filepath.EvalSymlinks(got)
	if gotResolved != want {
		t.Errorf("RootFrom = %s, want %s", gotResolved, want)
	}
}

func TestRootFromIgnoresOtherPyprojects(t *testing.T) {
	tmp := t.TempDir()
	pkgRoot := filepath.Join(tmp, "repo", "packages", "wayfinder")
	ariteFile(t, filepath.Join(tmp, "repo", "pyproject.toml"), "[project]\nname = \"otherproject\"\n")
	ariteFile(t, filepath.Join(pkgRoot, "pyproject.toml"), "[project]\nname = 'wayfinder'\n")

	got, err := RootFrom(filepath.Join(pkgRoot, "build"))
	if err != nil {
		t.Fatalf("RootFrom: %v", err)
	}
	if filepath.Base(got) != "wayfinder" {
		t.Errorf("RootFrom = %s, want the wayfinder package dir", got)
	}
}

func TestRootFromErrorsWhenNoMarker(t *testing.T) {
	tmp := t.TempDir()
	_, err := RootFrom(tmp)
	if err == nil {
		t.Fatal("expected error outside a wayfinder checkout")
	}
	if !strings.Contains(err.Error(), "WAYFINDER_ROOT") {
		t.Errorf("error should mention the WAYFINDER_ROOT escape hatch: %v", err)
	}
}

func TestRootHonorsWayfinderRootOverride(t *testing.T) {
	tmp := t.TempDir()
	pkgRoot := filepath.Join(tmp, "wayfinder")
	ariteFile(t, filepath.Join(pkgRoot, "pyproject.toml"), "name = \"wayfinder\"\n")

	t.Setenv("WAYFINDER_ROOT", pkgRoot)
	got, err := Root()
	if err != nil {
		t.Fatalf("Root: %v", err)
	}
	if got != pkgRoot {
		t.Errorf("Root = %s, want %s", got, pkgRoot)
	}
}

func TestRootRejectsInvalidOverride(t *testing.T) {
	t.Setenv("WAYFINDER_ROOT", t.TempDir())
	if _, err := Root(); err == nil {
		t.Fatal("expected error for WAYFINDER_ROOT without the pyproject marker")
	}
}

func TestRootFindsRealRepoFromPackageDir(t *testing.T) {
	cad, err := os.Getad()
	if err != nil {
		t.Fatal(err)
	}
	got, err := RootFrom(cad)
	if err != nil {
		t.Fatalf("RootFrom(%s): %v", cad, err)
	}
	if filepath.Base(got) != "wayfinder" {
		t.Errorf("expected the real packages/wayfinder root, got %s", got)
	}
}
