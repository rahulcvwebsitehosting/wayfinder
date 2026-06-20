diff --git a/chrome/browser/wayfinder/metrics/wayfinder_metrics.h b/chrome/browser/wayfinder/metrics/wayfinder_metrics.h
new file mode 100644
index 0000000000000..7cac6786da901
--- /dev/null
+++ b/chrome/browser/wayfinder/metrics/wayfinder_metrics.h
@@ -0,0 +1,40 @@
+// Copyright 2025 The Chromium Authors
+// Use of this source code is governed by a BSD-style license that can be
+// found in the LICENSE file.
+
+#ifndef CHROME_BROWSER_WAYFINDER_METRICS_WAYFINDER_METRICS_H_
+#define CHROME_BROWSER_WAYFINDER_METRICS_WAYFINDER_METRICS_H_
+
+#include <string>
+#include <utility>
+
+#include "base/values.h"
+
+namespace wayfinder_metrics {
+
+// Simple static API for logging Wayfinder metrics.
+// Usage: WayfinderMetrics::Log("event.name");
+class WayfinderMetrics {
+ public:
+  // Log an event with no properties
+  // sample_rate: 0.0 to 1.0, defaults to 1.0 (always log)
+  // For example, sample_rate=0.1 means log only 10% of the time
+  static void Log(const std::string& event_name, double sample_rate = 1.0);
+
+  // Log an event with properties using initializer list
+  // Example: Log("event", {{"key1", "value1"}, {"key2", 123}})
+  static void Log(const std::string& event_name,
+                  std::initializer_list<std::pair<std::string, base::Value>> properties,
+                  double sample_rate = 1.0);
+
+  // Log an event with pre-built properties dict
+  static void Log(const std::string& event_name, base::DictValue properties,
+                  double sample_rate = 1.0);
+
+ private:
+  WayfinderMetrics() = delete;
+};
+
+}  // namespace wayfinder_metrics
+
+#endif  // CHROME_BROWSER_WAYFINDER_METRICS_WAYFINDER_METRICS_H_
