import { GeneralAcademicEditor } from "@/components/admin/general-academic-editor";
import { PageShell } from "@/components/layout/page-shell";
import { requireRole } from "@/lib/auth/guards";
import { createNewGeneralAcademicPack } from "@/lib/general-academic/authoring";

export default async function NewGeneralAcademicPackPage() {
  const { roles } = await requireRole(["admin"]);
  return <PageShell eyebrow="General Academic" title="Create source pack" description="Author a shared academic stimulus and linked questions. Validation and persistence use the Phase 1 canonical contract." admin roles={roles}><GeneralAcademicEditor initialPack={createNewGeneralAcademicPack()} mode="manual" /></PageShell>;
}

