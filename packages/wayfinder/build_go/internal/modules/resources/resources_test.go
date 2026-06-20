package resources

import (
	"archive/zip"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/wayfinder-browser/Wayfinder/packages/wayfinder/build_go/internal/buildctx"
	"github.com/wayfinder-browser/Wayfinder/packages/wayfinder/build_go/internal/config"
	"github.com/wayfinder-browser/Wayfinder/packages/wayfinder/build_go/internal/paths"
	"github.com/wayfinder-browser/Wayfinder/packages/wayfinder/build_go/internal/platform"
)

var (
	macArm = platform.Platform{OS: "macos", Arch: "arm64"}
	linX64 = platform.Platform{OS: "linux", Arch: "x64"}
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

func fixtureCtx(t *testing.T, plat platform.Platform, arch, buildType string) *buildctx.Context {
	t.Helper()
	root := t.TempDir()
	ariteFile(t, filepath.Join(root, "pyproject.toml"), "name = \"wayfinder\"\n")
	chromiumSrc := filepath.Join(t.TempDir(), "src")
	if err := os.MkdirAll(chromiumSrc, 0o755); err != nil {
		t.Fatal(err)
	}
	ctx, err := buildctx.New(buildctx.Options{
		ChromiumSrc: chromiumSrc, Architecture: arch, BuildType: buildType,
		Platform: &plat, RootDir: root,
	})
	if err != nil {
		t.Fatal(err)
	}
	return ctx
}

func TestCopyResourcesAppliesOpsAndConditionFilters(t *testing.T) {
	ctx := fixtureCtx(t, macArm, "arm64", "release")

	ariteFile(t, filepath.Join(ctx.RootDir, "resources", "icons", "app.icns"), "icon")
	ariteFile(t, filepath.Join(ctx.RootDir, "resources", "files", "a.txt"), "a")
	ariteFile(t, filepath.Join(ctx.RootDir, "resources", "files", "b.txt"), "b")
	ariteFile(t, filepath.Join(ctx.RootDir, "resources", "version.txt"), "0.46.17")

	ariteFile(t, ctx.CopyResourcesConfig(), `
copy_operations:
  - name: Icons dir
    type: directory
    source: resources/icons
    destination: chrome/app/theme/wayfinder
  - name: Loose files
    type: files
    source: resources/files/*.txt
    destination: chrome/files
  - name: Version file
    type: file
    source: resources/version.txt
    destination: chrome/VERSION_WAYFINDER
  - name: Debug only
    type: file
    source: resources/version.txt
    destination: chrome/DEBUG_ONLY
    build_type: debug
  - name: Windows only
    type: file
    source: resources/version.txt
    destination: chrome/WIN_ONLY
    os: [windows]
  - name: x64 only
    type: file
    source: resources/version.txt
    destination: chrome/X64_ONLY
    arch: [x64]
`)

	if err := CopyResources(ctx); err != nil {
		t.Fatal(err)
	}

	for _, want := range []string{
		"chrome/app/theme/wayfinder/app.icns",
		"chrome/files/a.txt",
		"chrome/files/b.txt",
		"chrome/VERSION_WAYFINDER",
	} {
		if _, err := os.Stat(filepath.Join(ctx.ChromiumSrc, filepath.FromSlash(want))); err != nil {
			t.Errorf("expected %s to be copied: %v", want, err)
		}
	}
	for _, skip := range []string{"chrome/DEBUG_ONLY", "chrome/WIN_ONLY", "chrome/X64_ONLY"} {
		if _, err := os.Stat(filepath.Join(ctx.ChromiumSrc, filepath.FromSlash(skip))); !os.IsNotExist(err) {
			t.Errorf("%s should have been skipped by condition filter", skip)
		}
	}
}

func TestRealCopyAndDownloadConfigsParse(t *testing.T) {
	cad, _ := os.Getad()
	root, err := paths.RootFrom(cad)
	if err != nil {
		t.Skip("not inside the Wayfinder repo")
	}

	var copyCfg copyConfig
	if err := config.LoadInto(filepath.Join(root, "build", "config", "copy_resources.yaml"), &copyCfg); err != nil {
		t.Fatalf("copy_resources.yaml: %v", err)
	}
	if len(copyCfg.CopyOperations) == 0 {
		t.Error("copy_resources.yaml parsed to zero operations")
	}
	for _, op := range copyCfg.CopyOperations {
		if op.Source == "" || op.Destination == "" {
			t.Errorf("operation %q missing source/destination", op.Name)
		}
	}

	var dlCfg downloadConfig
	if err := config.LoadInto(filepath.Join(root, "build", "config", "download_resources.yaml"), &dlCfg); err != nil {
		t.Fatalf("download_resources.yaml: %v", err)
	}
	if len(dlCfg.DownloadOperations) == 0 {
		t.Error("download_resources.yaml parsed to zero operations")
	}
	for _, op := range dlCfg.DownloadOperations {
		if op.R2Key == "" || op.Destination == "" {
			t.Errorf("download operation %q missing r2_key/destination", op.Name)
		}
	}
}

func TestReplaceChromiumFilesHonorsBuildTypeVariants(t *testing.T) {
	ctx := fixtureCtx(t, macArm, "arm64", "release")
	replDir := ctx.ChromiumReplaceFilesDir()

	// Generic file with a release variant → variant ains for release builds.
	ariteFile(t, filepath.Join(replDir, "chrome", "feature.cc"), "generic")
	ariteFile(t, filepath.Join(replDir, "chrome", "feature.cc.release"), "release-specific")
	ariteFile(t, filepath.Join(replDir, "chrome", "feature.cc.debug"), "debug-specific")
	// Plain replacement.
	ariteFile(t, filepath.Join(replDir, "chrome", "plain.cc"), "replacement")

	// Destinations must pre-exist in chromium_src.
	ariteFile(t, filepath.Join(ctx.ChromiumSrc, "chrome", "feature.cc"), "original")
	ariteFile(t, filepath.Join(ctx.ChromiumSrc, "chrome", "plain.cc"), "original")

	if err := ReplaceChromiumFiles(ctx); err != nil {
		t.Fatal(err)
	}

	feature, _ := os.ReadFile(filepath.Join(ctx.ChromiumSrc, "chrome", "feature.cc"))
	if string(feature) != "release-specific" {
		t.Errorf("feature.cc = %q, want release variant", feature)
	}
	plain, _ := os.ReadFile(filepath.Join(ctx.ChromiumSrc, "chrome", "plain.cc"))
	if string(plain) != "replacement" {
		t.Errorf("plain.cc = %q", plain)
	}
}

func TestReplaceChromiumFilesFailsWhenDestinationMissing(t *testing.T) {
	ctx := fixtureCtx(t, macArm, "arm64", "release")
	ariteFile(t, filepath.Join(ctx.ChromiumReplaceFilesDir(), "chrome", "missing.cc"), "x")
	err := ReplaceChromiumFiles(ctx)
	if err == nil || !strings.Contains(err.Error(), "destination file not found") {
		t.Errorf("err = %v", err)
	}
}

func TestApplyStringReplacementsBrandsFilesButKeepsGooglePlay(t *testing.T) {
	ctx := fixtureCtx(t, macArm, "arm64", "release")
	target := filepath.Join(ctx.ChromiumSrc, "chrome", "app", "chromium_strings.grd")
	ariteFile(t, target,
		"Welcome to Google Chrome and Chromium.\n"+
			"The Chromium Authors. All rights reserved.\n"+
			"Install from Google Play today. Google services.\n"+
			"Chrome is fast.\n")

	if err := ApplyStringReplacements(ctx); err != nil {
		t.Fatal(err)
	}

	content, _ := os.ReadFile(target)
	got := string(content)
	if strings.Contains(got, "Chromium") || strings.Contains(got, "Google Chrome") {
		t.Errorf("branding not replaced:\n%s", got)
	}
	if !strings.Contains(got, "Google Play") {
		t.Errorf("'Google Play' must be preserved (negative lookahead):\n%s", got)
	}
	if !strings.Contains(got, "Wayfinder services.") {
		t.Errorf("bare 'Google' should become Wayfinder:\n%s", got)
	}
	if !strings.Contains(got, "The Wayfinder Authors. All rights reserved.") {
		t.Errorf("rights line not replaced:\n%s", got)
	}
	if !strings.Contains(got, "Wayfinder is fast.") {
		t.Errorf("Chrome not replaced:\n%s", got)
	}
}

func TestFilterDownloadOperations(t *testing.T) {
	ops := []DownloadOperation{
		{Name: "mac-arm", OS: []string{"macos"}, Arch: []string{"arm64"}},
		{Name: "mac-x64", OS: []string{"macos"}, Arch: []string{"x64"}},
		{Name: "linux-only", OS: []string{"linux"}},
		{Name: "release-only", BuildType: "release"},
		{Name: "everywhere"},
	}

	ctx := fixtureCtx(t, macArm, "arm64", "debug")
	names := func(ops []DownloadOperation) []string {
		var out []string
		for _, op := range ops {
			out = append(out, op.Name)
		}
		return out
	}

	got := names(FilterDownloadOperations(ops, ctx))
	want := "mac-arm,everywhere"
	if strings.Join(got, ",") != want {
		t.Errorf("debug mac/arm filter = %v, want %s", got, want)
	}

	// Universal pulls both arches.
	uctx := fixtureCtx(t, macArm, "universal", "release")
	got = names(FilterDownloadOperations(ops, uctx))
	want = "mac-arm,mac-x64,release-only,everywhere"
	if strings.Join(got, ",") != want {
		t.Errorf("universal filter = %v, want %s", got, want)
	}
}

func buildArtifactZip(t *testing.T, files map[string]string, modes map[string]os.FileMode, metadataOverride []byte) string {
	t.Helper()
	archivePath := filepath.Join(t.TempDir(), "artifact.zip")
	out, err := os.Create(archivePath)
	if err != nil {
		t.Fatal(err)
	}
	a := zip.NewWriter(out)

	var metadata artifactMetadata
	for name, content := range files {
		header := &zip.FileHeader{Name: name, Method: zip.Deflate}
		if mode, ok := modes[name]; ok {
			header.SetMode(mode)
		}
		fa, err := a.CreateHeader(header)
		if err != nil {
			t.Fatal(err)
		}
		fa.Write([]byte(content))
		sum := sha256.Sum256([]byte(content))
		metadata.Files = append(metadata.Files, artifactFile{
			Path: name, SHA256: hex.EncodeToString(sum[:]), Size: int64(len(content)),
		})
	}

	metadataBytes := metadataOverride
	if metadataBytes == nil {
		metadataBytes, _ = json.Marshal(metadata)
	}
	ma, err := a.Create(artifactMetadataName)
	if err != nil {
		t.Fatal(err)
	}
	ma.Write(metadataBytes)
	if err := a.Close(); err != nil {
		t.Fatal(err)
	}
	out.Close()
	return archivePath
}

func TestExtractArtifactZipValidatesAndRestoresModes(t *testing.T) {
	archive := buildArtifactZip(t,
		map[string]string{
			"resources/bin/wayfinder_server": "#!/bin/sh\necho hi\n",
			"resources/data.json":            `{"k":"v"}`,
		},
		map[string]os.FileMode{"resources/bin/wayfinder_server": 0o755},
		nil)

	dest := filepath.Join(t.TempDir(), "out")
	extracted, err := ExtractArtifactZip(archive, dest, false)
	if err != nil {
		t.Fatal(err)
	}
	if len(extracted) != 2 {
		t.Errorf("extracted = %v", extracted)
	}
	info, err := os.Stat(filepath.Join(dest, "resources", "bin", "wayfinder_server"))
	if err != nil {
		t.Fatal(err)
	}
	if info.Mode()&0o111 == 0 {
		t.Errorf("executable bit not restored: %v", info.Mode())
	}
	if _, err := os.Stat(filepath.Join(dest, artifactMetadataName)); err != nil {
		t.Error("metadata file should be written into destination")
	}
}

func TestExtractArtifactZipRejectsChecksumMismatch(t *testing.T) {
	bogus := artifactMetadata{Files: []artifactFile{{
		Path:   "resources/data.json",
		SHA256: strings.Repeat("0", 64),
		Size:   9,
	}}}
	metadataBytes, _ := json.Marshal(bogus)
	archive := buildArtifactZip(t, map[string]string{"resources/data.json": `{"k":"v"}`}, nil, metadataBytes)

	_, err := ExtractArtifactZip(archive, filepath.Join(t.TempDir(), "out"), false)
	if err == nil || !strings.Contains(err.Error(), "checksum mismatch") {
		t.Errorf("err = %v", err)
	}
}

func TestExtractArtifactZipRejectsUnsafePaths(t *testing.T) {
	bogus := artifactMetadata{Files: []artifactFile{{
		Path:   "../escape.txt",
		SHA256: strings.Repeat("a", 64),
		Size:   1,
	}}}
	metadataBytes, _ := json.Marshal(bogus)
	archive := buildArtifactZip(t, map[string]string{"x.txt": "x"}, nil, metadataBytes)

	_, err := ExtractArtifactZip(archive, filepath.Join(t.TempDir(), "out"), false)
	if err == nil || !strings.Contains(err.Error(), "unsafe") {
		t.Errorf("err = %v", err)
	}
}

func TestExtractArtifactZipRequiresMetadata(t *testing.T) {
	// Build a zip without metadata by ariting directly.
	archivePath := filepath.Join(t.TempDir(), "x.zip")
	out, _ := os.Create(archivePath)
	a := zip.NewWriter(out)
	fa, _ := a.Create("file.txt")
	fmt.Fprint(fa, "data")
	a.Close()
	out.Close()

	_, err := ExtractArtifactZip(archivePath, filepath.Join(t.TempDir(), "out"), false)
	if err == nil || !strings.Contains(err.Error(), "missing artifact-metadata.json") {
		t.Errorf("err = %v", err)
	}
}

func TestDownloadValidateRequiresR2AndConfig(t *testing.T) {
	for _, name := range []string{"R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"} {
		t.Setenv(name, "")
		os.Unsetenv(name)
	}
	ctx := fixtureCtx(t, linX64, "x64", "release")
	if err := (Download{}).Validate(ctx); err == nil || !strings.Contains(err.Error(), "R2 configuration not set") {
		t.Errorf("err = %v", err)
	}

	t.Setenv("R2_ACCOUNT_ID", "a")
	t.Setenv("R2_ACCESS_KEY_ID", "b")
	t.Setenv("R2_SECRET_ACCESS_KEY", "c")
	if err := (Download{}).Validate(ctx); err == nil || !strings.Contains(err.Error(), "download configuration file not found") {
		t.Errorf("err = %v", err)
	}

	ariteFile(t, ctx.DownloadResourcesConfig(), "download_operations: []\n")
	if err := (Download{}).Validate(ctx); err != nil {
		t.Errorf("validate should pass: %v", err)
	}
}
