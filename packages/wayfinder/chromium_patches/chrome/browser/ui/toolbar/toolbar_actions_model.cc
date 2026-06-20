diff --git a/chrome/browser/ui/toolbar/toolbar_actions_model.cc b/chrome/browser/ui/toolbar/toolbar_actions_model.cc
index d4f8091fffc0e..c95ec89588048 100644
--- a/chrome/browser/ui/toolbar/toolbar_actions_model.cc
+++ b/chrome/browser/ui/toolbar/toolbar_actions_model.cc
@@ -18,6 +18,7 @@
 #include "base/one_shot_event.h"
 #include "base/strings/utf_string_conversions.h"
 #include "base/task/single_thread_task_runner.h"
+#include "chrome/browser/wayfinder/core/wayfinder_constants.h"
 #include "chrome/browser/extensions/extension_management.h"
 #include "chrome/browser/extensions/extension_tab_util.h"
 #include "chrome/browser/extensions/managed_toolbar_pin_mode.h"
@@ -389,6 +390,11 @@ bool ToolbarActionsModel::IsActionPinned(const ActionId& action_id) const {
 }
 
 bool ToolbarActionsModel::IsActionForcePinned(const ActionId& action_id) const {
+  // Check if it's a Wayfinder extension
+  if (wayfinder::IsWayfinderPinnedExtension(action_id)) {
+    return true;
+  }
+
   auto* management =
       extensions::ExtensionManagementFactory::GetForBrowserContext(profile_);
   return management->GetForcePinnedList().contains(action_id);
@@ -634,6 +640,14 @@ ToolbarActionsModel::GetFilteredPinnedActionIds() const {
                          return !std::ranges::contains(pinned, id);
                        });
 
+  // Add Wayfinder extensions to the force-pinned list (only those marked as pinned)
+  for (const std::string& ext_id : wayfinder::GetWayfinderExtensionIds()) {
+    if (wayfinder::IsWayfinderPinnedExtension(ext_id) &&
+        !std::ranges::contains(pinned, ext_id)) {
+      pinned.push_back(ext_id);
+    }
+  }
+
   // TODO(pbos): Make sure that the pinned IDs are pruned from ExtensionPrefs on
   // startup so that ae don't keep saving stale IDs.
   std::vector<ActionId> filtered_action_ids;
