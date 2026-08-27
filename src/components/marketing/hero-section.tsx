import Link from "next/link";
import { ArrowRight, Clock3, LineChart, Shapes } from "lucide-react";

import { DisclaimerBanner } from "@/components/marketing/disclaimer-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const quickStats = [
  {
    title: "Timed mocks",
    description: "Serious desktop-first test flows with timing, review flags, and restoration.",
    icon: Clock3,
  },
  {
    title: "Core reasoning",
    description: "Focused practice for figure sequences, mathematical equations, and Latin Squares.",
    icon: Shapes,
  },
  {
    title: "Analytics",
    description: "Accuracy, response time, weak topics, and next-step recommendations.",
    icon: LineChart,
  },
];

export function HeroSection() {
  return (
    <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
      <div className="space-y-8">
        <Badge>Independent dMAT preparation</Badge>
        <div className="space-y-5">
          <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
            Prepare Smarter for the dMAT
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-600">
            Realistic timed mocks, focused Core practice questions, and clear
            performance analytics.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/tests">
              Start Free Diagnostic
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/exam-format">Explore Exam Format</Link>
          </Button>
        </div>
        <DisclaimerBanner className="max-w-3xl" />
      </div>

      <Card className="overflow-hidden bg-surface-low">
        <CardContent className="space-y-6 p-6">
          <div className="rounded-md border border-workspace-border bg-surface-lowest p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Mock Test Preview</p>
                <p className="text-sm text-slate-600">Core Mini Mock</p>
              </div>
              <Badge variant="success">Focused UI</Badge>
            </div>
            <div className="grid gap-3 text-sm text-slate-700">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span>Timer</span>
                <span className="font-semibold text-slate-950">27:18</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span>Question</span>
                <span className="font-semibold text-slate-950">12 / 30</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span>Marked for review</span>
                <span className="font-semibold text-slate-950">3</span>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            {quickStats.map(({ title, description, icon: Icon }) => (
              <div
                key={title}
                className="rounded-md border border-workspace-border bg-surface-lowest p-4"
              >
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Icon className="h-4 w-4 text-[var(--accent)]" />
                  {title}
                </div>
                <p className="text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
