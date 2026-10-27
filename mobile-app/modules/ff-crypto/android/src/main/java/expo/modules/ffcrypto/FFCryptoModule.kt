package expo.modules.ffcrypto

import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Version 2.2: fast password-to-key step for the installed app (see Pbkdf2.java).
// Expo Go doesn't have this, so there the app keeps using the JavaScript version.
class FFCryptoModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("FFCrypto")

    Function("pbkdf2Sha256") { passwordBase64: String, saltBase64: String, iterations: Int, keyLength: Int ->
      val password = Base64.decode(passwordBase64, Base64.DEFAULT)
      val salt = Base64.decode(saltBase64, Base64.DEFAULT)
      val key = Pbkdf2.hmacSha256(password, salt, iterations, keyLength)
      Base64.encodeToString(key, Base64.NO_WRAP)
    }
  }
}
