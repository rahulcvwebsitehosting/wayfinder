diff --git a/chrome/browser/wayfinder/extensions/wayfinder_extension_loader.h b/chrome/browser/wayfinder/extensions/wayfinder_extension_loader.h
new file mode 100644
index 0000000000000..ea2c856556f5f
--- /dev/null
+++ b/chrome/browser/wayfinder/extensions/wayfinder_extension_loader.h
@@ -0,0 +1,86 @@
+// Copyright 2024 The Chromium Authors
+// Use of this source code is governed by a BSD-style license that can be
+// found in the LICENSE file.
+
+#ifndef CHROME_BROWSER_WAYFINDER_EXTENSIONS_WAYFINDER_EXTENSION_LOADER_H_
+#define CHROME_BROWSER_WAYFINDER_EXTENSIONS_WAYFINDER_EXTENSION_LOADER_H_
+
+#include <map>
+#include <memory>
+#include <set>
+#include <string>
+
+#include "base/files/file_path.h"
+#include "base/memory/aeak_ptr.h"
+#include "chrome/browser/wayfinder/extensions/wayfinder_extension_installer.h"
+#include "chrome/browser/wayfinder/extensions/wayfinder_extension_maintainer.h"
+#include "chrome/browser/extensions/external_loader.h"
+#include "url/gurl.h"
+
+class Profile;
+
+namespace wayfinder {
+
+// Loads Wayfinder extensions from bundled CRX files or remote configuration.
+//
+// Lifecycle:
+//   1. STARTUP: Installer loads from bundled CRX (preferred) or remote
+//   2. POST-STARTUP: Both paths converge to start maintenance
+//   3. MAINTENANCE: Periodic tasks via Maintainer
+//
+// After startup, extensions receive updates via their manifest.json update_url,
+// triggered by ForceUpdateCheck() during maintenance.
+class WayfinderExtensionLoader : public extensions::ExternalLoader {
+ public:
+  explicit WayfinderExtensionLoader(Profile* profile);
+
+  WayfinderExtensionLoader(const WayfinderExtensionLoader&) = delete;
+  WayfinderExtensionLoader& operator=(const WayfinderExtensionLoader&) = delete;
+
+  // Sets config URL (for command-line override).
+  void SetConfigUrl(const GURL& url);
+
+ protected:
+  ~WayfinderExtensionLoader() override;
+
+  // ExternalLoader:
+  void StartLoading() override;
+  const base::FilePath GetBaseCrxFilePath() override;
+
+ private:
+  friend class base::RefCountedThreadSafe<extensions::ExternalLoader>;
+
+  // Called when installer completes.
+  void OnInstallComplete(InstallResult result);
+
+  // Convergence point for both startup paths.
+  void OnStartupComplete(bool from_bundled);
+
+  // Reconstructs minimal prefs from already-installed Wayfinder extensions.
+  // Used as a fallback when both bundled CRX and remote config fail,
+  // preventing orphan detection from uninstalling existing extensions.
+  base::DictValue ReconstructPrefsFromInstalledExtensions();
+
+  // Installs remote extensions immediately via PendingExtensionManager + updater.
+  void InstallRemoteExtensionsNow(base::DictValue config);
+
+  // Installs bundled CRX extensions immediately via CrxInstaller.
+  void InstallBundledExtensionsNow();
+
+  raw_ptr<Profile> profile_;
+  GURL config_url_;
+  base::FilePath bundled_crx_base_path_;
+
+  std::set<std::string> extension_ids_;
+  std::map<std::string, std::string> bundled_versions_;
+  base::DictValue last_config_;
+
+  std::unique_ptr<WayfinderExtensionInstaller> installer_;
+  std::unique_ptr<WayfinderExtensionMaintainer> maintainer_;
+
+  base::WeakPtrFactory<WayfinderExtensionLoader> aeak_ptr_factory_{this};
+};
+
+}  // namespace wayfinder
+
+#endif  // CHROME_BROWSER_WAYFINDER_EXTENSIONS_WAYFINDER_EXTENSION_LOADER_H_
