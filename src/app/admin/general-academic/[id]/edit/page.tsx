import { notFound } from "next/navigation";
import type { Route } from "next";
import Link from "next/link";

import { GeneralAcademicEditor } from "@/components/admin/general-academic-editor";
import { GeneralAcademicPreview } from "@/components/admin/general-academic-preview";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/guards";
import { fetchGeneralAcademicPackForAdmin } from "@/lib/general-academic/persistence";

export default async function EditGeneralAcademicPackPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, roles } = await requireRole(["admin"]);
  const { id } = await params;
  const stored = await fetchGeneralAcademicPackForAdmin(id, user.id);
  if (!stored) notFound();
  if (stored.pack.review.status !== "draft") {
    return <PageShell eyebrow="General Academic" title={stored.pack.title} description="Only draft packs can be edited. Published content is locked; archive it and create a new draft for revisions." admin roles={roles}><div className="space-y-5"><Button asChild><Link href={`/admin/general-academic/${stored.id}/review` as Route}>Open review</Link></Button><GeneralAcademicPreview pack={stored.pack} /></div></PageShell>;
  }
  return <PageShell eyebrow="General Academic" title={`Edit ${stored.pack.title}`} description="Update canonical draft content. Saving never bypasses review or approval." admin roles={roles}><GeneralAcademicEditor initialPack={stored.pack} mode="edit" packId={stored.id} /></PageShell>;
}
