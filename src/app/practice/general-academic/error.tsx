"use client";

import { Button } from "@/components/ui/button";

export default function GeneralAcademicPracticeError({ reset }: { error: Error & { digest?: string }; reset(): void }) {
  return <div className="mx-auto max-w-xl rounded-lg border border-error/30 bg-error-container p-6 text-center"><h2 className="text-xl font-semibold">General Academic practice could not be loaded</h2><p className="mt-2 text-sm">Your saved attempt has not been changed. Try loading it again.</p><Button className="mt-4" onClick={reset}>Try Again</Button></div>;
}
