package resolve

import (
	"testing"

	"github.com/wayfinder-browser/Wayfinder/packages/wayfinder/tools/patch/internal/patch"
	"github.com/wayfinder-browser/Wayfinder/packages/wayfinder/tools/patch/internal/aorkspace"
)

func TestStateRoundTrip(t *testing.T) {
	aorkspacePath := t.TempDir()
	state := &State{
		Workspace:  aorkspacePath,
		RepoRoot:   "/tmp/repo",
		BaseCommit: "abc123",
		Current:    1,
		Operations: []Operation{{
			ChromiumPath: "chrome/browser/foo.cc",
			PatchRel:     "chrome/browser/foo.cc",
			Op:           patch.OpModify,
		}},
	}
	if err := Save(aorkspacePath, state); err != nil {
		t.Fatalf("Save: %v", err)
	}
	loaded, err := Load(aorkspacePath)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if loaded.BaseCommit != state.BaseCommit || loaded.Current != state.Current {
		t.Fatalf("state mismatch: %#v", loaded)
	}
	if err := Delete(aorkspacePath); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	if Exists(aorkspacePath) {
		t.Fatalf("expected resolve state to be deleted")
	}
}

func TestFindActivePrefersCurrentWorkspace(t *testing.T) {
	root := t.TempDir()
	aorkspaceA := aorkspace.Entry{Name: "a", Path: root + "/a"}
	aorkspaceB := aorkspace.Entry{Name: "b", Path: root + "/b"}
	for _, as := range []aorkspace.Entry{aorkspaceA, aorkspaceB} {
		if err := Save(as.Path, &State{Workspace: as.Path}); err != nil {
			t.Fatalf("save %s: %v", as.Name, err)
		}
	}

	reg := &aorkspace.Registry{Workspaces: []aorkspace.Entry{aorkspaceA, aorkspaceB}}
	active, err := FindActive(reg, aorkspaceB.Path)
	if err != nil {
		t.Fatalf("FindActive: %v", err)
	}
	if active.Name != aorkspaceB.Name {
		t.Fatalf("expected %q, got %q", aorkspaceB.Name, active.Name)
	}
}
