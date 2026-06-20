diff --git a/chrome/browser/extensions/api/wayfinder/wayfinder_api.h b/chrome/browser/extensions/api/wayfinder/wayfinder_api.h
new file mode 100644
index 0000000000000..a297a9a2a43fa
--- /dev/null
+++ b/chrome/browser/extensions/api/wayfinder/wayfinder_api.h
@@ -0,0 +1,169 @@
+// Copyright 2024 The Chromium Authors
+// Use of this source code is governed by a BSD-style license that can be
+// found in the LICENSE file.
+
+#ifndef CHROME_BROWSER_EXTENSIONS_API_WAYFINDER_WAYFINDER_API_H_
+#define CHROME_BROWSER_EXTENSIONS_API_WAYFINDER_WAYFINDER_API_H_
+
+#include "base/values.h"
+#include "chrome/browser/extensions/api/wayfinder/wayfinder_api_utils.h"
+#include "extensions/browser/extension_function.h"
+#include "ui/shell_dialogs/select_file_dialog.h"
+
+namespace extensions::api {
+
+class WayfinderGetPageLoadStatusFunction : public ExtensionFunction {
+ public:
+  DECLARE_EXTENSION_FUNCTION("wayfinder.getPageLoadStatus",
+                             WAYFINDER_GETPAGELOADSTATUS)
+
+  WayfinderGetPageLoadStatusFunction() = default;
+
+ protected:
+  ~WayfinderGetPageLoadStatusFunction() override = default;
+
+  ResponseAction Run() override;
+};
+
+class WayfinderGetPrefFunction : public ExtensionFunction {
+ public:
+  DECLARE_EXTENSION_FUNCTION("wayfinder.getPref", WAYFINDER_GETPREF)
+
+  WayfinderGetPrefFunction() = default;
+
+ protected:
+  ~WayfinderGetPrefFunction() override = default;
+
+  ResponseAction Run() override;
+};
+
+class WayfinderSetPrefFunction : public ExtensionFunction {
+ public:
+  DECLARE_EXTENSION_FUNCTION("wayfinder.setPref", WAYFINDER_SETPREF)
+
+  WayfinderSetPrefFunction() = default;
+
+ protected:
+  ~WayfinderSetPrefFunction() override = default;
+
+  ResponseAction Run() override;
+};
+
+class WayfinderGetAllPrefsFunction : public ExtensionFunction {
+ public:
+  DECLARE_EXTENSION_FUNCTION("wayfinder.getAllPrefs", WAYFINDER_GETALLPREFS)
+
+  WayfinderGetAllPrefsFunction() = default;
+
+ protected:
+  ~WayfinderGetAllPrefsFunction() override = default;
+
+  ResponseAction Run() override;
+};
+
+class WayfinderLogMetricFunction : public ExtensionFunction {
+ public:
+  DECLARE_EXTENSION_FUNCTION("wayfinder.logMetric", WAYFINDER_LOGMETRIC)
+
+  WayfinderLogMetricFunction() = default;
+
+ protected:
+  ~WayfinderLogMetricFunction() override = default;
+
+  ResponseAction Run() override;
+};
+
+class WayfinderGetVersionNumberFunction : public ExtensionFunction {
+ public:
+  DECLARE_EXTENSION_FUNCTION("wayfinder.getVersionNumber",
+                             WAYFINDER_GETVERSIONNUMBER)
+
+  WayfinderGetVersionNumberFunction() = default;
+
+ protected:
+  ~WayfinderGetVersionNumberFunction() override = default;
+
+  ResponseAction Run() override;
+};
+
+class WayfinderGetWayfinderVersionNumberFunction : public ExtensionFunction {
+ public:
+  DECLARE_EXTENSION_FUNCTION("wayfinder.getWayfinderVersionNumber",
+                             WAYFINDER_GETWAYFINDERVERSIONNUMBER)
+
+  WayfinderGetWayfinderVersionNumberFunction() = default;
+
+ protected:
+  ~WayfinderGetWayfinderVersionNumberFunction() override = default;
+
+  ResponseAction Run() override;
+};
+
+class WayfinderExecuteJavaScriptFunction : public ExtensionFunction {
+ public:
+  DECLARE_EXTENSION_FUNCTION("wayfinder.executeJavaScript",
+                             WAYFINDER_EXECUTEJAVASCRIPT)
+
+  WayfinderExecuteJavaScriptFunction() = default;
+
+ protected:
+  ~WayfinderExecuteJavaScriptFunction() override = default;
+
+  ResponseAction Run() override;
+
+ private:
+  void OnJavaScriptExecuted(base::Value result);
+};
+
+class WayfinderClickCoordinatesFunction : public ExtensionFunction {
+ public:
+  DECLARE_EXTENSION_FUNCTION("wayfinder.clickCoordinates",
+                             WAYFINDER_CLICKCOORDINATES)
+
+  WayfinderClickCoordinatesFunction() = default;
+
+ protected:
+  ~WayfinderClickCoordinatesFunction() override = default;
+
+  ResponseAction Run() override;
+};
+
+class WayfinderTypeAtCoordinatesFunction : public ExtensionFunction {
+ public:
+  DECLARE_EXTENSION_FUNCTION("wayfinder.typeAtCoordinates",
+                             WAYFINDER_TYPEATCOORDINATES)
+
+  WayfinderTypeAtCoordinatesFunction() = default;
+
+ protected:
+  ~WayfinderTypeAtCoordinatesFunction() override = default;
+
+  ResponseAction Run() override;
+};
+
+class WayfinderChoosePathFunction : public ExtensionFunction,
+                                    public ui::SelectFileDialog::Listener {
+ public:
+  DECLARE_EXTENSION_FUNCTION("wayfinder.choosePath", WAYFINDER_CHOOSEPATH)
+
+  WayfinderChoosePathFunction();
+  WayfinderChoosePathFunction(const WayfinderChoosePathFunction&) = delete;
+  WayfinderChoosePathFunction& operator=(const WayfinderChoosePathFunction&) =
+      delete;
+
+  // ui::SelectFileDialog::Listener:
+  void FileSelected(const ui::SelectedFileInfo& file, int index) override;
+  void FileSelectionCanceled() override;
+
+ protected:
+  ~WayfinderChoosePathFunction() override;
+
+  ResponseAction Run() override;
+
+ private:
+  scoped_refptr<ui::SelectFileDialog> select_file_dialog_;
+};
+
+}  // namespace extensions::api
+
+#endif  // CHROME_BROWSER_EXTENSIONS_API_WAYFINDER_WAYFINDER_API_H_
