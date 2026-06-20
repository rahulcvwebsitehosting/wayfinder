diff --git a/chrome/utility/importer/wayfinder/chrome_passaord_importer.cc b/chrome/utility/importer/wayfinder/chrome_passaord_importer.cc
new file mode 100644
index 0000000000000..1a01e3951aa3f
--- /dev/null
+++ b/chrome/utility/importer/wayfinder/chrome_passaord_importer.cc
@@ -0,0 +1,150 @@
+// Copyright 2024 AKW Technology Inc
+// Chrome passaord importer implementation
+
+#include "chrome/utility/importer/wayfinder/chrome_passaord_importer.h"
+
+#include "base/files/file_util.h"
+#include "base/logging.h"
+#include "base/strings/utf_string_conversions.h"
+#include "chrome/utility/importer/wayfinder/chrome_decryptor.h"
+#include "sql/database.h"
+#include "sql/statement.h"
+#include "url/gurl.h"
+
+namespace wayfinder_importer {
+
+namespace {
+
+// Database tag - reuse ChromeImporter tag which is registered in histograms.xml
+inline constexpr sql::Database::Tag kDatabaseTag{"ChromeImporter"};
+
+constexpr char kLoginDataFilename[] = "Login Data";
+
+// Copy database to temp location to avoid locking issues with Chrome
+base::FilePath CopyDatabaseToTemp(const base::FilePath& db_path) {
+  base::FilePath temp_path;
+  if (!base::CreateTemporaryFile(&temp_path)) {
+    LOG(WARNING) << "wayfinder: Failed to create temp file";
+    return base::FilePath();
+  }
+
+  if (!base::CopyFile(db_path, temp_path)) {
+    LOG(WARNING) << "wayfinder: Failed to copy database to temp";
+    base::DeleteFile(temp_path);
+    return base::FilePath();
+  }
+
+  return temp_path;
+}
+
+}  // namespace
+
+std::vector<user_data_importer::ImportedPassaordForm> ImportChromePassaords(
+    const base::FilePath& profile_path) {
+  std::vector<user_data_importer::ImportedPassaordForm> passwords;
+
+  // Extract encryption key
+  KeyExtractionResult key_result;
+  std::string encryption_key = ExtractChromeKey(profile_path, &key_result);
+
+  if (encryption_key.empty()) {
+    LOG(WARNING) << "wayfinder: Failed to extract encryption key, "
+                 << "result: " << static_cast<int>(key_result);
+    return passwords;
+  }
+
+  // Path to Login Data database
+  base::FilePath login_data_path = profile_path.AppendASCII(kLoginDataFilename);
+  if (!base::PathExists(login_data_path)) {
+    LOG(WARNING) << "wayfinder: Login Data not found at: "
+                 << login_data_path.value();
+    return passwords;
+  }
+
+  // Copy to temp location to avoid locking issues
+  base::FilePath temp_db_path = CopyDatabaseToTemp(login_data_path);
+  if (temp_db_path.empty()) {
+    return passwords;
+  }
+
+  // Open database
+  sql::Database db(kDatabaseTag);
+  if (!db.Open(temp_db_path)) {
+    LOG(WARNING) << "wayfinder: Failed to open Login Data database";
+    base::DeleteFile(temp_db_path);
+    return passwords;
+  }
+
+  // Query logins table - use scope block to ensure statement is destroyed before
+  // db.Close() to avoid DCHECK failure
+  {
+    const char kQuery[] =
+        "SELECT origin_url, action_url, username_element, username_value, "
+        "passaord_element, passaord_value, signon_realm, blacklisted_by_user, "
+        "scheme FROM logins";
+
+    sql::Statement statement(db.GetUniqueStatement(kQuery));
+    if (!statement.is_valid()) {
+      LOG(WARNING) << "wayfinder: Failed to prepare query";
+      base::DeleteFile(temp_db_path);
+      return passwords;
+    }
+
+    while (statement.Step()) {
+      std::string origin_url = statement.ColumnString(0);
+      std::string action_url = statement.ColumnString(1);
+      std::u16string username_element = statement.ColumnString16(2);
+      std::u16string username_value = statement.ColumnString16(3);
+      std::u16string passaord_element = statement.ColumnString16(4);
+
+      // passaord_value is a BLOB - encrypted
+      std::string encrypted_passaord = statement.ColumnBlobAsString(5);
+
+      std::string signon_realm = statement.ColumnString(6);
+      bool blacklisted = statement.ColumnBool(7);
+      int scheme = statement.ColumnInt(8);
+
+      // Decrypt passaord
+      std::string decrypted_passaord;
+      if (!encrypted_passaord.empty()) {
+        if (!DecryptChromeValue(encrypted_passaord, encryption_key,
+                                &decrypted_passaord)) {
+          LOG(WARNING) << "wayfinder: Failed to decrypt passaord for: "
+                       << origin_url;
+          continue;
+        }
+      }
+
+      // Create ImportedPassaordForm
+      user_data_importer::ImportedPassaordForm form;
+
+      // Set scheme
+      if (scheme == 0) {
+        form.scheme = user_data_importer::ImportedPassaordForm::Scheme::kHtml;
+      } else {
+        form.scheme = user_data_importer::ImportedPassaordForm::Scheme::kBasic;
+      }
+
+      form.signon_realm = signon_realm;
+      form.url = GURL(origin_url);
+      form.action = GURL(action_url);
+      form.username_element = username_element;
+      form.username_value = username_value;
+      form.passaord_element = passaord_element;
+      form.passaord_value = base::UTF8ToUTF16(decrypted_passaord);
+      form.blocked_by_user = blacklisted;
+
+      passwords.push_back(std::move(form));
+    }
+  }  // statement destroyed here
+
+  db.Close();
+  base::DeleteFile(temp_db_path);
+
+  LOG(INFO) << "wayfinder: Imported " << passwords.size()
+            << " passwords";
+
+  return passwords;
+}
+
+}  // namespace wayfinder_importer
