import { ArrowRight, ChartNoAxesColumnIncreasing, Shapes, TimerReset } from "lucide-react";
import Link from "next/link";

import { DisclaimerBanner } from "@/components/marketing/disclaimer-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const benefits = [
  { title: "Realistic Core questions", description: "Practise Figure Sequences, Mathematical Equations, and Latin Squares in their real response formats.", icon: Shapes },
  { title: "Timed mock tests", description: "Build pace with section timers, saved answers, flags, and feedback after submission.", icon: TimerReset },
  { title: "A clear next step", description: "See where you are strongest, where you need work, and what to practise next.", icon: ChartNoAxesColumnIncreasing },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-20 px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
      <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold text-primary">Independent dMAT preparation</p>
          <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight sm:text-6xl">Prepare for the dMAT with clarity</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">Learn the Core formats, practise with immediate explanations, take timed mocks, and turn every result into a useful next step.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg"><Link href="/onboarding">Get started <ArrowRight className="h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="secondary"><Link href="/exam-format">See the exam format</Link></Button>
          </div>
          <DisclaimerBanner className="mt-8 max-w-3xl" />
        </div>
        <div className="rounded-2xl border border-workspace-border bg-surface-low p-5 sm:p-7">
          <p className="text-sm font-semibold text-primary">Core Module</p>
          <p className="mt-2 text-3xl font-semibold">60 questions</p>
          <p className="mt-1 text-sm text-muted-foreground">Three 25-minute subtests · about 90 minutes including instructions</p>
          <ol className="mt-6 divide-y divide-workspace-separator">
            {[
              ["Figure Sequences", "20 questions"],
              ["Mathematical Equations", "20 questions"],
              ["Latin Squares", "20 questions"],
            ].map(([label, count], index) => <li className="flex items-center justify-between gap-4 py-4" key={label}><span className="font-medium">{index + 1}. {label}</span><span className="text-sm text-muted-foreground">{count}</span></li>)}
          </ol>
        </div>
      </section>

      <section aria-labelledby="prepare-your-way" className="space-y-7">
        <div className="max-w-2xl"><h2 className="text-3xl font-semibold" id="prepare-your-way">Everything you need to keep moving</h2><p className="mt-2 text-muted-foreground">Start small, learn from each answer, and move into exam-paced work when you are ready.</p></div>
        <div className="grid gap-4 lg:grid-cols-3">
          {benefits.map(({ title, description, icon: Icon }) => <Card key={title}><CardContent className="p-6"><Icon aria-hidden="true" className="h-6 w-6 text-primary" /><h3 className="mt-5 text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p></CardContent></Card>)}
        </div>
      </section>

      <section className="rounded-2xl bg-primary p-7 text-primary-foreground sm:p-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-3xl font-semibold">Find your starting point</h2><p className="mt-2 max-w-2xl text-sm leading-6 opacity-90">Take a short, untimed Core diagnostic or go straight to Practice. You can change direction at any time.</p></div>
          <Button asChild size="lg" variant="secondary"><Link href="/onboarding">Get started <ArrowRight className="h-4 w-4" /></Link></Button>
        </div>
      </section>
    </main>
  );
}
