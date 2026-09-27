import "server-only";

import { unstable_cache } from "next/cache";

import {
  moderationUpdate,
  publicStudentName,
  type FeedbackRecord,
  type PublicTestimonial,
} from "@/lib/feedback/model";
import type { FeedbackModerationInput, FeedbackStatus, StudentFeedbackInput } from "@/lib/feedback/schemas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const FEEDBACK_COLUMNS = "id, user_id, rating, liked_most, improvements, public_consent, status, is_featured, testimonial_public, created_at, updated_at, reviewed_at, reviewed_by";
const PUBLIC_FEEDBACK_COLUMNS = "id, user_id, rating, public_consent, status, is_featured, testimonial_public, created_at";
export const TESTIMONIAL_CACHE_TAG = "public-student-testimonials";

type ProfileName = { id: string; display_name: string | null; full_name: string | null };
type PublicFeedbackSource = Pick<
  FeedbackRecord,
  | "id"
  | "user_id"
  | "rating"
  | "public_consent"
  | "status"
  | "is_featured"
  | "testimonial_public"
  | "created_at"
>;

export class FeedbackAlreadySubmittedError extends Error {
  constructor() {
    super("FEEDBACK_ALREADY_SUBMITTED");
  }
}

export type StudentFeedbackSubmission = {
  id: string;
  public_consent: boolean;
};

export async function getStudentFeedbackSubmission(userId: string): Promise<StudentFeedbackSubmission | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("student_feedback")
    .select("id, public_consent")
    .eq("user_id", userId)
    .maybeSingle()
    .overrideTypes<StudentFeedbackSubmission, { merge: false }>();
  if (error) throw new Error("Unable to load feedback.");
  return data;
}

export async function createStudentFeedback(userId: string, input: StudentFeedbackInput) {
  const supabase = await createSupabaseServerClient();
  const values = {
    rating: input.rating,
    liked_most: input.likedMost,
    improvements: input.improvements,
    public_consent: input.publicConsent,
  };
  const { data, error } = await supabase
    .from("student_feedback")
    .insert({ user_id: userId, ...values })
    .select(FEEDBACK_COLUMNS)
    .single()
    .overrideTypes<FeedbackRecord, { merge: false }>();
  if (error || !data) {
    if (error?.code === "23505") throw new FeedbackAlreadySubmittedError();
    throw new Error("Unable to save feedback.");
  }
  return data;
}

export type AdminFeedbackItem = FeedbackRecord & { studentName: string };

export async function getAdminFeedback(status: FeedbackStatus): Promise<AdminFeedbackItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("student_feedback")
    .select(FEEDBACK_COLUMNS)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100)
    .overrideTypes<FeedbackRecord[], { merge: false }>();
  if (error) throw new Error("Unable to load student feedback.");
  const feedback = data ?? [];
  if (!feedback.length) return [];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, full_name")
    .in("id", feedback.map((item) => item.user_id))
    .overrideTypes<ProfileName[], { merge: false }>();
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return feedback.map((item) => {
    const profile = profileById.get(item.user_id);
    const name = profile?.display_name?.trim() || profile?.full_name?.trim();
    return { ...item, studentName: name || `Student ${item.user_id.slice(0, 8)}` };
  });
}

export async function moderateFeedback(
  adminId: string,
  input: FeedbackModerationInput,
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("student_feedback")
    .select(FEEDBACK_COLUMNS)
    .eq("id", input.feedbackId)
    .maybeSingle()
    .overrideTypes<FeedbackRecord, { merge: false }>();
  if (error || !data) throw new Error("FEEDBACK_NOT_FOUND");
  const update = moderationUpdate(data, input, adminId, new Date().toISOString());
  const { data: updated, error: updateError } = await supabase
    .from("student_feedback")
    .update(update)
    .eq("id", input.feedbackId)
    .select(FEEDBACK_COLUMNS)
    .single()
    .overrideTypes<FeedbackRecord, { merge: false }>();
  if (updateError || !updated) throw new Error("FEEDBACK_UPDATE_FAILED");
  return updated;
}

export function toPublicTestimonials(
  feedback: PublicFeedbackSource[],
  profiles: ProfileName[],
): PublicTestimonial[] {
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  return feedback
    .filter((item) => item.status === "approved"
      && item.public_consent
      && item.is_featured
      && Boolean(item.testimonial_public?.trim()))
    .slice(0, 3)
    .map((item) => {
      const profile = profileById.get(item.user_id);
      return {
        id: item.id,
        rating: item.rating,
        testimonial: item.testimonial_public!.trim(),
        displayName: publicStudentName(profile?.display_name ?? null, profile?.full_name ?? null),
        createdAt: item.created_at,
      };
    });
}

const getPublicTestimonialsBase = unstable_cache(
  async (): Promise<PublicTestimonial[]> => {
    let admin: ReturnType<typeof createSupabaseAdminClient>;
    try {
      admin = createSupabaseAdminClient();
    } catch {
      console.error("[feedback.public_testimonials] failed", { stage: "admin_client" });
      return [];
    }
    const { data, error } = await admin
      .from("student_feedback")
      .select(PUBLIC_FEEDBACK_COLUMNS)
      .eq("status", "approved")
      .eq("public_consent", true)
      .eq("is_featured", true)
      .not("testimonial_public", "is", null)
      .order("created_at", { ascending: false })
      .limit(3)
      .overrideTypes<PublicFeedbackSource[], { merge: false }>();
    if (error) {
      console.error("[feedback.public_testimonials] failed", {
        stage: "feedback_query",
        code: error.code || "unknown",
      });
      return [];
    }
    if (!data?.length) return [];
    const { data: profiles, error: profileError } = await admin
      .from("profiles")
      .select("id, display_name, full_name")
      .in("id", data.map((item) => item.user_id))
      .overrideTypes<ProfileName[], { merge: false }>();
    if (profileError) {
      console.error("[feedback.public_testimonials] profile enrichment failed", {
        code: profileError.code || "unknown",
      });
    }
    return toPublicTestimonials(data, profiles ?? []);
  },
  [TESTIMONIAL_CACHE_TAG],
  { revalidate: 300, tags: [TESTIMONIAL_CACHE_TAG] },
);

export function getPublicTestimonials() {
  return getPublicTestimonialsBase();
}
