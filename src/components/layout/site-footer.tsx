import Link from "next/link";

import { DisclaimerBanner } from "@/components/marketing/disclaimer-banner";

export function SiteFooter() {
  return (
    <footer
      className="border-t border-workspace-border bg-surface-low"
      data-site-footer
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10 lg:px-8">
        <DisclaimerBanner />
        <div className="flex flex-col gap-4 text-sm text-on-surface-variant sm:flex-row sm:items-center sm:justify-between">
          <p>
            Built for serious preparation across timed mocks, question review, and
            topic analytics.
          </p>
          <div className="flex gap-4">
            <Link href="/exam-format" className="hover:text-primary">
              Exam Format
            </Link>
            <Link href="/diagnostic" className="hover:text-primary">
              Free Diagnostic
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
