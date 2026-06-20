diff --git a/chrome/browser/extensions/extension_management.cc b/chrome/browser/extensions/extension_management.cc
index bea1864156f76..eeb9c66eaae67 100644
--- a/chrome/browser/extensions/extension_management.cc
+++ b/chrome/browser/extensions/extension_management.cc
@@ -25,6 +25,8 @@
 #include "base/values.h"
 #include "base/version.h"
 #include "build/chromeos_buildflags.h"
+#include "chrome/browser/browser_features.h"
+#include "chrome/browser/wayfinder/core/wayfinder_constants.h"
 #include "chrome/browser/enterprise/util/managed_browser_utils.h"
 #include "chrome/browser/extensions/cas_info_service_factory.h"
 #include "chrome/browser/extensions/extension_management_constants.h"
@@ -272,6 +274,15 @@ bool ExtensionManagement::IsUpdateUrlOverridden(const ExtensionId& id) {
 }
 
 GURL ExtensionManagement::GetEffectiveUpdateURL(const Extension& extension) {
+  // Wayfinder: route bundled extensions to the alpha update manifest when on
+  // the alpha channel. Must live here (not in the extension's manifest.json
+  // update_url) so a mid-session channel flip takes effect on the next update
+  // check, without uninstalling the extension.
+  if (wayfinder::IsWayfinderExtension(extension.id()) &&
+      base::FeatureList::IsEnabled(features::kWayfinderAlphaFeatures)) {
+    return GURL(wayfinder::kWayfinderAlphaUpdateUrl);
+  }
+
   if (IsUpdateUrlOverridden(extension.id())) {
     DCHECK(!extension.was_installed_by_default())
         << "Update URL should not be overridden for default-installed "
@@ -664,6 +675,14 @@ ExtensionIdSet ExtensionManagement::GetForcePinnedList() const {
       force_pinned_list.insert(entry.first);
     }
   }
+
+  // Always force-pin Wayfinder extensions that are marked pinned.
+  for (const auto& extension_id : wayfinder::GetWayfinderExtensionIds()) {
+    if (wayfinder::IsWayfinderPinnedExtension(extension_id)) {
+      force_pinned_list.insert(extension_id);
+    }
+  }
+
   return force_pinned_list;
 }
 
