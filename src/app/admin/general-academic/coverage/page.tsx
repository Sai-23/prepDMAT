import { GeneralAcademicCoverageDashboard } from "@/components/admin/general-academic-coverage";
import { PageShell } from "@/components/layout/page-shell";
import { requireRole } from "@/lib/auth/guards";
import { getGeneralAcademicContentIntelligenceForAdmin } from "@/lib/general-academic/content-intelligence-data";

export default async function GeneralAcademicCoveragePage() {
  const { user, roles } = await requireRole(["admin"]);
  const { health } = await getGeneralAcademicContentIntelligenceForAdmin(user.id);
  return <PageShell admin description="Inspect PrepDMAT internal domain, skill, difficulty and representation coverage without implying an official exam distribution." eyebrow="General Academic · Content intelligence" roles={roles} title="Coverage"><GeneralAcademicCoverageDashboard coverage={health.audit.coverage} /></PageShell>;
}
