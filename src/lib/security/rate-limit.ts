import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { headers } from "next/headers";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getEnv } from "@/lib/validators/env";

export type SecurityRateLimitOperation =
  | "auth:login"
  | "auth:signup"
  | "auth:email-verify"
  | "auth:resend"
  | "auth:password-reset"
  | "auth:phone-request"
  | "auth:phone-verify"
  | "auth:google"
  | "generation:practice"
  | "generation:diagnostic"
  | "generation:public-diagnostic"
  | "generation:mock"
  | "assessment:answer"
  | "assessment:public-diagnostic"
  | "assessment:public-diagnostic-claim"
  | "assessment:mock-start"
  | "assessment:mock-write"
  | "learning:mutation"
  | "learning:report";

type RateLimitRule = { maxAttempts: number; windowSeconds: number };
type RateLimitPolicy = {
  global: RateLimitRule;
  account?: RateLimitRule;
  user?: RateLimitRule;
  ip?: RateLimitRule;
};

const POLICIES: Record<SecurityRateLimitOperation, RateLimitPolicy> = {
  "auth:login": {
    global: { maxAttempts: 500, windowSeconds: 60 },
    account: { maxAttempts: 10, windowSeconds: 900 },
    ip: { maxAttempts: 20, windowSeconds: 900 },
  },
  "auth:signup": {
    global: { maxAttempts: 100, windowSeconds: 60 },
    account: { maxAttempts: 10, windowSeconds: 3600 },
    ip: { maxAttempts: 10, windowSeconds: 3600 },
  },
  "auth:email-verify": {
    global: { maxAttempts: 300, windowSeconds: 60 },
    account: { maxAttempts: 10, windowSeconds: 900 },
    ip: { maxAttempts: 30, windowSeconds: 900 },
  },
  "auth:resend": {
    global: { maxAttempts: 100, windowSeconds: 60 },
    account: { maxAttempts: 10, windowSeconds: 3600 },
    ip: { maxAttempts: 10, windowSeconds: 3600 },
  },
  "auth:password-reset": {
    global: { maxAttempts: 100, windowSeconds: 60 },
    account: { maxAttempts: 10, windowSeconds: 3600 },
    ip: { maxAttempts: 10, windowSeconds: 3600 },
  },
  "auth:phone-request": {
    global: { maxAttempts: 50, windowSeconds: 60 },
    account: { maxAttempts: 3, windowSeconds: 3600 },
    ip: { maxAttempts: 5, windowSeconds: 3600 },
  },
  "auth:phone-verify": {
    global: { maxAttempts: 300, windowSeconds: 60 },
    account: { maxAttempts: 10, windowSeconds: 900 },
    ip: { maxAttempts: 30, windowSeconds: 900 },
  },
  "auth:google": {
    global: { maxAttempts: 300, windowSeconds: 60 },
    ip: { maxAttempts: 20, windowSeconds: 900 },
  },
  "generation:practice": {
    global: { maxAttempts: 120, windowSeconds: 60 },
    user: { maxAttempts: 20, windowSeconds: 3600 },
    ip: { maxAttempts: 30, windowSeconds: 3600 },
  },
  "generation:diagnostic": {
    global: { maxAttempts: 60, windowSeconds: 60 },
    user: { maxAttempts: 3, windowSeconds: 86400 },
    ip: { maxAttempts: 10, windowSeconds: 3600 },
  },
  "generation:public-diagnostic": {
    global: { maxAttempts: 100, windowSeconds: 60 },
    ip: { maxAttempts: 5, windowSeconds: 3600 },
  },
  "generation:mock": {
    global: { maxAttempts: 10, windowSeconds: 60 },
    user: { maxAttempts: 2, windowSeconds: 3600 },
    ip: { maxAttempts: 4, windowSeconds: 3600 },
  },
  "assessment:answer": {
    global: { maxAttempts: 5000, windowSeconds: 60 },
    user: { maxAttempts: 600, windowSeconds: 3600 },
    ip: { maxAttempts: 1200, windowSeconds: 3600 },
  },
  "assessment:public-diagnostic": {
    global: { maxAttempts: 3000, windowSeconds: 60 },
    ip: { maxAttempts: 120, windowSeconds: 3600 },
  },
  "assessment:public-diagnostic-claim": {
    global: { maxAttempts: 300, windowSeconds: 60 },
    user: { maxAttempts: 10, windowSeconds: 3600 },
    ip: { maxAttempts: 30, windowSeconds: 3600 },
  },
  "assessment:mock-start": {
    global: { maxAttempts: 300, windowSeconds: 60 },
    user: { maxAttempts: 20, windowSeconds: 3600 },
    ip: { maxAttempts: 50, windowSeconds: 3600 },
  },
  "assessment:mock-write": {
    global: { maxAttempts: 5000, windowSeconds: 60 },
    user: { maxAttempts: 600, windowSeconds: 3600 },
    ip: { maxAttempts: 1200, windowSeconds: 3600 },
  },
  "learning:mutation": {
    global: { maxAttempts: 2000, windowSeconds: 60 },
    user: { maxAttempts: 300, windowSeconds: 3600 },
    ip: { maxAttempts: 600, windowSeconds: 3600 },
  },
  "learning:report": {
    global: { maxAttempts: 300, windowSeconds: 60 },
    user: { maxAttempts: 30, windowSeconds: 3600 },
    ip: { maxAttempts: 60, windowSeconds: 3600 },
  },
};

