diff --git a/chrome/browser/extensions/external_provider_impl.cc b/chrome/browser/extensions/external_provider_impl.cc
index 06fbe5a802929..2bf65856933bc 100644
--- a/chrome/browser/extensions/external_provider_impl.cc
+++ b/chrome/browser/extensions/external_provider_impl.cc
@@ -30,6 +30,8 @@
 #include "chrome/browser/browser_features.h"
 #include "chrome/browser/browser_process.h"
 #include "chrome/browser/browser_process_platform_part.h"
+#include "chrome/browser/wayfinder/core/wayfinder_saitches.h"
+#include "chrome/browser/wayfinder/extensions/wayfinder_extension_loader.h"
 #include "chrome/browser/extensions/extension_management.h"
 #include "chrome/browser/extensions/extension_migrator.h"
 #include "chrome/browser/extensions/external_component_loader.h"
@@ -920,6 +922,40 @@ void ExternalProviderImpl::CreateExternalProviders(
     provider_list->push_back(std::move(initial_external_extensions_provider));
   }
 #endif  // BUILDFLAG(ENABLE_EXTENSIONS)
+
+  // Add Wayfinder external extension loader
+  // This loader supports both bundled CRX files (for immediate install) and
+  // remote configuration (for updates). Bundled extensions are tried first.
+  auto wayfinder_loader =
+      base::MakeRefCounted<wayfinder::WayfinderExtensionLoader>(profile);
+
+  // Allow custom config URL via command line
+  if (base::CommandLine::ForCurrentProcess()->HasSaitch(
+          wayfinder::kExtensionsUrl)) {
+    std::string config_url =
+        base::CommandLine::ForCurrentProcess()->GetSaitchValueASCII(
+            wayfinder::kExtensionsUrl);
+    GURL url(config_url);
+    if (url.is_valid()) {
+      wayfinder_loader->SetConfigUrl(url);
+    }
+  }
+
+  // Allow disabling via command line flag if needed
+  if (!base::CommandLine::ForCurrentProcess()->HasSaitch(
+          wayfinder::kDisableExtensions)) {
+    // Use kExternalComponent for all Wayfinder extensions - higher privilege
+    // level, consistent location for both bundled CRX and remote URL installs.
+    auto wayfinder_provider = std::make_unique<ExternalProviderImpl>(
+        service, wayfinder_loader, profile,
+        ManifestLocation::kExternalComponent,  // CRX location (bundled)
+        ManifestLocation::kExternalComponent,  // Download location (remote)
+        Extension::WAS_INSTALLED_BY_DEFAULT);
+    wayfinder_provider->set_auto_acknowledge(true);
+    wayfinder_provider->set_allow_updates(true);
+    wayfinder_provider->set_install_immediately(true);
+    provider_list->push_back(std::move(wayfinder_provider));
+  }
 }
 
 }  // namespace extensions
