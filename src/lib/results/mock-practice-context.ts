import "server-only";

import type { StructuralProfile } from "@/lib/generation/novelty";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export async function getMockPracticeContext(userId: string, attemptId: string): Promise<{
  fingerprints: string[];
  structuralProfiles: StructuralProfile[];
}> {
  const admin = createSupabaseAdminClient();
  const { data: attempt } = await admin.from("test_attempts").select("id")
    .eq("id", attemptId).eq("user_id", userId)
    .in("status", ["submitted", "auto_submitted"]).maybeSingle();
  if (!attempt) throw new Error("The source mock is unavailable.");
  const { data: items, error } = await admin.from("practice_attempt_items")
    .select("fingerprint, private_snapshot").eq("attempt_id", attempt.id).limit(60);
  if (error) throw new Error("The source mock questions are unavailable.");
  return {
    fingerprints: (items ?? []).map((item) => String(item.fingerprint)),
    structuralProfiles: (items ?? []).flatMap((item) => {
      const provenance = record(record(item.private_snapshot)?.provenance);
      const profile = record(provenance?.structuralProfile);
      return profile ? [profile as StructuralProfile] : [];
    }),
  };
}
