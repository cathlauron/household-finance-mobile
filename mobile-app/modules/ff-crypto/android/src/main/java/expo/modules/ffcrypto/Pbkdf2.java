package expo.modules.ffcrypto;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

// Version 2.2 (Cath chose "best of both" for opening speed): the slow "stretch the
// password into the key" step, done by the phone itself instead of in JavaScript.
// Standard PBKDF2 with HMAC-SHA256 (RFC 8018), so it gives exactly the same key as
// the JavaScript version (crypto-js) for the same password, salt and count. The app
// checks that it matches before using it, and falls back to JavaScript if it doesn't.
final class Pbkdf2 {
  private Pbkdf2() {}

  static byte[] hmacSha256(byte[] password, byte[] salt, int iterations, int keyLength) throws Exception {
    if (password == null || password.length == 0) throw new IllegalArgumentException("Empty password");
    if (salt == null || iterations < 1 || keyLength < 1) throw new IllegalArgumentException("Bad parameters");
    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(password, "HmacSHA256"));
    int hLen = mac.getMacLength();
    int blocks = (keyLength + hLen - 1) / hLen;
    byte[] out = new byte[keyLength];
    byte[] u = new byte[hLen];
    byte[] t = new byte[hLen];
    for (int block = 1; block <= blocks; block++) {
      // U1 = HMAC(password, salt || INT(block))
      mac.update(salt);
      mac.update(new byte[] { (byte) (block >>> 24), (byte) (block >>> 16), (byte) (block >>> 8), (byte) block });
      mac.doFinal(u, 0);
      System.arraycopy(u, 0, t, 0, hLen);
      // U2..Uc, each folded into T with XOR
      for (int i = 1; i < iterations; i++) {
        mac.update(u);
        mac.doFinal(u, 0);
        for (int j = 0; j < hLen; j++) t[j] ^= u[j];
      }
      int offset = (block - 1) * hLen;
      System.arraycopy(t, 0, out, offset, Math.min(hLen, keyLength - offset));
    }
    return out;
  }
}
