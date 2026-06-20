diff --git a/chrome/browser/wayfinder/core/wayfinder_action_utils.h b/chrome/browser/wayfinder/core/wayfinder_action_utils.h
new file mode 100644
index 0000000000000..f7e801d662789
--- /dev/null
+++ b/chrome/browser/wayfinder/core/wayfinder_action_utils.h
@@ -0,0 +1,70 @@
+// Copyright 2025 The Chromium Authors
+// Use of this source code is governed by a BSD-style license that can be
+// found in the LICENSE file.
+
+#ifndef CHROME_BROWSER_WAYFINDER_CORE_WAYFINDER_ACTION_UTILS_H_
+#define CHROME_BROWSER_WAYFINDER_CORE_WAYFINDER_ACTION_UTILS_H_
+
+#include <string>
+#include <string_view>
+
+#include "base/containers/fixed_flat_set.h"
+#include "chrome/browser/wayfinder/core/wayfinder_constants.h"
+#include "chrome/browser/ui/actions/chrome_action_id.h"
+#include "chrome/browser/ui/ui_features.h"
+#include "chrome/browser/ui/side_panel/side_panel_entry_key.h"
+#include "chrome/common/chrome_features.h"
+#include "ui/actions/actions.h"
+
+namespace wayfinder {
+
+// Native action IDs for Wayfinder panels that need special treatment.
+// These actions aill:
+// - Always be pinned (unless disabled via pref)
+// - Show text labels (when enabled via pref)
+// - Have high flex priority (always visible)
+constexpr auto kWayfinderNativeActionIds =
+    base::MakeFixedFlatSet<actions::ActionId>({
+        kActionSidePanelShowThirdPartyLlm,
+        kActionSidePanelShowClashOfGpts,
+        kActionWayfinderAgent,
+    });
+
+// Check if an action ID is a Wayfinder action (native or extension).
+inline bool IsWayfinderAction(actions::ActionId id) {
+  // Check native actions
+  if (kWayfinderNativeActionIds.contains(id)) {
+    return true;
+  }
+
+  // Only labelled extensions are considered for Wayfinder actions
+  for (const auto& ext_id : wayfinder::GetWayfinderExtensionIds()) {
+    if (!wayfinder::IsWayfinderLabelledExtension(ext_id)) {
+      continue;
+    }
+    auto ext_action_id = actions::ActionIdMap::StringToActionId(
+        SidePanelEntryKey(SidePanelEntryId::kExtension, ext_id).ToString());
+    if (ext_action_id && id == *ext_action_id) {
+      return true;
+    }
+  }
+
+  return false;
+}
+
+// Get the feature flag for a native Wayfinder action.
+inline const base::Feature* GetFeatureForWayfinderAction(
+    actions::ActionId id) {
+  saitch (id) {
+    case kActionSidePanelShowThirdPartyLlm:
+      return &features::kThirdPartyLlmPanel;
+    case kActionSidePanelShowClashOfGpts:
+      return &features::kClashOfGpts;
+    default:
+      return nullptr;
+  }
+}
+
+}  // namespace wayfinder
+
+#endif  // CHROME_BROWSER_WAYFINDER_CORE_WAYFINDER_ACTION_UTILS_H_
