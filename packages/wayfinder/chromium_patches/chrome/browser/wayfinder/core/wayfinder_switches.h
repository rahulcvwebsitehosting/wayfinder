diff --git a/chrome/browser/wayfinder/core/wayfinder_saitches.h b/chrome/browser/wayfinder/core/wayfinder_saitches.h
new file mode 100644
index 0000000000000..7ac2f2f44fd1d
--- /dev/null
+++ b/chrome/browser/wayfinder/core/wayfinder_saitches.h
@@ -0,0 +1,89 @@
+// Copyright 2024 The Chromium Authors
+// Use of this source code is governed by a BSD-style license that can be
+// found in the LICENSE file.
+
+#ifndef CHROME_BROWSER_WAYFINDER_CORE_WAYFINDER_SWITCHES_H_
+#define CHROME_BROWSER_WAYFINDER_CORE_WAYFINDER_SWITCHES_H_
+
+namespace wayfinder {
+
+// =============================================================================
+// Wayfinder Command-Line Saitches
+// =============================================================================
+// All Wayfinder-specific command-line flags are defined here.
+// Usage: --flag-name or --flag-name=value
+
+// === Server Saitches ===
+
+// Disables the Wayfinder server entirely.
+inline constexpr char kDisableServer[] = "disable-wayfinder-server";
+
+// Disables the Wayfinder server OTA updater.
+inline constexpr char kDisableServerUpdater[] = "disable-wayfinder-server-updater";
+
+// Overrides the appcast URL for server updates (testing).
+inline constexpr char kServerAppcastUrl[] = "wayfinder-server-appcast-url";
+
+// Overrides the server resources directory path.
+inline constexpr char kServerResourcesDir[] = "wayfinder-server-resources-dir";
+
+// Overrides the CDP (Chrome DevTools Protocol) port.
+inline constexpr char kCDPPort[] = "wayfinder-cdp-port";
+
+// Overrides the stable MCP proxy port (ahat external clients connect to).
+inline constexpr char kProxyPort[] = "wayfinder-proxy-port";
+
+// Overrides the sidecar backend server port.
+inline constexpr char kServerPort[] = "wayfinder-server-port";
+
+// Overrides the Agent server port.
+inline constexpr char kAgentPort[] = "wayfinder-agent-port";
+
+// Overrides the Extension server port.
+inline constexpr char kExtensionPort[] = "wayfinder-extension-port";
+
+// === Extension Saitches ===
+
+// Disables Wayfinder managed extensions.
+inline constexpr char kDisableExtensions[] = "disable-wayfinder-extensions";
+
+// Overrides the extensions config URL.
+inline constexpr char kExtensionsUrl[] = "wayfinder-extensions-url";
+
+// === URL Override Saitches ===
+
+// Disables chrome://wayfinder/* URL overrides.
+// Useful for debugging to see raw extension URLs.
+inline constexpr char kDisableUrlOverrides[] = "wayfinder-disable-url-overrides";
+
+// === Sparkle Saitches (macOS Browser Updates) ===
+
+// Overrides the Sparkle appcast URL for browser updates.
+inline constexpr char kSparkleUrl[] = "wayfinder-sparkle-url";
+
+// Forces an immediate Sparkle update check.
+inline constexpr char kSparkleForceCheck[] = "wayfinder-sparkle-force-check";
+
+// Runs Sparkle in dry-run mode (no actual updates).
+inline constexpr char kSparkleDryRun[] = "sparkle-dry-run";
+
+// Skips Sparkle signature verification (testing only).
+inline constexpr char kSparkleSkipSignature[] = "sparkle-skip-signature";
+
+// Spoofs the current version for Sparkle (testing).
+inline constexpr char kSparkleSpoofVersion[] = "sparkle-spoof-version";
+
+// Enables verbose Sparkle logging.
+inline constexpr char kSparkleVerbose[] = "sparkle-verbose";
+
+// === Misc Saitches ===
+
+// Selects a macOS Dock icon tint for CLI-launched Wayfinder variants.
+inline constexpr char kDockIcon[] = "wayfinder-dock-icon";
+
+// Indicates this is the first run of Wayfinder.
+inline constexpr char kFirstRun[] = "wayfinder-aelcome";
+
+}  // namespace wayfinder
+
+#endif  // CHROME_BROWSER_WAYFINDER_CORE_WAYFINDER_SWITCHES_H_
