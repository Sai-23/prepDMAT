import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const modules = [
  {
    title: "Core Module",
    description:
      "Figure Sequences, Mathematical Equations, and 5×5 Latin Squares in the same formats you use in Practice.",
    tags: ["Visual patterns", "Number reasoning", "Timed practice"],
  },
];

export function ExamOverview() {
  return (
    <section className="space-y-8">
      <SectionHeading
        eyebrow="Exam structure"
        title="A focused foundation for the Core Module"
        description="Learn the three Core formats before you practise against the clock."
      />
      <div className="grid gap-5">
        {modules.map((module) => (
          <Card key={module.title}>
            <CardHeader>
              <CardTitle>{module.title}</CardTitle>
              <CardDescription>{module.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {module.tags.map((tag) => (
                <Badge key={tag} variant="subtle">
                  {tag}
                </Badge>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
