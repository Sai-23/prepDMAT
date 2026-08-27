import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SiteFooter } from "./site-footer";

const studentFacingFiles = [
  "src/app/page.tsx",
  "src/app/tests/page.tsx",
  "src/app/tests/[testId]/page.tsx",
  "src/components/tests/start-test-button.tsx",
  "src/components/layout/site-footer.tsx",
  "src/components/layout/site-header-navigation.tsx",
  "src/components/marketing/hero-section.tsx",
].map((file) => readFileSync(resolve(process.cwd(), file), "utf8")).join("\n");

const nextConfig = readFileSync(
  resolve(process.cwd(), "next.config.ts"),
  "utf8",
);

describe("launch-stage student monetization visibility", () => {
  it("keeps pricing and paywall language out of student-facing surfaces", () => {
    const forbidden = [
      "/pricing",
      "premium",
      "upgrade",
      "choose a plan",
      "paid plan",
      "subscription",
      "billing",
      "payment",
      "paywall",
    ];
    forbidden.forEach((term) => {
      expect(studentFacingFiles.toLowerCase()).not.toContain(term.toLowerCase());
    });
  });

  it("keeps the footer focused on exam format and the diagnostic", () => {
    const html = renderToStaticMarkup(<SiteFooter />);
    expect(html).toContain('href="/exam-format"');
    expect(html).toContain('href="/onboarding"');
    expect(html).toContain("Free Diagnostic");
    expect(html).not.toContain("Pricing");
  });

  it("redirects direct pricing visits without rendering plan content", () => {
    expect(nextConfig).toContain('source: "/pricing"');
    expect(nextConfig).toContain('destination: "/"');
    expect(nextConfig).toContain("permanent: false");
    expect(nextConfig).not.toContain("Premium preview");
  });

  it("hides inaccessible legacy tests without removing entitlement data", () => {
    expect(studentFacingFiles).toContain("tests?.filter((test) => test.hasAccess)");
    expect(studentFacingFiles).not.toContain("Premium access required");
  });
});
