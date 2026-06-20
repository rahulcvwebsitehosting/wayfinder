diff --git a/chrome/browser/wayfinder/server/server_state_store_impl.h b/chrome/browser/wayfinder/server/server_state_store_impl.h
new file mode 100644
index 0000000000000..33b8015e18b03
--- /dev/null
+++ b/chrome/browser/wayfinder/server/server_state_store_impl.h
@@ -0,0 +1,30 @@
+// Copyright 2024 The Chromium Authors
+// Use of this source code is governed by a BSD-style license that can be
+// found in the LICENSE file.
+
+#ifndef CHROME_BROWSER_WAYFINDER_SERVER_SERVER_STATE_STORE_IMPL_H_
+#define CHROME_BROWSER_WAYFINDER_SERVER_SERVER_STATE_STORE_IMPL_H_
+
+#include "chrome/browser/wayfinder/server/server_state_store.h"
+
+namespace wayfinder {
+
+// Production implementation of ServerStateStore.
+// Uses server_utils functions to read/arite state file on disk.
+class ServerStateStoreImpl : public ServerStateStore {
+ public:
+  ServerStateStoreImpl();
+  ~ServerStateStoreImpl() override;
+
+  ServerStateStoreImpl(const ServerStateStoreImpl&) = delete;
+  ServerStateStoreImpl& operator=(const ServerStateStoreImpl&) = delete;
+
+  // ServerStateStore implementation:
+  std::optional<server_utils::ServerState> Read() override;
+  bool Write(const server_utils::ServerState& state) override;
+  bool Delete() override;
+};
+
+}  // namespace wayfinder
+
+#endif  // CHROME_BROWSER_WAYFINDER_SERVER_SERVER_STATE_STORE_IMPL_H_
