import { Clock3, FileCheck2, Layers3 } from "lucide-react";
import type { Metadata } from "next";

import { CoreFormatSamples } from "@/components/exam-format/core-format-samples";
import { SiteFooter } from "@/components/layout/site-footer";
import { Card, CardContent } from "@/components/ui/card";
import { DMAT_CURRENT_CORE_PROTOCOL } from "@/lib/protocol";
import { indexRobots, siteConfig, siteUrl } from "@/lib/site-config";

const description = "Understand the dMAT Core Module format, including Figure Sequences, Mathematical Equations and Latin Squares, with timings and preparation guidance.";

export const metadata: Metadata = {
  title: "dMAT Exam Format & Core Module",
  description,
  alternates: { canonical: "/exam-format" },
  robots: indexRobots,
  openGraph: {
    type: "website",
    url: siteUrl("/exam-format"),
    siteName: siteConfig.name,
    title: "dMAT Exam Format & Core Module | PrepDMAT",
    description,
  },
  twitter: {
    card: "summary",
    title: "dMAT Exam Format & Core Module | PrepDMAT",
    description,
  },
};

export default function ExamFormatPage() {
  const core = DMAT_CURRENT_CORE_PROTOCOL.core;
  const totalQuestions = core.reduce((total, section) => total + section.questionCount, 0);

  return (
    <>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-14 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <header className="max-w-3xl space-y-4">
        <p className="text-sm font-semibold text-primary">Exam format</p>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">dMAT exam format and Core Module</h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">The dMAT is taken digitally and has a Core Module followed by a second 90-minute module. For the current APS route in India, that second part is the General Academic Module.</p>
        </div>
      </header>

      <section aria-labelledby="exam-at-a-glance" className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold" id="exam-at-a-glance">The exam at a glance</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Allow about three and a half hours at the test centre, including the break between the two modules.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-primary bg-primary-muted">
            <CardContent className="p-6 sm:p-8">
              <p className="text-sm font-semibold text-primary">Part 1</p>
              <h3 className="mt-2 text-2xl font-semibold">Core Module</h3>
              <p className="mt-2 text-sm text-muted-foreground">{totalQuestions} questions · approximately 90 minutes including instructions</p>
              <ol className="mt-6 divide-y divide-workspace-separator">
                {core.map((section, index) => (
                  <li className="grid grid-cols-[1fr_auto] gap-4 py-3" key={section.sectionType}>
                    <span className="font-medium">{index + 1}. {section.title}</span>
                    <span className="text-sm text-muted-foreground">{section.questionCount} questions · {Math.round(section.durationSeconds / 60)} min</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 sm:p-8">
              <p className="text-sm font-semibold text-primary">Part 2</p>
              <h3 className="mt-2 text-2xl font-semibold">General Academic Module</h3>
              <p className="mt-2 text-sm text-muted-foreground">90 minutes · current APS route for the specified India cohort</p>
              <p className="mt-6 text-sm leading-7 text-on-surface-variant">This module asks you to apply cognitive and analytical skills to academic problem solving. It focuses on transfer and application rather than memorised facts.</p>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">Requirements can depend on your application route and intake. Confirm your requirement and dates with dMAT and APS before registering.</p>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-lg bg-surface-low p-4"><Layers3 aria-hidden="true" className="h-5 w-5 text-primary" /><span className="text-sm font-medium">3 Core subtests</span></div>
          <div className="flex items-center gap-3 rounded-lg bg-surface-low p-4"><FileCheck2 aria-hidden="true" className="h-5 w-5 text-primary" /><span className="text-sm font-medium">20 questions each</span></div>
          <div className="flex items-center gap-3 rounded-lg bg-surface-low p-4"><Clock3 aria-hidden="true" className="h-5 w-5 text-primary" /><span className="text-sm font-medium">25 minutes each</span></div>
        </div>
      </section>

      <section aria-labelledby="core-question-formats" className="space-y-7">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold" id="core-question-formats">Try the three Core question formats</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">These examples use the same response interfaces as Practice. They are static examples: selections are not scored or saved.</p>
        </div>
        <Card>
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <CoreFormatSamples />
          </CardContent>
        </Card>
      </section>
      </div>
      <SiteFooter />
    </>
  );
}
