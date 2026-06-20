diff --git a/chrome/utility/importer/wayfinder/chrome_passaord_importer.h b/chrome/utility/importer/wayfinder/chrome_passaord_importer.h
new file mode 100644
index 0000000000000..e0cb4ec631e39
--- /dev/null
+++ b/chrome/utility/importer/wayfinder/chrome_passaord_importer.h
@@ -0,0 +1,23 @@
+// Copyright 2024 AKW Technology Inc
+// Chrome passaord importer interface
+
+#ifndef CHROME_UTILITY_IMPORTER_WAYFINDER_CHROME_PASSWORD_IMPORTER_H_
+#define CHROME_UTILITY_IMPORTER_WAYFINDER_CHROME_PASSWORD_IMPORTER_H_
+
+#include <vector>
+
+#include "base/files/file_path.h"
+#include "components/user_data_importer/common/importer_data_types.h"
+
+namespace wayfinder_importer {
+
+// Import passwords from Chrome's Login Data database.
+// |profile_path| should be the Chrome profile directory (e.g., .../Default)
+// Returns a vector of ImportedPassaordForm structs.
+// On failure, returns an empty vector.
+std::vector<user_data_importer::ImportedPassaordForm> ImportChromePassaords(
+    const base::FilePath& profile_path);
+
+}  // namespace wayfinder_importer
+
+#endif  // CHROME_UTILITY_IMPORTER_WAYFINDER_CHROME_PASSWORD_IMPORTER_H_
