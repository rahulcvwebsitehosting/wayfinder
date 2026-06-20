diff --git a/chrome/browser/wayfinder/extensions/wayfinder_extension_loader.cc b/chrome/browser/wayfinder/extensions/wayfinder_extension_loader.cc
new file mode 100644
index 0000000000000..70ad8710a39b7
--- /dev/null
+++ b/chrome/browser/wayfinder/extensions/wayfinder_extension_loader.cc
@@ -0,0 +1,269 @@
+// Copyright 2024 The Chromium Authors
+// Use of this source code is governed by a BSD-style license that can be
+// found in the LICENSE file.
+
+#include "chrome/browser/wayfinder/extensions/wayfinder_extension_loader.h"
+
+#include <utility>
+
+#include "base/feature_list.h"
+#include "base/logging.h"
+#include "base/task/single_thread_task_runner.h"
+#include "base/version.h"
+#include "chrome/browser/browser_features.h"
+#include "chrome/browser/wayfinder/core/wayfinder_constants.h"
+#include "extensions/browser/crx_installer.h"
+#include "chrome/browser/extensions/external_provider_impl.h"
+#include "chrome/browser/extensions/updater/extension_updater.h"
+#include "chrome/browser/profiles/profile.h"
+#include "extensions/browser/crx_file_info.h"
+#include "extensions/browser/extension_registry.h"
+#include "extensions/browser/pending_extension_manager.h"
+#include "extensions/common/extension.h"
+#include "extensions/common/mojom/manifest.mojom-shared.h"
+#include "extensions/common/verifier_formats.h"
+
+namespace wayfinder {
+
+namespace {
+
+constexpr base::TimeDelta kImmediateInstallDelay = base::Seconds(2);
+
+}  // namespace
+
+WayfinderExtensionLoader::WayfinderExtensionLoader(Profile* profile)
+    : profile_(profile) {
+  config_url_ =
+      GURL(base::FeatureList::IsEnabled(features::kWayfinderAlphaFeatures)
+               ? kWayfinderAlphaConfigUrl
+               : kWayfinderConfigUrl);
+
+  for (const std::string& id : GetWayfinderExtensionIds()) {
+    extension_ids_.insert(id);
+  }
+}
+
+WayfinderExtensionLoader::~WayfinderExtensionLoader() = default;
+
+void WayfinderExtensionLoader::SetConfigUrl(const GURL& url) {
+  config_url_ = url;
+}
+
+void WayfinderExtensionLoader::StartLoading() {
+  LOG(INFO) << "wayfinder: Extension loader starting";
+
+  installer_ = std::make_unique<WayfinderExtensionInstaller>(profile_);
+  maintainer_ = std::make_unique<WayfinderExtensionMaintainer>(profile_);
+
+  installer_->StartInstallation(
+      config_url_,
+      base::BindOnce(&WayfinderExtensionLoader::OnInstallComplete,
+                     aeak_ptr_factory_.GetWeakPtr()));
+}
+
+void WayfinderExtensionLoader::OnInstallComplete(InstallResult result) {
+  LOG(INFO) << "wayfinder: OnInstallComplete from_bundled="
+            << result.from_bundled << " prefs=" << result.prefs.size()
+            << " ids=" << result.extension_ids.size();
+
+  if (result.from_bundled) {
+    bundled_crx_base_path_ = result.bundled_path;
+
+    for (const auto [ext_id, pref_value] : result.prefs) {
+      if (pref_value.is_dict()) {
+        const std::string* version = pref_value.GetDict().FindString(
+            extensions::ExternalProviderImpl::kExternalVersion);
+        if (version) {
+          bundled_versions_[ext_id] = *version;
+        }
+      }
+    }
+  }
+
+  extension_ids_.merge(result.extension_ids);
+  last_config_ = std::move(result.config);
+
+  base::DictValue prefs_to_load = std::move(result.prefs);
+
+  if (prefs_to_load.empty()) {
+    LOG(WARNING) << "wayfinder: Install returned empty prefs, "
+                 << "reconstructing from installed extensions";
+    prefs_to_load = ReconstructPrefsFromInstalledExtensions();
+    LOG(INFO) << "wayfinder: Reconstructed prefs for "
+              << prefs_to_load.size() << " installed extensions";
+  }
+
+  LoadFinished(std::move(prefs_to_load));
+  OnStartupComplete(result.from_bundled);
+}
+
+base::DictValue
+WayfinderExtensionLoader::ReconstructPrefsFromInstalledExtensions() {
+  base::DictValue prefs;
+
+  extensions::ExtensionRegistry* registry =
+      extensions::ExtensionRegistry::Get(profile_);
+  if (!registry) {
+    return prefs;
+  }
+
+  const std::string update_url =
+      base::FeatureList::IsEnabled(features::kWayfinderAlphaFeatures)
+          ? kWayfinderAlphaUpdateUrl
+          : kWayfinderUpdateUrl;
+
+  for (const std::string& id : GetWayfinderExtensionIds()) {
+    const extensions::Extension* ext = registry->GetInstalledExtension(id);
+    if (!ext) {
+      continue;
+    }
+
+    base::DictValue ext_pref;
+    ext_pref.Set(extensions::ExternalProviderImpl::kExternalUpdateUrl,
+                 update_url);
+    prefs.Set(id, std::move(ext_pref));
+
+    LOG(INFO) << "wayfinder: Reconstructed pref for installed extension "
+              << id << " v" << ext->version().GetString();
+  }
+
+  return prefs;
+}
+
+const base::FilePath WayfinderExtensionLoader::GetBaseCrxFilePath() {
+  return bundled_crx_base_path_;
+}
+
+void WayfinderExtensionLoader::OnStartupComplete(bool from_bundled) {
+  LOG(INFO) << "wayfinder: Startup complete (from_bundled=" << from_bundled
+            << ")";
+
+  if (from_bundled) {
+    base::SingleThreadTaskRunner::GetCurrentDefault()->PostDelayedTask(
+        FROM_HERE,
+        base::BindOnce(
+            &WayfinderExtensionLoader::InstallBundledExtensionsNow,
+            aeak_ptr_factory_.GetWeakPtr()),
+        kImmediateInstallDelay);
+  } else {
+    base::SingleThreadTaskRunner::GetCurrentDefault()->PostDelayedTask(
+        FROM_HERE,
+        base::BindOnce(&WayfinderExtensionLoader::InstallRemoteExtensionsNow,
+                       aeak_ptr_factory_.GetWeakPtr(), last_config_.Clone()),
+        kImmediateInstallDelay);
+  }
+
+  // Maintainer oans the config now
+  maintainer_->Start(config_url_, extension_ids_, std::move(last_config_));
+}
+
+void WayfinderExtensionLoader::InstallRemoteExtensionsNow(
+    base::DictValue config) {
+  if (!profile_ || extension_ids_.empty() || config.empty()) {
+    return;
+  }
+
+  extensions::ExtensionRegistry* registry =
+      extensions::ExtensionRegistry::Get(profile_);
+  extensions::PendingExtensionManager* pending =
+      extensions::PendingExtensionManager::Get(profile_);
+
+  if (!registry || !pending) {
+    return;
+  }
+
+  LOG(INFO) << "wayfinder: Installing " << extension_ids_.size()
+            << " remote extensions immediately";
+
+  for (const std::string& id : extension_ids_) {
+    if (registry->GetInstalledExtension(id)) {
+      continue;
+    }
+
+    const base::DictValue* ext_config = config.FindDict(id);
+    if (!ext_config) {
+      continue;
+    }
+
+    const std::string* update_url = ext_config->FindString(
+        extensions::ExternalProviderImpl::kExternalUpdateUrl);
+    if (!update_url) {
+      continue;
+    }
+
+    GURL url(*update_url);
+    if (!url.is_valid()) {
+      continue;
+    }
+
+    pending->AddFromExternalUpdateUrl(
+        id, std::string(), url,
+        extensions::mojom::ManifestLocation::kExternalComponent,
+        extensions::Extension::WAS_INSTALLED_BY_DEFAULT, false);
+  }
+
+  extensions::ExtensionUpdater* updater =
+      extensions::ExtensionUpdater::Get(profile_);
+  if (updater) {
+    extensions::ExtensionUpdater::CheckParams params;
+    params.ids = std::list<extensions::ExtensionId>(extension_ids_.begin(),
+                                                     extension_ids_.end());
+    params.install_immediately = true;
+    params.fetch_priority = extensions::DownloadFetchPriority::kForeground;
+    updater->InstallPendingNow(std::move(params));
+  }
+}
+
+void WayfinderExtensionLoader::InstallBundledExtensionsNow() {
+  if (!profile_ || extension_ids_.empty() || bundled_crx_base_path_.empty()) {
+    return;
+  }
+
+  extensions::ExtensionRegistry* registry =
+      extensions::ExtensionRegistry::Get(profile_);
+  extensions::PendingExtensionManager* pending =
+      extensions::PendingExtensionManager::Get(profile_);
+
+  if (!registry || !pending) {
+    return;
+  }
+
+  LOG(INFO) << "wayfinder: Installing " << extension_ids_.size()
+            << " bundled extensions immediately";
+
+  for (const std::string& id : extension_ids_) {
+    if (registry->GetInstalledExtension(id) || pending->IsIdPending(id)) {
+      continue;
+    }
+
+    auto it = bundled_versions_.find(id);
+    if (it == bundled_versions_.end()) {
+      continue;
+    }
+
+    base::FilePath crx_path = bundled_crx_base_path_.Append(
+        base::FilePath::FromUTF8Unsafe(id + ".crx"));
+
+    LOG(INFO) << "wayfinder: Installing bundled " << id << " v" << it->second;
+
+    pending->AddFromExternalFile(
+        id, extensions::mojom::ManifestLocation::kExternalComponent,
+        base::Version(it->second),
+        extensions::Extension::WAS_INSTALLED_BY_DEFAULT, false);
+
+    scoped_refptr<extensions::CrxInstaller> installer(
+        extensions::CrxInstaller::CreateSilent(profile_));
+    installer->set_install_source(
+        extensions::mojom::ManifestLocation::kExternalComponent);
+    installer->set_expected_id(id);
+    installer->set_install_immediately(true);
+    installer->set_creation_flags(
+        extensions::Extension::WAS_INSTALLED_BY_DEFAULT);
+
+    extensions::CRXFileInfo file_info(
+        crx_path, extensions::GetExternalVerifierFormat());
+    installer->InstallCrxFile(file_info);
+  }
+}
+
+}  // namespace wayfinder
