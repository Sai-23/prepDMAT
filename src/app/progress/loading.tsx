import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent } from "@/components/ui/card";

export default function ProgressLoading() {
  return (
    <PageShell eyebrow="Core progress" title="How am I doing?" description="Building your evidence-based progress view.">
      <div aria-label="Loading progress" className="grid animate-pulse gap-4 md:grid-cols-3" role="status">
        {[1, 2, 3].map((item) => <Card key={item}><CardContent className="h-44 p-6" /></Card>)}
      </div>
    </PageShell>
  );
}

