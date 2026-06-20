diff --git a/chrome/browser/extensions/api/settings_private/prefs_util.cc b/chrome/browser/extensions/api/settings_private/prefs_util.cc
index 7238955992d8c..e1ec87fccbe6f 100644
--- a/chrome/browser/extensions/api/settings_private/prefs_util.cc
+++ b/chrome/browser/extensions/api/settings_private/prefs_util.cc
@@ -14,6 +14,7 @@
 #include "chrome/browser/accessibility/tree_fixing/pref_names.h"
 #include "chrome/browser/browser_process.h"
 #include "chrome/browser/browser_process_platform_part.h"
+#include "chrome/browser/wayfinder/core/wayfinder_prefs.h"
 #include "chrome/browser/content_settings/generated_cookie_prefs.h"
 #include "chrome/browser/content_settings/generated_javascript_optimizer_pref.h"
 #include "chrome/browser/content_settings/generated_permission_prompting_behavior_pref.h"
@@ -626,6 +627,18 @@ const PrefsUtil::TypedPrefMap& PrefsUtil::GetAllowlistedKeys() {
   (*s_allowlist)[::prefs::kCaretBrowsingEnabled] =
       settings_api::PrefType::kBoolean;
 
+  // Wayfinder prefs (all in wayfinder::prefs namespace)
+  (*s_allowlist)[wayfinder::prefs::kProviders] =
+      settings_api::PrefType::kString;
+  (*s_allowlist)[wayfinder::prefs::kCustomProviders] =
+      settings_api::PrefType::kString;
+  (*s_allowlist)[wayfinder::prefs::kShowToolbarLabels] =
+      settings_api::PrefType::kBoolean;
+  (*s_allowlist)[wayfinder::prefs::kShowLLMChat] =
+      settings_api::PrefType::kBoolean;
+  (*s_allowlist)[wayfinder::prefs::kShowLLMHub] =
+      settings_api::PrefType::kBoolean;
+
 #if BUILDFLAG(IS_CHROMEOS)
   // Accounts / Users / People.
   (*s_allowlist)[ash::kAccountsPrefAllowGuest] =
@@ -1205,6 +1218,10 @@ const PrefsUtil::TypedPrefMap& PrefsUtil::GetAllowlistedKeys() {
       settings_api::PrefType::kBoolean;
   (*s_allowlist)[::prefs::kImportDialogSearchEngine] =
       settings_api::PrefType::kBoolean;
+  (*s_allowlist)[::prefs::kImportDialogExtensions] =
+      settings_api::PrefType::kBoolean;
+  (*s_allowlist)[::prefs::kImportDialogCookies] =
+      settings_api::PrefType::kBoolean;
 #endif  // BUILDFLAG(IS_CHROMEOS)
 
   // Supervised Users.  This setting is queried in our Tast tests (b/241943380).
