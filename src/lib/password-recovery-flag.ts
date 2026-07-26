export const PASSWORD_RECOVERY_FLAG_KEY = "pw_recovery";

export function rememberPasswordRecovery() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PASSWORD_RECOVERY_FLAG_KEY, "1");
  } catch {
    // Storage can be unavailable in hardened browser modes; the component-level
    // PASSWORD_RECOVERY listener and hash check remain as fallbacks.
  }
}

export function clearPasswordRecoveryFlag() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(PASSWORD_RECOVERY_FLAG_KEY);
  } catch {
    // Ignore storage failures; this flag is only a race-condition bridge.
  }
}

export function consumePasswordRecoveryFlag() {
  if (typeof window === "undefined") return false;
  try {
    const hasFlag = window.sessionStorage.getItem(PASSWORD_RECOVERY_FLAG_KEY) === "1";
    if (hasFlag) window.sessionStorage.removeItem(PASSWORD_RECOVERY_FLAG_KEY);
    return hasFlag;
  } catch {
    return false;
  }
}