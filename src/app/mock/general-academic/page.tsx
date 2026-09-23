import { PageShell } from "@/components/layout/page-shell";
import { GeneralAcademicMockLanding } from "@/components/general-academic/mock-landing";
import { requireUser } from "@/lib/auth/guards";
import { requireGeneralAcademicEnabled } from "@/lib/general-academic/feature-gate";
import { getGeneralAcademicMockLanding } from "@/lib/general-academic/mock-data";

export default async function GeneralAcademicMockPage() {
  const user = await requireUser();
  requireGeneralAcademicEnabled();
  const landing = await getGeneralAcademicMockLanding(user.id);
  return <PageShell description="A 90-minute PrepDMAT simulation using multiple complete academic source packs." eyebrow="Mock Tests · General Academic" title="General Academic Mock"><GeneralAcademicMockLanding {...landing} /></PageShell>;
}
