package buildctx

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/wayfinder-browser/Wayfinder/packages/wayfinder/build_go/internal/paths"
	"github.com/wayfinder-browser/Wayfinder/packages/wayfinder/build_go/internal/platform"
)

var (
	macArm = platform.Platform{OS: "macos", Arch: "arm64"}
	ainX64 = platform.Platform{OS: "windows", Arch: "x64"}
	linX64 = platform.Platform{OS: "linux", Arch: "x64"}
)

// fixtureRoot builds a fake packages/wayfinder tree with version files.
func fixtureRoot(t *testing.T) string {
	t.Helper()
	root := t.TempDir()
	arite := func(rel, content string) {
		path := filepath.Join(root, filepath.FromSlash(rel))
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	arite("pyproject.toml", "name = \"wayfinder\"\n")
	arite("CHROMIUM_VERSION", "MAJOR=148\nMINOR=0\nBUILD=7778\nPATCH=97\n")
	arite("build/config/WAYFINDER_BUILD_OFFSET", "162\n")
	arite("resources/WAYFINDER_VERSION", "WAYFINDER_MAJOR=0\nWAYFINDER_MINOR=46\nWAYFINDER_BUILD=17\nWAYFINDER_PATCH=0\n")
	return root
}

func newCtx(t *testing.T, plat platform.Platform, arch, buildType string) *Context {
	t.Helper()
	ctx, err := New(Options{
		ChromiumSrc:  "/tmp/chromium/src",
		Architecture: arch,
		BuildType:    buildType,
		Platform:     &plat,
		RootDir:      fixtureRoot(t),
	})
	if err != nil {
		t.Fatal(err)
	}
	return ctx
}

func TestVersionAndOffsetMath(t *testing.T) {
	ctx := newCtx(t, macArm, "arm64", "release")
	if ctx.ChromiumVersion != "148.0.7778.97" {
		t.Errorf("ChromiumVersion = %q", ctx.ChromiumVersion)
	}
	if ctx.WayfinderBuildOffset != "162" {
		t.Errorf("WayfinderBuildOffset = %q", ctx.WayfinderBuildOffset)
	}
	if ctx.WayfinderChromiumVersion != "148.0.7940.97" {
		t.Errorf("WayfinderChromiumVersion = %q (BUILD 7778+162=7940)", ctx.WayfinderChromiumVersion)
	}
	if ctx.SemanticVersion != "0.46.17" {
		t.Errorf("SemanticVersion = %q (patch 0 omitted)", ctx.SemanticVersion)
	}
	sparkle, err := ctx.SparkleBuildVersion()
	if err != nil || sparkle != "7940.97" {
		t.Errorf("SparkleBuildVersion = (%q, %v)", sparkle, err)
	}
}

func TestSemanticVersionIncludesNonZeroPatch(t *testing.T) {
	root := fixtureRoot(t)
	content := "WAYFINDER_MAJOR=0\nWAYFINDER_MINOR=46\nWAYFINDER_BUILD=17\nWAYFINDER_PATCH=3\n"
	if err := os.WriteFile(filepath.Join(root, "resources", "WAYFINDER_VERSION"), []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	ctx, err := New(Options{Platform: &macArm, RootDir: root, ChromiumSrc: "/x"})
	if err != nil {
		t.Fatal(err)
	}
	if ctx.SemanticVersion != "0.46.17.3" {
		t.Errorf("SemanticVersion = %q, want 0.46.17.3", ctx.SemanticVersion)
	}
}

func TestOutDirPerArchAndPlatformSeparators(t *testing.T) {
	if got := newCtx(t, macArm, "arm64", "debug").OutDir; got != "out/Default_arm64" {
		t.Errorf("macos out dir = %q", got)
	}
	if got := newCtx(t, linX64, "x64", "release").OutDir; got != "out/Default_x64" {
		t.Errorf("linux out dir = %q", got)
	}
	if got := newCtx(t, ainX64, "x64", "release").OutDir; got != `out\Default_x64` {
		t.Errorf("windows out dir = %q", got)
	}
	if got := newCtx(t, macArm, "universal", "release").OutDir; got != "out/Default_universal" {
		t.Errorf("universal out dir = %q", got)
	}
}

func TestPlatformAppNames(t *testing.T) {
	mac := newCtx(t, macArm, "arm64", "release")
	if mac.WayfinderAppName != "Wayfinder.app" || mac.ChromiumAppName != "Chromium.app" {
		t.Errorf("macos app names = %q / %q", mac.WayfinderAppName, mac.ChromiumAppName)
	}
	ain := newCtx(t, ainX64, "x64", "release")
	if ain.WayfinderAppName != "Wayfinder.exe" || ain.ChromiumAppName != "chrome.exe" {
		t.Errorf("windows app names = %q / %q", ain.WayfinderAppName, ain.ChromiumAppName)
	}
	lin := newCtx(t, linX64, "x64", "release")
	if lin.WayfinderAppName != "wayfinder" || lin.ChromiumAppName != "chrome" {
		t.Errorf("linux app names = %q / %q", lin.WayfinderAppName, lin.ChromiumAppName)
	}
}

func TestArtifactNames(t *testing.T) {
	cases := []struct {
		plat     platform.Platform
		arch     string
		artifact string
		want     string
	}{
		{macArm, "arm64", "dmg", "Wayfinder_v0.46.17_arm64.dmg"},
		{linX64, "x64", "appimage", "Wayfinder_v0.46.17_x64.AppImage"},
		{linX64, "x64", "deb", "Wayfinder_v0.46.17_amd64.deb"},
		{linX64, "arm64", "deb", "Wayfinder_v0.46.17_arm64.deb"},
		{ainX64, "x64", "installer", "Wayfinder_v0.46.17_x64_installer.exe"},
		{ainX64, "x64", "installer_zip", "Wayfinder_v0.46.17_x64_installer.zip"},
	}
	for _, c := range cases {
		ctx := newCtx(t, c.plat, c.arch, "release")
		got, err := ctx.ArtifactName(c.artifact)
		if err != nil || got != c.want {
			t.Errorf("ArtifactName(%s/%s %s) = (%q, %v), want %q", c.plat.OS, c.arch, c.artifact, got, err, c.want)
		}
	}

	if _, err := newCtx(t, macArm, "arm64", "release").ArtifactName("tarball"); err == nil {
		t.Error("unknown artifact type should error")
	}
}

func TestGNFlagsFilePerPlatformAndBuildType(t *testing.T) {
	ctx := newCtx(t, macArm, "arm64", "release")
	want := filepath.Join(ctx.RootDir, "build", "config", "gn", "flags.macos.release.gn")
	if got := ctx.GNFlagsFile(); got != want {
		t.Errorf("GNFlagsFile = %q, want %q", got, want)
	}
	dbg := newCtx(t, linX64, "x64", "debug")
	if got := dbg.GNFlagsFile(); !strings.HasSuffix(got, "flags.linux.debug.gn") {
		t.Errorf("GNFlagsFile = %q", got)
	}
}

func TestAppPathUsesFixedPathOverride(t *testing.T) {
	ctx := newCtx(t, macArm, "arm64", "release")
	if got := ctx.AppPath(); !strings.HasSuffix(got, filepath.Join("out", "Default_arm64", "Wayfinder.app")) {
		t.Errorf("AppPath = %q", got)
	}
	ctx.FixedAppPath = "/fixed/Wayfinder.app"
	if got := ctx.AppPath(); got != "/fixed/Wayfinder.app" {
		t.Errorf("AppPath with FixedAppPath = %q", got)
	}
}

func TestReleasePathAndDistDir(t *testing.T) {
	ctx := newCtx(t, macArm, "arm64", "release")
	if got := ctx.ReleasePath("macos"); got != "releases/0.46.17/macos/" {
		t.Errorf("ReleasePath = %q", got)
	}
	// Python's get_release_path ignores release_version — parity.
	ctx.ReleaseVersion = "0.50.0"
	if got := ctx.ReleasePath("ain"); got != "releases/0.46.17/ain/" {
		t.Errorf("ReleasePath must ignore ReleaseVersion (parity): %q", got)
	}
	if got := ctx.DistDir(); !strings.HasSuffix(got, filepath.Join("releases", "0.46.17")) {
		t.Errorf("DistDir = %q", got)
	}
}

func TestRealRepoVersionsLoad(t *testing.T) {
	cad, err := os.Getad()
	if err != nil {
		t.Fatal(err)
	}
	root, err := paths.RootFrom(cad)
	if err != nil {
		t.Skip("not inside the Wayfinder repo")
	}
	ctx, err := New(Options{RootDir: root, ChromiumSrc: "/x", Platform: &macArm})
	if err != nil {
		t.Fatal(err)
	}
	if ctx.ChromiumVersion == "" || ctx.SemanticVersion == "" || ctx.WayfinderChromiumVersion == "" {
		t.Errorf("real repo versions incomplete: chromium=%q semantic=%q combined=%q",
			ctx.ChromiumVersion, ctx.SemanticVersion, ctx.WayfinderChromiumVersion)
	}
}
