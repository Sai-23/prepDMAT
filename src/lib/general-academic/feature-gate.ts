import "server-only";

import { notFound } from "next/navigation";

import { getEnv } from "@/lib/validators/env";

/** Both switches must be enabled; the public switch is never the enforcement boundary. */
export function isGeneralAcademicEnabled(): boolean {
  const env = getEnv();
  return env.GENERAL_ACADEMIC_ENABLED && env.NEXT_PUBLIC_GENERAL_ACADEMIC_ENABLED;
}

export function requireGeneralAcademicEnabled(): void {
  if (!isGeneralAcademicEnabled()) notFound();
}

export const GENERAL_ACADEMIC_UNAVAILABLE = "General Academic is not available yet.";
