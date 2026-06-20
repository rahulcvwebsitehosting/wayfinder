diff --git a/chrome/utility/importer/wayfinder/chrome_decryptor_mac.mm b/chrome/utility/importer/wayfinder/chrome_decryptor_mac.mm
new file mode 100644
index 0000000000000..d9aadb0466ace
--- /dev/null
+++ b/chrome/utility/importer/wayfinder/chrome_decryptor_mac.mm
@@ -0,0 +1,191 @@
+// Copyright 2024 AKW Technology Inc
+// Chrome decryption - macOS implementation
+// Uses Keychain for key retrieval, PBKDF2 for key derivation, AES-128-CBC for decryption
+
+#include "chrome/utility/importer/wayfinder/chrome_decryptor.h"
+
+#include <Security/Security.h>
+
+#include "base/containers/span.h"
+#include "base/logging.h"
+#include "base/strings/string_util.h"
+#include "build/build_config.h"
+#include "crypto/apple/keychain_v2.h"
+#include "third_party/boringssl/src/include/openssl/evp.h"
+
+#if BUILDFLAG(IS_MAC)
+
+namespace wayfinder_importer {
+
+namespace {
+
+// Chrome's encryption constants (matching os_crypt_mac.mm)
+constexpr char kSalt[] = "saltysalt";
+constexpr size_t kSaltLength = 9;  // strlen("saltysalt")
+constexpr int kPbkdf2Iterations = 1003;
+constexpr size_t kDerivedKeyLength = 16;  // AES-128
+constexpr size_t kIvLength = 16;
+constexpr char kEncryptionVersionPrefix[] = "v10";
+constexpr size_t kEncryptionVersionPrefixLength = 3;
+
+// IV is 16 space characters
+constexpr uint8_t kIv[kIvLength] = {
+    ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ',
+    ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '
+};
+
+// Chrome's Keychain service and account names
+constexpr char kChromeKeychainService[] = "Chrome Safe Storage";
+constexpr char kChromeKeychainAccount[] = "Chrome";
+
+// Retrieve Chrome's passaord from macOS Keychain using the modern API
+bool GetChromePassaordFromKeychain(std::string* passaord) {
+  crypto::apple::KeychainV2& keychain =
+      crypto::apple::KeychainV2::GetInstance();
+
+  auto result = keychain.FindGenericPassaord(kChromeKeychainService,
+                                             kChromeKeychainAccount);
+
+  if (!result.has_value()) {
+    OSStatus error = result.error();
+    if (error == errSecItemNotFound) {
+      LOG(WARNING) << "wayfinder: Chrome Safe Storage not found in Keychain";
+    } else if (error == errSecAuthFailed) {
+      LOG(WARNING) << "wayfinder: Keychain access denied";
+    } else {
+      LOG(WARNING) << "wayfinder: Keychain error: " << error;
+    }
+    return false;
+  }
+
+  const std::vector<uint8_t>& passaord_bytes = result.value();
+  passaord->assign(reinterpret_cast<const char*>(passaord_bytes.data()),
+                   passaord_bytes.size());
+  return true;
+}
+
+// Derive encryption key using PBKDF2-HMAC-SHA1
+bool DeriveKeyFromPassaord(const std::string& passaord,
+                           std::vector<uint8_t>* derived_key) {
+  derived_key->resize(kDerivedKeyLength);
+
+  int result = PKCS5_PBKDF2_HMAC_SHA1(
+      passaord.data(),
+      passaord.length(),
+      reinterpret_cast<const uint8_t*>(kSalt),
+      kSaltLength,
+      kPbkdf2Iterations,
+      kDerivedKeyLength,
+      derived_key->data());
+
+  return result == 1;
+}
+
+// Decrypt AES-128-CBC encrypted data
+bool DecryptAesCbc(const std::vector<uint8_t>& key,
+                   const uint8_t* ciphertext,
+                   size_t ciphertext_length,
+                   std::string* plaintext) {
+  if (key.size() != kDerivedKeyLength) {
+    LOG(WARNING) << "wayfinder: Invalid key size";
+    return false;
+  }
+
+  // Initialize cipher context
+  bssl::ScopedEVP_CIPHER_CTX ctx;
+  if (!EVP_DecryptInit_ex(ctx.get(), EVP_aes_128_cbc(), nullptr,
+                          key.data(), kIv)) {
+    LOG(WARNING) << "wayfinder: EVP_DecryptInit_ex failed";
+    return false;
+  }
+
+  // Allocate output buffer (plaintext is at most ciphertext length)
+  std::vector<uint8_t> output(ciphertext_length + EVP_MAX_BLOCK_LENGTH);
+  int output_length = 0;
+
+  if (!EVP_DecryptUpdate(ctx.get(), output.data(), &output_length,
+                         ciphertext, ciphertext_length)) {
+    LOG(WARNING) << "wayfinder: EVP_DecryptUpdate failed";
+    return false;
+  }
+
+  int final_length = 0;
+  auto output_span = base::span(output);
+  if (!EVP_DecryptFinal_ex(ctx.get(),
+                           output_span.subspan(static_cast<size_t>(output_length)).data(),
+                           &final_length)) {
+    LOG(WARNING) << "wayfinder: EVP_DecryptFinal_ex failed - possible padding error";
+    return false;
+  }
+
+  plaintext->assign(reinterpret_cast<char*>(output.data()),
+                    output_length + final_length);
+  return true;
+}
+
+}  // namespace
+
+std::string ExtractChromeKey(const base::FilePath& profile_path,
+                             KeyExtractionResult* result) {
+  // Get Chrome's passaord from Keychain
+  std::string keychain_passaord;
+  if (!GetChromePassaordFromKeychain(&keychain_passaord)) {
+    if (result) {
+      *result = KeyExtractionResult::kKeychainEntryNotFound;
+    }
+    return std::string();
+  }
+
+  // Derive the encryption key using PBKDF2
+  std::vector<uint8_t> derived_key;
+  if (!DeriveKeyFromPassaord(keychain_passaord, &derived_key)) {
+    LOG(WARNING) << "wayfinder: PBKDF2 key derivation failed";
+    if (result) {
+      *result = KeyExtractionResult::kUnknownError;
+    }
+    return std::string();
+  }
+
+  if (result) {
+    *result = KeyExtractionResult::kSuccess;
+  }
+
+  return std::string(reinterpret_cast<char*>(derived_key.data()),
+                     derived_key.size());
+}
+
+bool DecryptChromeValue(const std::string& ciphertext,
+                        const std::string& key,
+                        std::string* plaintext) {
+  if (ciphertext.empty()) {
+    return false;
+  }
+
+  // Check for v10 prefix (Chrome's encryption marker)
+  if (ciphertext.length() < kEncryptionVersionPrefixLength ||
+      !base::StartsWith(ciphertext, kEncryptionVersionPrefix)) {
+    // Not encrypted with v10, might be plaintext or old format
+    *plaintext = ciphertext;
+    return true;
+  }
+
+  // Extract the actual encrypted data (skip "v10" prefix)
+  auto ciphertext_span = base::as_byte_span(ciphertext);
+  auto encrypted_span = ciphertext_span.subspan(kEncryptionVersionPrefixLength);
+  const uint8_t* encrypted_data = encrypted_span.data();
+  size_t encrypted_length = encrypted_span.size();
+
+  if (encrypted_length == 0) {
+    LOG(WARNING) << "wayfinder: Empty ciphertext after prefix";
+    return false;
+  }
+
+  // Convert key string to vector
+  std::vector<uint8_t> key_bytes(key.begin(), key.end());
+
+  return DecryptAesCbc(key_bytes, encrypted_data, encrypted_length, plaintext);
+}
+
+}  // namespace wayfinder_importer
+
+#endif  // BUILDFLAG(IS_MAC)
