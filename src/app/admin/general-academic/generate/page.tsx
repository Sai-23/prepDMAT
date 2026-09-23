import { GeneralAcademicGenerationStudio } from "@/components/admin/general-academic-generation-studio";
import { PageShell } from "@/components/layout/page-shell";
import { requireRole } from "@/lib/auth/guards";
import { getGamGenerationProviderStatus } from "@/lib/general-academic/ai/router";
import { DEFAULT_GENERAL_ACADEMIC_GENERATION_CONFIG, generalAcademicGenerationConfigSchema } from "@/lib/general-academic/ai/generation-config";

export const maxDuration = 300;

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function GenerateGeneralAcademicPackPage({ searchParams }: { searchParams: Search }) {
  const { roles } = await requireRole(["admin"]);
  const status = getGamGenerationProviderStatus();
  const query = await searchParams;
  const value = (key: string) => typeof query[key] === "string" ? query[key] : undefined;
  const suggested = generalAcademicGenerationConfigSchema.safeParse({
    ...DEFAULT_GENERAL_ACADEMIC_GENERATION_CONFIG,
    domain: value("domain") ?? DEFAULT_GENERAL_ACADEMIC_GENERATION_CONFIG.domain,
    packDifficulty: value("difficulty") ?? DEFAULT_GENERAL_ACADEMIC_GENERATION_CONFIG.packDifficulty,
    skills: value("skill") ? [value("skill")] : [],
    representations: value("representation") ? ["text", value("representation")] : ["text"],
  });
  const initialConfig = suggested.success ? suggested.data : DEFAULT_GENERAL_ACADEMIC_GENERATION_CONFIG;
  return (
    <PageShell
      admin
      description="Generate one pack for preview, or a bounded batch of independently validated drafts. Nothing is approved or published automatically."
      eyebrow="General Academic"
      roles={roles}
      title="Generate General Academic Pack"
    >
      <GeneralAcademicGenerationStudio initialConfig={initialConfig} status={status} />
    </PageShell>
  );
}
