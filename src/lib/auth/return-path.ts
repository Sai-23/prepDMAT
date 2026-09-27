import type { Route } from "next";

const MAX_RETURN_PATH_LENGTH = 2_048;
const AUTH_DESTINATIONS = [
  "/auth",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
] as const;

function decodedForInspection(value: string) {
  let decoded = value;
  for (let pass = 0; pass < 3; pass += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) return decoded;
      decoded = next;
    } catch {
      return null;
    }
  }
  return decoded;
}

function isAuthDestination(pathname: string) {
  return AUTH_DESTINATIONS.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function getSafeReturnPath(value: unknown): Route | null {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_RETURN_PATH_LENGTH) return null;
  if (!value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) return null;

  const inspected = decodedForInspection(value);
  if (!inspected || !inspected.startsWith("/") || inspected.startsWith("//")) return null;
  if (/[\\\u0000-\u001f\u007f]/.test(inspected)) return null;

  const base = new URL("https://return-path.invalid");
  let destination: URL;
  let inspectedDestination: URL;
  try {
    destination = new URL(value, base);
    inspectedDestination = new URL(inspected, base);
  } catch {
    return null;
  }
  if (destination.origin !== base.origin || inspectedDestination.origin !== base.origin) return null;
  if (isAuthDestination(inspectedDestination.pathname)) return null;
  // Next's generated Route type cannot infer a value proven safe at runtime.
  // Keep the assertion at this validation boundary so callers never cast query input.
  return `${destination.pathname}${destination.search}${destination.hash}` as Route;
}

export function loginPath(value: unknown): "/login" | `/login?next=${string}` {
  const returnPath = getSafeReturnPath(value);
  return returnPath ? `/login?next=${encodeURIComponent(returnPath)}` : "/login";
}

export function registerPath(value: unknown): "/register" | `/register?next=${string}` {
  const returnPath = getSafeReturnPath(value);
  return returnPath ? `/register?next=${encodeURIComponent(returnPath)}` : "/register";
}

export function googleAuthPath(value: unknown): "/auth/google" | `/auth/google?next=${string}` {
  const returnPath = getSafeReturnPath(value);
  return returnPath ? `/auth/google?next=${encodeURIComponent(returnPath)}` : "/auth/google";
}
