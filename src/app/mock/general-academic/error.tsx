"use client";

import { Button } from "@/components/ui/button";

export default function GeneralAcademicMockError({ reset }: { error: Error & { digest?: string }; reset(): void }) {
  return <div className="mx-auto max-w-xl rounded-lg border border-error/30 bg-error-container p-6 text-center"><h2 className="text-xl font-semibold">General Academic mock could not be loaded</h2><p className="mt-2 text-sm">Any answers already saved on the server remain available. Try loading the mock again.</p><Button className="mt-4" onClick={reset}>Try Again</Button></div>;
}
