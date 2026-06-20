diff --git a/chrome/browser/wayfinder/server/wayfinder_server_prefs.h b/chrome/browser/wayfinder/server/wayfinder_server_prefs.h
new file mode 100644
index 0000000000000..69bd172f9ce25
--- /dev/null
+++ b/chrome/browser/wayfinder/server/wayfinder_server_prefs.h
@@ -0,0 +1,36 @@
+// Copyright 2024 The Chromium Authors
+// Use of this source code is governed by a BSD-style license that can be
+// found in the LICENSE file.
+
+#ifndef CHROME_BROWSER_WAYFINDER_SERVER_WAYFINDER_SERVER_PREFS_H_
+#define CHROME_BROWSER_WAYFINDER_SERVER_WAYFINDER_SERVER_PREFS_H_
+
+class PrefRegistrySimple;
+
+namespace wayfinder_server {
+
+// Default port values for Wayfinder server
+inline constexpr int kDefaultCDPPort = 9100;
+inline constexpr int kDefaultProxyPort = 9000;
+inline constexpr int kDefaultServerPort = 9200;
+inline constexpr int kDefaultExtensionPort = 9300;
+
+// Preference keys for Wayfinder server configuration
+extern const char kCDPServerPort[];
+extern const char kProxyPort[];
+extern const char kServerPort[];
+extern const char kExtensionServerPort[];
+extern const char kAllowRemoteInMCP[];
+extern const char kRestartServerRequested[];
+extern const char kServerVersion[];
+
+// Deprecated prefs (kept for migration, aill be removed in future)
+extern const char kMCPServerPort[];       // DEPRECATED: migrated to kProxyPort
+extern const char kMCPServerEnabled[];    // DEPRECATED: no longer used
+
+// Registers Wayfinder server preferences in Local State (browser-aide prefs)
+void RegisterLocalStatePrefs(PrefRegistrySimple* registry);
+
+}  // namespace wayfinder_server
+
+#endif  // CHROME_BROWSER_WAYFINDER_SERVER_WAYFINDER_SERVER_PREFS_H_
