import Link from "next/link";

import { GeneralAcademicLearningLibrary } from "@/components/general-academic/learning-library";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";
import { requireGeneralAcademicEnabled } from "@/lib/general-academic/feature-gate";
import { getGeneralAcademicBookmarks } from "@/lib/general-academic/learning-data";

export default async function GeneralAcademicBookmarksPage() {
  const user = await requireUser();
  requireGeneralAcademicEnabled();
  const bookmarks = await getGeneralAcademicBookmarks(user.id);
  return <PageShell eyebrow="General Academic" title="Bookmarks" description="Review saved questions together with the academic source they depend on.">{bookmarks.length ? <GeneralAcademicLearningLibrary items={bookmarks} kind="bookmarks" /> : <Card><CardContent className="p-8 text-center"><h2 className="text-xl font-semibold">No General Academic bookmarks yet</h2><p className="mt-2 text-sm text-muted-foreground">Bookmark useful questions while reviewing completed practice.</p><Button asChild className="mt-5"><Link href="/practice/general-academic">Start GAM Practice</Link></Button></CardContent></Card>}</PageShell>;
}
