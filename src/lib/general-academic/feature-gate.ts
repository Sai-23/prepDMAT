import "server-only";

import { notFound } from "next/navigation";

/** Server enforcement fails closed without loading unrelated environment config. */
export function isGeneralAcademicEnabled(): boolean {
  return process.env.GENERAL_ACADEMIC_ENABLED === "true";
}

/** UI visibility is independent; it is never the security boundary. */
export function isGeneralAcademicUiEnabled(): boolean {
  return isGeneralAcademicEnabled()
    && process.env.NEXT_PUBLIC_GENERAL_ACADEMIC_ENABLED === "true";
}

export function requireGeneralAcademicEnabled(): void {
  if (!isGeneralAcademicEnabled()) notFound();
}

export const GENERAL_ACADEMIC_UNAVAILABLE = "General Academic is not available yet.";
