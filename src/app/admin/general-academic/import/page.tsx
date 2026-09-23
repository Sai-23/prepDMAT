import { GeneralAcademicImportStudio } from "@/components/admin/general-academic-import-studio";
import { GeneralAcademicBatchImportStudio } from "@/components/admin/general-academic-batch-import";
import { PageShell } from "@/components/layout/page-shell";
import { requireRole } from "@/lib/auth/guards";

export default async function ImportGeneralAcademicPackPage() {
  const { roles } = await requireRole(["admin"]);
  return <PageShell eyebrow="General Academic" title="Import canonical JSON" description="Preview provider-independent general-academic-pack@1 JSON, then save only validated content as drafts." admin roles={roles}><div className="space-y-8"><GeneralAcademicBatchImportStudio /><section aria-labelledby="single-pack-import"><h2 className="mb-3 text-xl font-semibold" id="single-pack-import">Single-pack editor flow</h2><GeneralAcademicImportStudio /></section></div></PageShell>;
}
