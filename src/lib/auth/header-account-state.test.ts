import { describe, expect, it } from "vitest";

import { reconcileHeaderAccount } from "./header-account-state";

describe("header account reconciliation", () => {
  it("transitions to logged out when the browser session is signed out", () => {
    expect(reconcileHeaderAccount({
      userId: "user-1",
      displayName: "Sai",
      workspace: null,
    }, null)).toBeNull();
  });

  it("creates authenticated navigation state after sign in", () => {
    expect(reconcileHeaderAccount(null, {
      id: "user-1",
      email: "sai@example.com",
      user_metadata: { display_name: "Sai" },
    })).toEqual({
      userId: "user-1",
      displayName: "Sai",
      workspace: null,
    });
  });

  it("keeps an authenticated account and server role during token refresh", () => {
    expect(reconcileHeaderAccount({
      userId: "user-1",
      displayName: "Sai",
      workspace: "admin",
    }, {
      id: "user-1",
      email: "sai@example.com",
      user_metadata: { display_name: "Different metadata" },
    })).toEqual({
      userId: "user-1",
      displayName: "Sai",
      workspace: "admin",
    });
  });
});
