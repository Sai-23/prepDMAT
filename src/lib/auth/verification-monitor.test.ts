import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  startVerificationMonitor,
  VERIFICATION_MAX_POLLS,
  VERIFICATION_POLL_INTERVAL_MS,
} from "./verification-monitor";

type TestWindow = EventTarget & {
  setInterval: typeof setInterval;
  clearInterval: typeof clearInterval;
};

describe("verification monitor", () => {
  let testWindow: TestWindow;
  let testDocument: EventTarget & { visibilityState: string };

  beforeEach(() => {
    vi.useFakeTimers();
    testWindow = Object.assign(new EventTarget(), { setInterval, clearInterval });
    testDocument = Object.assign(new EventTarget(), { visibilityState: "visible" });
    vi.stubGlobal("window", testWindow);
    vi.stubGlobal("document", testDocument);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("detects a cross-tab auth event, verifies it with getUser semantics, and completes once", async () => {
    let authenticated = false;
    let authNotification: () => void = () => {};
    const onVerified = vi.fn();
    const checkAuthenticated = vi.fn(async () => authenticated);
    const cleanup = startVerificationMonitor({
      checkAuthenticated,
      subscribeToAuthChanges: (notify) => {
        authNotification = notify;
        return vi.fn();
      },
      onCheckingChange: vi.fn(),
      onVerified,
    });
    await vi.advanceTimersByTimeAsync(0);

    authenticated = true;
    authNotification();
    await vi.advanceTimersByTimeAsync(0);
    authNotification();
    await vi.advanceTimersByTimeAsync(0);

    expect(onVerified).toHaveBeenCalledOnce();
    cleanup();
  });

  it("rechecks when the original tab regains focus or visibility", async () => {
    let authenticated = false;
    const onVerified = vi.fn();
    const cleanup = startVerificationMonitor({
      checkAuthenticated: async () => authenticated,
      subscribeToAuthChanges: () => vi.fn(),
      onCheckingChange: vi.fn(),
      onVerified,
    });
    await vi.advanceTimersByTimeAsync(0);

    authenticated = true;
    testWindow.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(0);

    expect(onVerified).toHaveBeenCalledOnce();
    cleanup();
  });

  it("bounds background polling and cleans up all listeners", async () => {
    const unsubscribe = vi.fn();
    const checkAuthenticated = vi.fn(async () => false);
    const cleanup = startVerificationMonitor({
      checkAuthenticated,
      subscribeToAuthChanges: () => unsubscribe,
      onCheckingChange: vi.fn(),
      onVerified: vi.fn(),
    });

    await vi.advanceTimersByTimeAsync(VERIFICATION_POLL_INTERVAL_MS * (VERIFICATION_MAX_POLLS + 2));
    const callsAfterBound = checkAuthenticated.mock.calls.length;
    await vi.advanceTimersByTimeAsync(VERIFICATION_POLL_INTERVAL_MS * 5);

    expect(callsAfterBound).toBe(VERIFICATION_MAX_POLLS);
    expect(checkAuthenticated).toHaveBeenCalledTimes(callsAfterBound);
    cleanup();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
