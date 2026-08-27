import { BookmarksLibrary } from "@/components/learning/bookmarks-library";
import { PageShell } from "@/components/layout/page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { requireUser } from "@/lib/auth/guards";
import { getBookmarks } from "@/lib/learning/data";

export default async function BookmarksPage() {
  const user = await requireUser();
  let bookmarks = null;
  let loadError: string | null = null;

  try {
    bookmarks = await getBookmarks(user.id);
  } catch {
    loadError = "Unable to load your bookmarks.";
  }

  return (
    <PageShell
      eyebrow="Bookmarks"
      title="Your saved question library"
      description="Search and filter saved questions, remove items you no longer need, or launch an exact-question practice session."
    >
      {loadError || !bookmarks ? (
        <ErrorState
          title="Bookmarks unavailable"
          description={loadError ?? "Unable to load your bookmarks."}
        />
      ) : bookmarks.length === 0 ? (
        <EmptyState
          title="No bookmarks yet"
          description="Save questions from a completed result or your mistake notebook and they will appear here."
        />
      ) : (
        <BookmarksLibrary initialBookmarks={bookmarks} />
      )}
    </PageShell>
  );
}
