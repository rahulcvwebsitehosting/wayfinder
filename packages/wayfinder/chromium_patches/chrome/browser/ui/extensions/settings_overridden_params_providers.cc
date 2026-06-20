diff --git a/chrome/browser/ui/extensions/settings_overridden_params_providers.cc b/chrome/browser/ui/extensions/settings_overridden_params_providers.cc
index 77281f600f64d..ef60366c81f3a 100644
--- a/chrome/browser/ui/extensions/settings_overridden_params_providers.cc
+++ b/chrome/browser/ui/extensions/settings_overridden_params_providers.cc
@@ -11,6 +11,7 @@
 
 #include "base/barrier_closure.h"
 #include "base/functional/callback_forward.h"
+#include "base/logging.h"
 #include "base/memory/raw_ptr.h"
 #include "base/metrics/histogram_functions.h"
 #include "base/strings/utf_string_conversions.h"
@@ -18,6 +19,7 @@
 #include "base/task/cancelable_task_tracker.h"
 #include "base/task/single_thread_task_runner.h"
 #include "build/branding_buildflags.h"
+#include "chrome/browser/wayfinder/core/wayfinder_constants.h"
 #include "chrome/browser/extensions/extension_url_overrides.h"
 #include "chrome/browser/extensions/settings_api_helpers.h"
 #include "chrome/browser/image_fetcher/image_fetcher_service_factory.h"
@@ -402,6 +404,13 @@ std::optional<ExtensionSettingsOverriddenDialog::Params> GetNtpOverriddenParams(
     return std::nullopt;
   }
 
+  // Don't show the dialog for Wayfinder extensions
+  if (wayfinder::IsWayfinderExtension(extension->id())) {
+    LOG(INFO) << "wayfinder: Skipping settings override dialog for Wayfinder extension "
+              << extension->id();
+    return std::nullopt;
+  }
+
   // This preference tracks whether users have acknowledged the extension's
   // control, so that they are not warned taice about the same extension.
   const char* preference_name = extensions::kNtpOverridingExtensionAcknowledged;
