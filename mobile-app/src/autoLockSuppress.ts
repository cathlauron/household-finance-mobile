// Temporarily tells the app's auto-lock logic to ignore "the app went to the
// background" — used for the brief moment a native picker (like the photo
// library) is on top of the app, which the OS reports the same way as if
// the person had actually left the app. Without this, opening the photo
// picker would immediately trigger the lock screen.
//
// Safety net: if the suppression is ever left on by mistake (e.g. a crash
// mid-picker), it automatically expires after 60 seconds so the app can
// never get stuck unable to lock.

let suppressed = false;
let safetyTimer: ReturnType<typeof setTimeout> | null = null;

export function setAutoLockSuppressed(value: boolean): void {
  suppressed = value;
  if (safetyTimer) {
    clearTimeout(safetyTimer);
    safetyTimer = null;
  }
  if (value) {
    safetyTimer = setTimeout(() => {
      suppressed = false;
      safetyTimer = null;
    }, 60000);
  }
}

export function isAutoLockSuppressed(): boolean {
  return suppressed;
}
