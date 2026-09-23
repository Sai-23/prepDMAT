import { PageShell } from "@/components/layout/page-shell";
import { GeneralAcademicPracticeLanding } from "@/components/general-academic/practice-landing";
import { ErrorState } from "@/components/shared/error-state";
import { requireUser } from "@/lib/auth/guards";
import { requireGeneralAcademicEnabled } from "@/lib/general-academic/feature-gate";
import { getGeneralAcademicPracticeLanding } from "@/lib/general-academic/practice-data";
import { GENERAL_ACADEMIC_DOMAINS, GENERAL_ACADEMIC_SKILLS } from "@/lib/general-academic/registries";

export default async function GeneralAcademicPracticePage({ searchParams }: { searchParams: Promise<{ skill?: string; domain?: string }> }) {
  const user = await requireUser();
  requireGeneralAcademicEnabled();
  const query = await searchParams;
  const initialSkill = GENERAL_ACADEMIC_SKILLS.find((skill) => skill === query.skill);
  const initialDomain = GENERAL_ACADEMIC_DOMAINS.find((domain) => domain === query.domain);
  let landing = null;
  try {
    landing = await getGeneralAcademicPracticeLanding(user.id);
  } catch {
    landing = null;
  }
  if (!landing) return <PageShell eyebrow="Practice" title="General Academic"><ErrorState title="General Academic practice is unavailable" description="Published practice content could not be loaded. Try again shortly." /></PageShell>;
  return <PageShell eyebrow="Practice" title="General Academic" description="Practice applying academic information to unfamiliar problems."><GeneralAcademicPracticeLanding initialDomain={initialDomain} initialSkill={initialSkill} landing={landing} /></PageShell>;
}
