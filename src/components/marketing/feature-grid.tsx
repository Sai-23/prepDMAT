import { Bookmark, BrainCircuit, ChartSpline, TimerReset } from "lucide-react";

import { SectionHeading } from "@/components/shared/section-heading";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    title: "Practice by intent",
    description:
      "Configure sessions by module, topic, difficulty, timing mode, incorrect questions, or bookmarks.",
    icon: BrainCircuit,
  },
  {
    title: "Realistic timed mocks",
    description:
      "Run computer-based timed subtests and full mock exams with serious navigation and saved progress.",
    icon: TimerReset,
  },
  {
    title: "Performance analytics",
    description:
      "Track accuracy, response time, topic performance, weak areas, and study momentum over time.",
    icon: ChartSpline,
  },
  {
    title: "Revision workflows",
    description:
      "Automatically capture mistakes, save bookmarks, reattempt errors, and receive targeted recommendations.",
    icon: Bookmark,
  },
];

export function FeatureGrid() {
  return (
    <section className="space-y-8">
      <SectionHeading
        eyebrow="Core platform features"
        title="Built for deliberate preparation, not casual quizzing"
        description="Build confidence with realistic questions, clear explanations, timed practice, and useful next steps."
      />
      <div className="grid gap-5 md:grid-cols-2">
        {features.map(({ title, description, icon: Icon }) => (
          <Card key={title}>
            <CardHeader>
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[var(--accent)]">
                <Icon className="h-5 w-5" />
              </div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-px w-full bg-[var(--border)]" />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
