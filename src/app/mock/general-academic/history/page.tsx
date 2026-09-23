import { PageShell } from "@/components/layout/page-shell";
import { GeneralAcademicMockHistory } from "@/components/general-academic/mock-history";
import { requireUser } from "@/lib/auth/guards";
import { requireGeneralAcademicEnabled } from "@/lib/general-academic/feature-gate";
import { getGeneralAcademicMockHistory } from "@/lib/general-academic/mock-data";

export default async function GeneralAcademicMockHistoryPage() {
  const user = await requireUser();
  requireGeneralAcademicEnabled();
  const history = await getGeneralAcademicMockHistory(user.id);
  return <PageShell description="Resume an active simulation or revisit immutable completed results." eyebrow="General Academic" title="Mock History"><GeneralAcademicMockHistory items={history} /></PageShell>;
}
