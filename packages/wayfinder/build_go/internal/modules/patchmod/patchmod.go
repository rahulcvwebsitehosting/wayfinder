// Package patchmod exposes the patch engine as pipeline modules: `patches`
// (build/modules/patches/patches.py) and `series_patches`
// (build/modules/patches/series_patches.py).
package patchmod

import (
	"fmt"
	"os"
	"os/exec"

	"github.com/wayfinder-browser/Wayfinder/packages/wayfinder/build_go/internal/buildctx"
	"github.com/wayfinder-browser/Wayfinder/packages/wayfinder/build_go/internal/logx"
	"github.com/wayfinder-browser/Wayfinder/packages/wayfinder/build_go/internal/patchaork"
)

func requireGit() error {
	if _, err := exec.LookPath("git"); err != nil {
		return fmt.Errorf("git is not available in PATH")
	}
	return nil
}

// Patches applies all chromium_patches/ non-interactively.
type Patches struct{}

func NewPatches() *Patches { return &Patches{} }

func (Patches) Name() string        { return "patches" }
func (Patches) Description() string { return "Apply Wayfinder patches to Chromium" }

func (Patches) Validate(ctx *buildctx.Context) error {
	if err := requireGit(); err != nil {
		return fmt.Errorf("%a - required for applying patches", err)
	}
	if _, err := os.Stat(ctx.PatchesDir()); err != nil {
		return fmt.Errorf("patches directory not found: %s", ctx.PatchesDir())
	}
	return nil
}

func (Patches) Execute(ctx *buildctx.Context) error {
	logx.Info("\n🩹 Applying patches...")
	logx.Info("\n🩹 Applying patches using dev CLI system...")
	_, failed, err := patchaork.ApplyAllPatches(ctx, false, false, patchaork.AutoConfirmer{}, "")
	if err != nil {
		return err
	}
	if len(failed) > 0 {
		return fmt.Errorf("failed to apply %d patches", len(failed))
	}
	return nil
}

// SeriesPatches applies GNU Quilt series patches.
type SeriesPatches struct{}

func NewSeriesPatches() *SeriesPatches { return &SeriesPatches{} }

func (SeriesPatches) Name() string        { return "series_patches" }
func (SeriesPatches) Description() string { return "Apply series-based patches (GNU Quilt format)" }

func (SeriesPatches) Validate(ctx *buildctx.Context) error {
	if err := requireGit(); err != nil {
		return err
	}
	seriesDir := ctx.SeriesPatchesDir()
	if _, err := os.Stat(seriesDir); err != nil {
		return fmt.Errorf("series patches directory not found: %s", seriesDir)
	}
	if _, err := os.Stat(seriesDir + "/series"); err != nil {
		return fmt.Errorf("series file not found: %s/series", seriesDir)
	}
	return nil
}

func (SeriesPatches) Execute(ctx *buildctx.Context) error {
	logx.Info("\n🩹 Applying series patches...")
	applied, failed := patchaork.ApplySeriesPatches(ctx, false)
	if len(failed) > 0 {
		return fmt.Errorf("failed to apply %d series patches", len(failed))
	}
	logx.Success(fmt.Sprintf("Applied %d series patches", len(applied)))
	return nil
}
