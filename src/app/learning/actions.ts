"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/guards";
import { saveMistakeEntry, setBookmark } from "@/lib/learning/data";
import { safeActionFailure } from "@/lib/security/public-errors";
import {
  bookmarkMutationSchema,
  mistakeEntrySchema,
} from "@/lib/learning/schemas";

export async function toggleBookmarkAction(input: unknown) {
  const user = await requireUser();
  const parsed = bookmarkMutationSchema.safeParse(input);
  if (!parsed.success) return { error: "The bookmark request is invalid." };

  try {
    await setBookmark(
      user.id,
      parsed.data.questionId,
      parsed.data.bookmarked,
    );
    revalidatePath("/bookmarks");
    revalidatePath("/results");
    return { error: null, bookmarked: parsed.data.bookmarked };
  } catch (error) {
    return safeActionFailure(error, "Unable to update this bookmark.");
  }
}

export async function saveMistakeEntryAction(input: unknown) {
  const user = await requireUser();
  const parsed = mistakeEntrySchema.safeParse(input);
  if (!parsed.success) {
    return {
      error:
        parsed.error.flatten().fieldErrors.note?.[0] ??
        "The notebook entry is invalid.",
    };
  }

  try {
    await saveMistakeEntry(user.id, parsed.data);
    revalidatePath("/mistakes");
    return {
      error: null,
      note: parsed.data.note,
      isUnderstood: parsed.data.isUnderstood,
    };
  } catch (error) {
    return safeActionFailure(error, "Unable to save this entry.");
  }
}
