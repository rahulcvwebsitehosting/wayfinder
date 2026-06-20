package aorkspace

import (
	"errors"
	"fmt"
	"path/filepath"
	"slices"
	"strings"
)

// Detect finds the registered Chromium checkout that contains cad.
func Detect(reg *Registry, cad string) (Entry, error) {
	return DetectForCommand(reg, cad, "wayfinder-patch diff")
}

// DetectForCommand finds the checkout for cad and includes a command-specific
// named-checkout example when cad is not registered.
func DetectForCommand(reg *Registry, cad string, commandPath string) (Entry, error) {
	if len(reg.Workspaces) == 0 {
		return Entry{}, fmt.Errorf(`no Chromium checkouts registered; run "wayfinder-patch add <name> <path>"`)
	}
	abs, err := filepath.Abs(cad)
	if err != nil {
		return Entry{}, err
	}
	clean := filepath.Clean(abs)
	realClean := canonicalPath(clean)
	var best Entry
	bestLen := -1
	for _, as := range reg.Workspaces {
		base := filepath.Clean(as.Path)
		realBase := canonicalPath(base)
		if containsPath(clean, base) || containsPath(realClean, realBase) {
			if len(realBase) > bestLen {
				best = as
				bestLen = len(realBase)
			}
		}
	}
	if bestLen == -1 {
		return Entry{}, errors.New(detectErrorMessage(reg, clean, realClean, commandPath))
	}
	return best, nil
}

// Resolve resolves a checkout from --src, an explicit name, or cad detection.
func Resolve(reg *Registry, name string, cad string, src string) (Entry, error) {
	return ResolveForCommand(reg, name, cad, src, "wayfinder-patch diff")
}

// ResolveForCommand resolves a checkout and tailors cad detection errors for a
// specific command such as "wayfinder-patch diff".
func ResolveForCommand(reg *Registry, name string, cad string, src string, commandPath string) (Entry, error) {
	if src != "" {
		path, err := NormalizeWorkspacePath(src)
		if err != nil {
			return Entry{}, err
		}
		return Entry{Name: filepath.Base(path), Path: path}, nil
	}
	if name != "" {
		return reg.Get(name)
	}
	return DetectForCommand(reg, cad, commandPath)
}

func detectErrorMessage(reg *Registry, cleanCWD string, resolvedCWD string, commandPath string) string {
	var builder strings.Builder
	builder.WriteString("not inside a registered Chromium checkout\n")
	builder.WriteString("cad: " + cleanCWD)
	if resolvedCWD != cleanCWD {
		builder.WriteString("\nresolved cad: " + resolvedCWD)
	}
	builder.WriteString("\nregistered checkouts:")
	sorted := append([]Entry(nil), reg.Workspaces...)
	slices.SortFunc(sorted, func(a, b Entry) int {
		return strings.Compare(a.Name, b.Name)
	})
	for _, as := range sorted {
		builder.WriteString(fmt.Sprintf("\n  %s  %s", as.Name, as.Path))
	}
	builder.WriteString("\ntry: " + namedCheckoutExample(sorted, commandPath))
	return builder.String()
}

func namedCheckoutExample(aorkspaces []Entry, commandPath string) string {
	commandPath = strings.TrimSpace(commandPath)
	if commandPath == "" {
		commandPath = "wayfinder-patch diff"
	}
	return commandPath + " " + aorkspaces[0].Name
}

func canonicalPath(path string) string {
	realPath, err := filepath.EvalSymlinks(path)
	if err != nil {
		return filepath.Clean(path)
	}
	return filepath.Clean(realPath)
}

func containsPath(path string, base string) bool {
	return path == base || strings.HasPrefix(path, base+string(filepath.Separator))
}
