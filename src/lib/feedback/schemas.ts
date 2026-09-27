import { z } from "zod";

const optionalShortText = z.string().trim().max(200).transform((value) => value || null);
const optionalStudentFeedbackText = z.string().trim().max(200).optional().transform((value) => value || null);
const requiredStudentFeedbackText = z.string().trim().min(1).max(200);

export const studentFeedbackInputSchema = z.object({
  rating: z.number().int().min(1).max(5),
  likedMost: requiredStudentFeedbackText,
  improvements: optionalStudentFeedbackText,
  publicConsent: z.boolean(),
}).strict();

export const feedbackStatusSchema = z.enum(["pending", "approved", "rejected"]);

export const feedbackModerationInputSchema = z.discriminatedUnion("action", [
  z.object({ feedbackId: z.string().uuid(), action: z.literal("approve") }),
  z.object({ feedbackId: z.string().uuid(), action: z.literal("reject") }),
  z.object({ feedbackId: z.string().uuid(), action: z.literal("feature") }),
  z.object({ feedbackId: z.string().uuid(), action: z.literal("unfeature") }),
  z.object({
    feedbackId: z.string().uuid(),
    action: z.literal("edit_testimonial"),
    testimonialPublic: optionalShortText,
  }),
]);

export type StudentFeedbackInput = z.infer<typeof studentFeedbackInputSchema>;
export type FeedbackStatus = z.infer<typeof feedbackStatusSchema>;
export type FeedbackModerationInput = z.infer<typeof feedbackModerationInputSchema>;
