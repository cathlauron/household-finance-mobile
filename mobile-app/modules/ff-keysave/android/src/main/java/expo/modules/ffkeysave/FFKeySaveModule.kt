package expo.modules.ffkeysave

import androidx.credentials.CreatePasswordRequest
import androidx.credentials.CredentialManager
import androidx.credentials.exceptions.CreateCredentialCancellationException
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

// Version 3.2 (mockup R1, Cath 2026-10-30): "Save to password manager" for the Secret
// Recovery Key. The phone shows its own "Save password?" question; nothing is saved unless
// the person taps Save there. Expo Go doesn't have this module, so the button is hidden there.
class FFKeySaveModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("FFKeySave")

    AsyncFunction("savePassword") { id: String, password: String, promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.reject("NO_SCREEN", "The app isn't on screen.", null)
        return@AsyncFunction
      }
      CoroutineScope(Dispatchers.Main).launch {
        try {
          CredentialManager.create(activity).createCredential(activity, CreatePasswordRequest(id, password))
          promise.resolve("saved")
        } catch (e: CreateCredentialCancellationException) {
          promise.resolve("cancelled")
        } catch (e: Exception) {
          promise.reject("SAVE_FAILED", e.message ?: "Couldn't save it.", e)
        }
      }
    }
  }
}
