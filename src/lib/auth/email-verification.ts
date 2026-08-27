export type EmailVerificationOtpType =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "email";

export function parseEmailVerificationOtpType(
  value: string | null,
): EmailVerificationOtpType | null {
  switch (value) {
    case "signup":
    case "invite":
    case "magiclink":
    case "recovery":
    case "email_change":
    case "email":
      return value;
    default:
      return null;
  }
}

export function maskEmailAddress(email: string) {
  const separator = email.lastIndexOf("@");
  if (separator <= 0 || separator === email.length - 1) return "your email address";

  const local = email.slice(0, separator);
  const domain = email.slice(separator + 1);
  if (local.length <= 2) return `${local.slice(0, 1)}***@${domain}`;
  if (local.length <= 4) return `${local.slice(0, 1)}***${local.slice(-1)}@${domain}`;
  return `${local.slice(0, 2)}***${local.slice(-2)}@${domain}`;
}

