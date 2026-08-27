import { describe, expect, it } from "vitest";

import {
  classifyRateLimitDatabaseFailure,
  rateLimitActionState,
  RateLimitExceededError,
} from "./rate-limit";

describe("rate-limit failure diagnostics", () => {
  it.each([
    ["PGRST202", "database_object_unavailable"],
    ["42P01", "database_object_unavailable"],
    ["42883", "database_contract_invalid"],
    ["42804", "database_contract_invalid"],
    ["42501", "database_permission_denied"],
    [undefined, "database_request_failed"],
  ] as const)("classifies %s without forwarding database text", (code, expected) => {
    expect(classifyRateLimitDatabaseFailure(code)).toBe(expected);
  });

  it("keeps an internal database failure generic at the public boundary", () => {
    const result = rateLimitActionState(
      new Error("operator does not exist: timestamp with time zone <= time with time zone"),
    );

    expect(result).toEqual({
      status: "error",
      code: "TEMPORARILY_UNAVAILABLE",
      message: "This action is temporarily unavailable. Try again shortly.",
    });
    expect(JSON.stringify(result)).not.toMatch(/operator|timestamp|database|rpc/i);
  });

  it("keeps an intentional rate rejection distinct from infrastructure failure", () => {
    expect(rateLimitActionState(new RateLimitExceededError(12))).toEqual({
      status: "error",
      code: "RATE_LIMITED",
      message: "Too many attempts. Wait before trying again.",
      retryAfterSeconds: 12,
    });
  });
});