export class RateLimitExceededError extends Error {
  readonly code = "RATE_LIMITED" as const;

  constructor(readonly retryAfterSeconds: number) {
    super("The request rate limit was exceeded.");
  }
}

export class SecurityControlUnavailableError extends Error {
  readonly code = "TEMPORARILY_UNAVAILABLE" as const;

  constructor() {
    super("The shared security control is unavailable.");
  }
}

export function extractTrustedClientIp(
  requestHeaders: Pick<Headers, "get">,
  trustedHeader: "none" | "x-real-ip" | "x-forwarded-for" | "cf-connecting-ip",
) {
  if (trustedHeader === "none") return null;
  const rawValue = requestHeaders.get(trustedHeader)?.trim();
  if (!rawValue || rawValue.includes(",") || isIP(rawValue) === 0) return null;
  return rawValue.toLowerCase();
}

function subjectHash(secret: string, operation: string, kind: string, value: string) {
  return createHmac("sha256", secret)
    .update(`${operation}:${kind}:${value}`)
    .digest("hex");
}

type RateLimitRpcRow = {
  allowed: boolean;
  remaining: number;
  retry_after_seconds: number;
};

export type RateLimitFailureReason =
  | "database_object_unavailable"
  | "database_contract_invalid"
  | "database_permission_denied"
  | "database_request_failed";

export function classifyRateLimitDatabaseFailure(
  errorCode: string | null | undefined,
): RateLimitFailureReason {
  if (errorCode === "PGRST202" || errorCode === "42P01") {
    return "database_object_unavailable";
  }
  if (errorCode === "42883" || errorCode === "42804") {
    return "database_contract_invalid";
  }
  if (errorCode === "42501" || errorCode === "PGRST301") {
    return "database_permission_denied";
  }
  return "database_request_failed";
}

function logRateLimitFailure(
  operation: SecurityRateLimitOperation,
  reason: RateLimitFailureReason | "invalid_database_response" | "server_secret_unavailable",
) {
  console.error(`[${operation.replace(":", ".")}] failed`, {
    stage: "rate_limit",
    reason,
  });
}

async function consumeBatch(
  operation: SecurityRateLimitOperation,
  checks: Array<{
    kind: "global" | "account" | "user" | "ip";
    value: string;
    rule: RateLimitRule;
  }>,
  secret: string,
) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("consume_security_rate_limits", {
    p_checks: checks.map(({ kind, value, rule }) => ({
      scope: `${operation}:${kind}`,
      subject_hash: subjectHash(secret, operation, kind, value),
      max_attempts: rule.maxAttempts,
      window_seconds: rule.windowSeconds,
    })),
  });

  if (error) {
    logRateLimitFailure(operation, classifyRateLimitDatabaseFailure(error.code));
    throw new SecurityControlUnavailableError();
  }

  const row = (Array.isArray(data) ? data[0] : data) as RateLimitRpcRow | null;
  if (!row || typeof row.allowed !== "boolean") {
    logRateLimitFailure(operation, "invalid_database_response");
    throw new SecurityControlUnavailableError();
  }
  if (!row.allowed) {
    throw new RateLimitExceededError(Math.max(1, row.retry_after_seconds));
  }
}

export async function enforceSecurityRateLimit(
  operation: SecurityRateLimitOperation,
  identity: { account?: string; userId?: string } = {},
) {
  const env = getEnv();
  const secret = env.SECURITY_RATE_LIMIT_SECRET ?? env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    logRateLimitFailure(operation, "server_secret_unavailable");
    throw new SecurityControlUnavailableError();
  }

  const policy = POLICIES[operation];
  const requestHeaders = await headers();
  const clientIp = extractTrustedClientIp(requestHeaders, env.TRUSTED_CLIENT_IP_HEADER);
  const checks: Array<{
    kind: "global" | "account" | "user" | "ip";
    value: string;
    rule: RateLimitRule;
  }> = [{ kind: "global", value: "shared", rule: policy.global }];

  if (policy.account && identity.account) {
    checks.push({
      kind: "account",
      value: identity.account.trim().toLowerCase(),
      rule: policy.account,
    });
  }
  if (policy.user && identity.userId) {
    checks.push({ kind: "user", value: identity.userId, rule: policy.user });
  }
  if (policy.ip && clientIp) {
    checks.push({ kind: "ip", value: clientIp, rule: policy.ip });
  }

  // The database wrapper consumes these checks in order within one transaction.
  // Earlier buckets still consume capacity if a later bucket rejects, matching
  // the previous sequential fail-closed contract without multiple round trips.
  await consumeBatch(operation, checks, secret);
}

export function rateLimitActionState(error: unknown) {
  if (error instanceof RateLimitExceededError) {
    return {
      status: "error" as const,
      code: error.code,
      message: "Too many attempts. Wait before trying again.",
      retryAfterSeconds: error.retryAfterSeconds,
    };
  }
  return {
    status: "error" as const,
    code: "TEMPORARILY_UNAVAILABLE" as const,
    message: "This action is temporarily unavailable. Try again shortly.",
  };
}

export function rateLimitActionError(error: unknown) {
  const state = rateLimitActionState(error);
  return {
    error: state.message,
    errorCode: state.code,
    ...(state.retryAfterSeconds ? { retryAfterSeconds: state.retryAfterSeconds } : {}),
  };
}
