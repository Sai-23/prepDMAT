export const VERIFICATION_POLL_INTERVAL_MS = 8_000;
export const VERIFICATION_MAX_POLLS = 15;

type VerificationMonitorOptions = {
  checkAuthenticated: () => Promise<boolean>;
  subscribeToAuthChanges: (notify: () => void) => () => void;
  onCheckingChange: (checking: boolean) => void;
  onTimeout: () => void;
  onVerified: () => void;
};

export function startVerificationMonitor({
  checkAuthenticated,
  subscribeToAuthChanges,
  onCheckingChange,
  onTimeout,
  onVerified,
}: VerificationMonitorOptions) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => undefined;
  }

  let checking = false;
  let completed = false;
  let disposed = false;
  let pollCount = 0;
  let timedOut = false;

  const check = async () => {
    if (checking || completed || disposed) return;
    checking = true;
    onCheckingChange(true);
    try {
      const authenticated = await checkAuthenticated();
      if (disposed) return;
      if (authenticated) {
        completed = true;
        onVerified();
      }
    } catch {
      // A transient status check must leave the verification screen usable.
    } finally {
      checking = false;
      if (!completed && !disposed) onCheckingChange(false);
    }
  };

  const onFocus = () => void check();
  const onVisibility = () => {
    if (document.visibilityState === "visible") void check();
  };
  const unsubscribe = subscribeToAuthChanges(() => void check());

  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onVisibility);
  const interval = window.setInterval(() => {
    pollCount += 1;
    if (pollCount >= VERIFICATION_MAX_POLLS) {
      window.clearInterval(interval);
      if (!completed && !disposed && !timedOut) {
        timedOut = true;
        onTimeout();
      }
      return;
    }
    void check();
  }, VERIFICATION_POLL_INTERVAL_MS);

  void check();

  return () => {
    disposed = true;
    window.clearInterval(interval);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onVisibility);
    unsubscribe();
  };
}
