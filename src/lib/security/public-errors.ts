export type PublicActionErrorCode =
  | "AUTH_REQUIRED"
  | "INVALID_CREDENTIALS"
  | "EMAIL_NOT_VERIFIED"
  | "INVALID_REQUEST"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "ACTION_FAILED"
  | "TEMPORARILY_UNAVAILABLE";

export type PublicActionFailure = {
  error: string;
  errorCode: PublicActionErrorCode;
};

export class PublicActionError extends Error {
  constructor(
    readonly errorCode: PublicActionErrorCode,
    readonly publicMessage: string,
  ) {
    super(publicMessage);
  }
}

export function publicActionFailure(
  errorCode: PublicActionErrorCode,
  error: string,
): PublicActionFailure {
  return { error, errorCode };
}

export function safeActionFailure(
  internalError: unknown,
  error: string,
  errorCode: PublicActionErrorCode = "ACTION_FAILED",
): PublicActionFailure {
  if (internalError instanceof PublicActionError) {
    return publicActionFailure(internalError.errorCode, internalError.publicMessage);
  }
  // Unknown database/provider messages can contain schema details and must
  // never cross an action boundary.
  return publicActionFailure(errorCode, error);
}
