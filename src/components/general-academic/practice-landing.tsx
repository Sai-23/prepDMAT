"use client";

import {
  ArrowRight,
  BarChart3,
  Bookmark,
  BookOpenText,
  Brain,
  Calculator,
  ChevronDown,
  Clock3,
  Settings2,
  Table2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { startGeneralAcademicPracticeAction } from "@/app/practice/general-academic/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { GeneralAcademicPracticeConfig } from "@/lib/general-academic/practice";
import {
  GENERAL_ACADEMIC_DOMAIN_LABELS,
  GENERAL_ACADEMIC_SKILL_LABELS,
} from "@/lib/general-academic/registries";

type Domain = keyof typeof GENERAL_ACADEMIC_DOMAIN_LABELS;
type Skill = keyof typeof GENERAL_ACADEMIC_SKILL_LABELS;
type Focus = GeneralAcademicPracticeConfig["mode"];

type Landing = {
  domains: Array<{ domain: Domain; packCount: number }>;
  skills: Array<{ skill: Skill; packCount: number }>;
  totalPacks: number;
  activeAttempt: {
    id: string;
    title: string;
    domain: Domain;
    answeredCount: number;
    currentQuestionIndex: number;
    questionCount: number;
  } | null;
};

const QUICK_START_CONFIG: GeneralAcademicPracticeConfig = {
  mode: "mixed",
  difficulty: "mixed",
  timingMode: "untimed",
};

export function GeneralAcademicPracticeLanding({
  landing,
  initialDomain,
  initialSkill,
}: {
  landing: Landing;
  initialDomain?: Domain;
  initialSkill?: Skill;
}) {
  const router = useRouter();
  const firstDomain = landing.domains[0]?.domain;
  const firstSkill = landing.skills[0]?.skill;
  const [customizeOpen, setCustomizeOpen] = useState(Boolean(initialDomain || initialSkill));
  const [focus, setFocus] = useState<Focus>(initialSkill ? "skill" : initialDomain ? "domain" : "mixed");
  const [domain, setDomain] = useState<Domain | undefined>(initialDomain ?? firstDomain);
  const [skill, setSkill] = useState<Skill | undefined>(initialSkill ?? firstSkill);
  const [difficulty, setDifficulty] = useState<GeneralAcademicPracticeConfig["difficulty"]>("mixed");
  const [timingMode, setTimingMode] = useState<GeneralAcademicPracticeConfig["timingMode"]>("untimed");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const start = (config: GeneralAcademicPracticeConfig) => startTransition(async () => {
    setError(null);
    const result = await startGeneralAcademicPracticeAction(config);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.push(`/practice/general-academic/${result.attemptId}`);
  });

  const startCustomized = () => {
    if (focus === "domain" && domain) {
      start({ mode: "domain", domain, difficulty, timingMode });
      return;
    }
    if (focus === "skill" && skill) {
      start({ mode: "skill", skill, difficulty, timingMode });
      return;
    }
    start({ mode: "mixed", difficulty, timingMode });
  };

  return (
    <div className="space-y-8">
      {landing.activeAttempt || landing.totalPacks ? (
        <section aria-labelledby="practice-start" className="space-y-4">
          <Card className="relative overflow-hidden border-primary/40 bg-primary-muted shadow-sm">
            <div aria-hidden="true" className="absolute -right-12 -top-16 size-52 rounded-full bg-surface-lowest/50" />
            <CardContent className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  {landing.activeAttempt ? "Practice in progress" : "Quick start"}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight" id="practice-start">
                  {landing.activeAttempt ? "Continue where you left off" : "Ready to practice?"}
                </h2>
                {landing.activeAttempt ? (
                  <div className="mt-2 space-y-1 text-sm text-on-surface-variant">
                    <p className="font-medium text-on-surface">{landing.activeAttempt.title}</p>
                    <p>{GENERAL_ACADEMIC_DOMAIN_LABELS[landing.activeAttempt.domain]} · {landing.activeAttempt.answeredCount} of {landing.activeAttempt.questionCount} questions answered</p>
                  </div>
                ) : (
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
                    We&apos;ll choose an appropriate available practice set and keep the complete academic source together.
                  </p>
                )}
                <ul aria-label="Practice formats" className="mt-5 grid grid-cols-2 gap-2 text-sm sm:flex sm:flex-wrap">
                  <Format icon={<BookOpenText aria-hidden="true" className="size-4" />} label="Text" />
                  <Format icon={<Calculator aria-hidden="true" className="size-4" />} label="Formulas" />
                  <Format icon={<Table2 aria-hidden="true" className="size-4" />} label="Tables" />
                  <Format icon={<BarChart3 aria-hidden="true" className="size-4" />} label="Graphs" />
                </ul>
              </div>
              <div className="flex flex-col items-stretch gap-2 lg:min-w-52">
                {landing.activeAttempt ? (
                  <Button asChild className="min-h-11 w-full" size="lg">
                    <Link href={`/practice/general-academic/${landing.activeAttempt.id}`}>Resume Practice <ArrowRight aria-hidden="true" className="size-4" /></Link>
                  </Button>
                ) : (
                  <>
                    <Button className="min-h-11 w-full" disabled={pending} onClick={() => start(QUICK_START_CONFIG)} size="lg">
                      {pending ? "Starting…" : "Start Practice"}<ArrowRight aria-hidden="true" className="size-4" />
                    </Button>
                    <Button
                      aria-controls="practice-customization"
                      aria-expanded={customizeOpen}
                      className="min-h-11 w-full"
                      onClick={() => setCustomizeOpen((open) => !open)}
                      variant="ghost"
                    >
                      <Settings2 aria-hidden="true" className="size-4" />Customize practice<ChevronDown aria-hidden="true" className={`size-4 transition-transform motion-reduce:transition-none ${customizeOpen ? "rotate-180" : ""}`} />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {!landing.activeAttempt && customizeOpen ? (
            <Card id="practice-customization">
              <CardContent className="space-y-6 p-5 sm:p-6">
                <div>
                  <h3 className="text-lg font-semibold">Customize practice</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Choose a focus only when you want a more targeted practice set.</p>
                </div>

                <fieldset>
                  <legend className="text-sm font-semibold">Practice focus</legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {(["mixed", "domain", "skill"] as const).map((option) => (
                      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-workspace-border bg-surface-lowest px-3 py-2 text-sm font-medium focus-within:ring-2 focus-within:ring-primary" key={option}>
                        <input checked={focus === option} name="practice-focus" onChange={() => setFocus(option)} type="radio" value={option} />
                        {option === "mixed" ? "Mixed" : option === "domain" ? "Domain" : "Skill"}
                      </label>
                    ))}
                  </div>
                </fieldset>

                {focus === "domain" ? (
                  <label className="grid gap-2 text-sm font-semibold" htmlFor="practice-domain">
                    Domain
                    <select className="h-11 w-full rounded-md border border-workspace-border bg-surface-lowest px-3 font-normal" id="practice-domain" onChange={(event) => setDomain(event.target.value as Domain)} value={domain}>
                      {landing.domains.map((item) => <option key={item.domain} value={item.domain}>{GENERAL_ACADEMIC_DOMAIN_LABELS[item.domain]}</option>)}
                    </select>
                  </label>
                ) : null}

                {focus === "skill" ? (
                  <label className="grid gap-2 text-sm font-semibold" htmlFor="practice-skill">
                    Skill
                    <select className="h-11 w-full rounded-md border border-workspace-border bg-surface-lowest px-3 font-normal" id="practice-skill" onChange={(event) => setSkill(event.target.value as Skill)} value={skill}>
                      {landing.skills.map((item) => <option key={item.skill} value={item.skill}>{GENERAL_ACADEMIC_SKILL_LABELS[item.skill]}</option>)}
                    </select>
                  </label>
                ) : null}

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-semibold" htmlFor="practice-difficulty">
                    Difficulty
                    <select className="h-11 rounded-md border border-workspace-border bg-surface-lowest px-3 font-normal" id="practice-difficulty" onChange={(event) => setDifficulty(event.target.value as GeneralAcademicPracticeConfig["difficulty"])} value={difficulty}>
                      <option value="mixed">Mixed</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                    <span className="text-xs font-normal leading-5 text-muted-foreground">PrepDMAT&apos;s internal practice classification.</span>
                  </label>

                  <fieldset>
                    <legend className="text-sm font-semibold">Timing</legend>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {(["untimed", "timed"] as const).map((mode) => (
                        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-workspace-border bg-surface-lowest px-3 py-2 text-sm font-medium focus-within:ring-2 focus-within:ring-primary" key={mode}>
                          <input checked={timingMode === mode} name="practice-timing" onChange={() => setTimingMode(mode)} type="radio" value={mode} />
                          {mode === "timed" ? <Clock3 aria-hidden="true" className="size-4" /> : null}{mode === "timed" ? "Timed" : "Untimed"}
                        </label>
                      ))}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">Timed mode allows two PrepDMAT practice minutes per linked question. It is not official dMAT timing.</p>
                  </fieldset>
                </div>

                <div className="flex justify-end border-t border-workspace-separator pt-5">
                  <Button className="min-h-11 w-full sm:w-auto" disabled={pending || (focus === "domain" && !domain) || (focus === "skill" && !skill)} onClick={startCustomized} size="lg">
                    {pending ? "Starting…" : "Start Practice"}<ArrowRight aria-hidden="true" className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {error ? <p className="rounded-md bg-error-container p-3 text-sm text-on-error-container" role="alert">{error} Your practice was not started. Try again.</p> : null}
        </section>
      ) : (
        <Card>
          <CardContent className="p-7 text-center">
            <BookOpenText className="mx-auto size-8 text-primary" />
            <h2 className="mt-3 text-xl font-semibold">General Academic practice is being prepared</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">No published practice sets are available yet. Core Practice remains available while new academic material completes review.</p>
            <Button asChild className="mt-5" variant="outline"><Link href="/practice">Return to Core Practice</Link></Button>
          </CardContent>
        </Card>
      )}

      <section aria-labelledby="your-learning" className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Your learning</p>
          <h2 className="mt-1 text-xl font-semibold" id="your-learning">Review and improve</h2>
        </div>
        <nav aria-label="General Academic learning tools" className="grid gap-3 sm:grid-cols-3">
          <LearningLink description="Revisit questions that need another look." href="/practice/general-academic/mistakes" icon={<Brain aria-hidden="true" className="size-5" />} label="Mistake Review" />
          <LearningLink description="Return to questions you saved." href="/practice/general-academic/bookmarks" icon={<Bookmark aria-hidden="true" className="size-5" />} label="Bookmarks" />
          <LearningLink description="View your skill and domain analytics." href="/progress/general-academic" icon={<BarChart3 aria-hidden="true" className="size-5" />} label="Progress" />
        </nav>
      </section>
    </div>
  );
}

function Format({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <li className="flex min-h-10 items-center gap-2 rounded-md border border-workspace-border bg-surface-lowest/80 px-3 text-primary"><span>{icon}</span><span className="text-on-surface">{label}</span></li>;
}

function LearningLink({ description, href, icon, label }: { description: string; href: "/practice/general-academic/mistakes" | "/practice/general-academic/bookmarks" | "/progress/general-academic"; icon: React.ReactNode; label: string }) {
  return (
    <Link className="group flex min-h-28 flex-col rounded-lg border border-workspace-border bg-surface-lowest p-4 transition-colors hover:border-primary hover:bg-surface-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" href={href}>
      <span className="flex items-center justify-between gap-3 text-primary"><span className="rounded-md bg-primary-muted p-2">{icon}</span><ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" /></span>
      <strong className="mt-3 text-on-surface">{label}</strong>
      <span className="mt-1 text-xs leading-5 text-muted-foreground">{description}</span>
    </Link>
  );
}
