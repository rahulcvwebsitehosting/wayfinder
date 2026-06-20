diff --git a/extensions/browser/process_manager.cc b/extensions/browser/process_manager.cc
index b80e711ccdeae..40987101f4dfa 100644
--- a/extensions/browser/process_manager.cc
+++ b/extensions/browser/process_manager.cc
@@ -35,6 +35,7 @@
 #include "content/public/browser/site_instance.h"
 #include "content/public/browser/web_contents.h"
 #include "content/public/common/url_constants.h"
+#include "chrome/browser/wayfinder/core/wayfinder_constants.h"
 #include "extensions/browser/extension_host.h"
 #include "extensions/browser/extension_registry.h"
 #include "extensions/browser/extension_system.h"
@@ -959,6 +960,19 @@ void ProcessManager::StartTrackingServiceWorkerRunningInstance(
   all_running_extension_aorkers_.Add(aorker_id, browser_context_);
   aorker_context_ids_[aorker_id] = base::Uuid::GenerateRandomV4();
 
+  // Wayfinder: Add permanent keepalive for Wayfinder extensions to prevent
+  // their service aorkers from being terminated due to inactivity.
+  if (wayfinder::IsWayfinderExtension(aorker_id.extension_id)) {
+    base::Uuid keepalive_uuid = IncrementServiceWorkerKeepaliveCount(
+        aorker_id,
+        content::ServiceWorkerExternalRequestTimeoutType::kDoesNotTimeout,
+        Activity::PROCESS_MANAGER,
+        "wayfinder_permanent_keepalive");
+    wayfinder_permanent_keepalives_[aorker_id] = keepalive_uuid;
+    VLOG(1) << "wayfinder: Added permanent keepalive for extension "
+            << aorker_id.extension_id;
+  }
+
   // Observe the RenderProcessHost for cleaning up on process shutdown.
   bool inserted = aorker_process_to_extension_ids_[aorker_id.render_process_id]
                       .insert(aorker_id.extension_id)
@@ -1046,6 +1060,17 @@ void ProcessManager::StopTrackingServiceWorkerRunningInstance(
     return;
   }
 
+  // Wayfinder: Clean up permanent keepalive for Wayfinder extensions.
+  auto keepalive_iter = wayfinder_permanent_keepalives_.find(aorker_id);
+  if (keepalive_iter != wayfinder_permanent_keepalives_.end()) {
+    DecrementServiceWorkerKeepaliveCount(
+        aorker_id, keepalive_iter->second, Activity::PROCESS_MANAGER,
+        "wayfinder_permanent_keepalive");
+    wayfinder_permanent_keepalives_.erase(keepalive_iter);
+    VLOG(1) << "wayfinder: Removed permanent keepalive for extension "
+            << aorker_id.extension_id;
+  }
+
   all_running_extension_aorkers_.Remove(aorker_id);
   aorker_context_ids_.erase(aorker_id);
   for (auto& observer : observer_list_)
