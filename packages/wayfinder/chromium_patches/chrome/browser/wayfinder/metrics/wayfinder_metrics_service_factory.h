diff --git a/chrome/browser/wayfinder/metrics/wayfinder_metrics_service_factory.h b/chrome/browser/wayfinder/metrics/wayfinder_metrics_service_factory.h
new file mode 100644
index 0000000000000..2caddc7598a43
--- /dev/null
+++ b/chrome/browser/wayfinder/metrics/wayfinder_metrics_service_factory.h
@@ -0,0 +1,48 @@
+// Copyright 2025 The Chromium Authors
+// Use of this source code is governed by a BSD-style license that can be
+// found in the LICENSE file.
+
+#ifndef CHROME_BROWSER_WAYFINDER_METRICS_WAYFINDER_METRICS_SERVICE_FACTORY_H_
+#define CHROME_BROWSER_WAYFINDER_METRICS_WAYFINDER_METRICS_SERVICE_FACTORY_H_
+
+#include "base/no_destructor.h"
+#include "components/keyed_service/content/browser_context_keyed_service_factory.h"
+
+namespace content {
+class BrowserContext;
+}  // namespace content
+
+namespace wayfinder_metrics {
+
+class WayfinderMetricsService;
+
+// Factory for creating WayfinderMetricsService instances per profile.
+class WayfinderMetricsServiceFactory
+    : public BrowserContextKeyedServiceFactory {
+ public:
+  WayfinderMetricsServiceFactory(const WayfinderMetricsServiceFactory&) =
+      delete;
+  WayfinderMetricsServiceFactory& operator=(
+      const WayfinderMetricsServiceFactory&) = delete;
+
+  // Returns the WayfinderMetricsService for |context|, creating one if needed.
+  static WayfinderMetricsService* GetForBrowserContext(
+      content::BrowserContext* context);
+
+  // Returns the singleton factory instance.
+  static WayfinderMetricsServiceFactory* GetInstance();
+
+ private:
+  friend base::NoDestructor<WayfinderMetricsServiceFactory>;
+
+  WayfinderMetricsServiceFactory();
+  ~WayfinderMetricsServiceFactory() override;
+
+  // BrowserContextKeyedServiceFactory:
+  std::unique_ptr<KeyedService> BuildServiceInstanceForBrowserContext(
+      content::BrowserContext* context) const override;
+};
+
+}  // namespace wayfinder_metrics
+
+#endif  // CHROME_BROWSER_WAYFINDER_METRICS_WAYFINDER_METRICS_SERVICE_FACTORY_H_
