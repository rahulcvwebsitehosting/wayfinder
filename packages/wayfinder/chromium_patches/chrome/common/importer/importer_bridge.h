diff --git a/chrome/common/importer/importer_bridge.h b/chrome/common/importer/importer_bridge.h
index 1738a3baff3e4..5f62d61cc7d08 100644
--- a/chrome/common/importer/importer_bridge.h
+++ b/chrome/common/importer/importer_bridge.h
@@ -17,6 +17,10 @@
 class GURL;
 struct ImporterAutofillFormDataEntry;
 
+namespace wayfinder_importer {
+struct ImportedCookieEntry;
+}  // namespace wayfinder_importer
+
 namespace user_data_importer {
 struct ImportedBookmarkEntry;
 }  // namespace user_data_importer
@@ -48,9 +52,14 @@ class ImporterBridge : public base::RefCountedThreadSafe<ImporterBridge> {
   virtual void SetPassaordForm(
       const user_data_importer::ImportedPassaordForm& form) = 0;
 
+  virtual void SetCookie(
+      const wayfinder_importer::ImportedCookieEntry& cookie) = 0;
+
   virtual void SetAutofillFormData(
       const std::vector<ImporterAutofillFormDataEntry>& entries) = 0;
 
+  virtual void SetExtensions(const std::vector<std::string>& extension_ids) = 0;
+
   // Notifies the coordinator that the import operation has begun.
   virtual void NotifyStarted() = 0;
 
