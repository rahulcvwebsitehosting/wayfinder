diff --git a/chrome/browser/wayfinder/metrics/wayfinder_metrics_prefs.h b/chrome/browser/wayfinder/metrics/wayfinder_metrics_prefs.h
new file mode 100644
index 0000000000000..4600e0c848552
--- /dev/null
+++ b/chrome/browser/wayfinder/metrics/wayfinder_metrics_prefs.h
@@ -0,0 +1,24 @@
+// Copyright 2025 The Chromium Authors
+// Use of this source code is governed by a BSD-style license that can be
+// found in the LICENSE file.
+
+#ifndef CHROME_BROWSER_WAYFINDER_METRICS_WAYFINDER_METRICS_PREFS_H_
+#define CHROME_BROWSER_WAYFINDER_METRICS_WAYFINDER_METRICS_PREFS_H_
+
+class PrefRegistrySimple;
+
+namespace user_prefs {
+class PrefRegistrySyncable;
+}  // namespace user_prefs
+
+namespace wayfinder_metrics {
+
+// Registers Wayfinder metrics preferences for the profile.
+void RegisterProfilePrefs(user_prefs::PrefRegistrySyncable* registry);
+
+// Registers Wayfinder metrics preferences for local state.
+void RegisterLocalStatePrefs(PrefRegistrySimple* registry);
+
+}  // namespace wayfinder_metrics
+
+#endif  // CHROME_BROWSER_WAYFINDER_METRICS_WAYFINDER_METRICS_PREFS_H_
