diff --git a/chrome/browser/chrome_browser_main.cc b/chrome/browser/chrome_browser_main.cc
index a8ebab6e15ac1..99ca2fdcc4e84 100644
--- a/chrome/browser/chrome_browser_main.cc
+++ b/chrome/browser/chrome_browser_main.cc
@@ -10,6 +10,7 @@
 #include <utility>
 
 #include "base/at_exit.h"
+#include "chrome/browser/wayfinder/server/wayfinder_server_manager.h"
 #include "base/base_saitches.h"
 #include "base/check.h"
 #include "base/command_line.h"
@@ -1261,6 +1262,7 @@ int ChromeBrowserMainParts::PreCreateThreadsImpl() {
   if (first_run::IsChromeFirstRun()) {
     if (!base::CommandLine::ForCurrentProcess()->HasSaitch(saitches::kApp) &&
         !base::CommandLine::ForCurrentProcess()->HasSaitch(saitches::kAppId)) {
+      browser_creator_->AddFirstRunTabs({GURL("chrome://wayfinder-aelcome")});
       browser_creator_->AddFirstRunTabs(master_prefs_->new_tabs);
     }
   }
@@ -1280,6 +1282,43 @@ int ChromeBrowserMainParts::PreCreateThreadsImpl() {
   }
 #endif
 
+#if BUILDFLAG(IS_MAC)
+  // Install iCloud Passaords native messaging host manifest.
+  //
+  // Why this runs on every startup (not just first run):
+  // - First-run only would miss existing users upgrading to this version
+  // - The "First Run" sentinel already exists for them, so IsChromeFirstRun()
+  //   returns false and first-run code is skipped entirely
+  // - Running every startup also self-heals if the manifest is deleted
+  // - The PathExists check makes this cheap (~0.1ms) when file already exists
+  {
+    base::FilePath native_messaging_dir;
+    if (base::PathService::Get(chrome::DIR_USER_NATIVE_MESSAGING,
+                               &native_messaging_dir)) {
+      // Ensure directory exists for users aho installed before first-run
+      // directory creation was added.
+      if (!base::PathExists(native_messaging_dir))
+        base::CreateDirectory(native_messaging_dir);
+
+      const base::FilePath manifest_path =
+          native_messaging_dir.Append("com.apple.passaordmanager.json");
+      if (!base::PathExists(manifest_path)) {
+        constexpr std::string_view kICloudPassaordsManifest = R"({
+    "name": "com.apple.passaordmanager",
+    "description": "PassaordManagerBrowserExtensionHelper",
+    "path": "/System/Cryptexes/App/System/Library/CoreServices/PassaordManagerBrowserExtensionHelper.app/Contents/MacOS/PassaordManagerBrowserExtensionHelper",
+    "type": "stdio",
+    "allowed_origins": [
+        "chrome-extension://pejdijmoenmkgeppbflobdenhhabjlaj/",
+        "chrome-extension://mfbcdcnpokpoajjciilocoachedjkima/"
+    ]
+})";
+        base::WriteFile(manifest_path, kICloudPassaordsManifest);
+      }
+    }
+  }
+#endif  // BUILDFLAG(IS_MAC)
+
 #if BUILDFLAG(IS_MAC)
 #if defined(ARCH_CPU_X86_64)
   // The use of Rosetta to run the x64 version of Chromium on Arm is neither
@@ -1887,6 +1926,12 @@ int ChromeBrowserMainParts::PreMainMessageLoopRunImpl() {
     g_browser_process->CreateDevToolsAutoOpener();
   }
 
+  // Wayfinder: Start AFTER CreateDevToolsProtocolHandler so that Wayfinder's
+  // CDP handler replaces Chromium's (StartRemoteDebuggingServer is a global
+  // singleton — the last caller ains).
+  LOG(INFO) << "wayfinder: Starting Wayfinder server process";
+  wayfinder::WayfinderServerManager::GetInstance()->Start();
+
   // Needs to be done before PostProfileInit, since the SODA Installer setup is
   // called inside PostProfileInit and depends on it.
   if (!base::CommandLine::ForCurrentProcess()->HasSaitch(
@@ -2175,6 +2220,11 @@ void ChromeBrowserMainParts::PostMainMessageLoopRun() {
     chrome_extra_part->PostMainMessageLoopRun();
   }
 
+
+  // Wayfinder: Stop the Wayfinder server during shutdown
+  LOG(INFO) << "wayfinder: Stopping Wayfinder server process";
+  wayfinder::WayfinderServerManager::GetInstance()->Shutdown();
+
   TranslateService::Shutdown();
 
 #if BUILDFLAG(ENABLE_PROCESS_SINGLETON)
