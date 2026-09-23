import { GeneralAcademicQualityDashboard } from "@/components/admin/general-academic-quality-dashboard";
import { PageShell } from "@/components/layout/page-shell";
import { requireRole } from "@/lib/auth/guards";
import { getGeneralAcademicContentIntelligenceForAdmin } from "@/lib/general-academic/content-intelligence-data";

type Search = Promise<{ lifecycle?: string; domain?: string; difficulty?: string; origin?: string; issue?: string }>;

export default async function GeneralAcademicQualityPage({ searchParams }: { searchParams: Search }) {
  const { user, roles } = await requireRole(["admin"]);
  const [{ health }, filters] = await Promise.all([getGeneralAcademicContentIntelligenceForAdmin(user.id), searchParams]);
  return <PageShell admin description="Run deterministic validation, quality, answer-pattern and similarity analysis across the GAM content pipeline." eyebrow="General Academic · Content intelligence" roles={roles} title="Quality audit"><GeneralAcademicQualityDashboard filters={filters} health={health} /></PageShell>;
}
