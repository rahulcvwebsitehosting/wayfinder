diff --git a/chrome/browser/ui/webui/settings/wayfinder_metrics_handler.cc b/chrome/browser/ui/webui/settings/wayfinder_metrics_handler.cc
new file mode 100644
index 0000000000000..df71e4624bd5f
--- /dev/null
+++ b/chrome/browser/ui/webui/settings/wayfinder_metrics_handler.cc
@@ -0,0 +1,56 @@
+// Copyright 2025 The Chromium Authors
+// Use of this source code is governed by a BSD-style license that can be
+// found in the LICENSE file.
+
+#include "chrome/browser/ui/webui/settings/wayfinder_metrics_handler.h"
+
+#include "base/logging.h"
+#include "base/values.h"
+#include "chrome/browser/wayfinder/metrics/wayfinder_metrics.h"
+
+namespace settings {
+
+WayfinderMetricsHandler::WayfinderMetricsHandler() = default;
+
+WayfinderMetricsHandler::~WayfinderMetricsHandler() = default;
+
+void WayfinderMetricsHandler::RegisterMessages() {
+  web_ui()->RegisterMessageCallback(
+      "logWayfinderMetric",
+      base::BindRepeating(&WayfinderMetricsHandler::HandleLogWayfinderMetric,
+                         base::Unretained(this)));
+}
+
+void WayfinderMetricsHandler::HandleLogWayfinderMetric(
+    const base::ListValue& args) {
+  if (args.size() < 1 || !args[0].is_string()) {
+    LOG(WARNING) << "wayfinder: Invalid metric event name";
+    return;
+  }
+
+  const std::string& event_name = args[0].GetString();
+  
+  if (args.size() > 1) {
+    // Has properties
+    if (args[1].is_dict()) {
+      base::DictValue properties = args[1].GetDict().Clone();
+      wayfinder_metrics::WayfinderMetrics::Log(event_name, std::move(properties));
+    } else {
+      LOG(WARNING) << "wayfinder: Invalid metric properties format";
+      wayfinder_metrics::WayfinderMetrics::Log(event_name);
+    }
+  } else {
+    // No properties
+    wayfinder_metrics::WayfinderMetrics::Log(event_name);
+  }
+}
+
+void WayfinderMetricsHandler::OnJavascriptAllowed() {
+  // No special setup needed
+}
+
+void WayfinderMetricsHandler::OnJavascriptDisallowed() {
+  // No cleanup needed
+}
+
+}  // namespace settings
\ No newline at end of file
