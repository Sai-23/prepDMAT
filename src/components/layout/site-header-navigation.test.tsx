import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

import { SiteHeaderNavigation } from "./site-header-navigation";

describe("SiteHeaderNavigation", () => {
  it("keeps core student destinations available in the mobile menu", () => {
    const html = renderToStaticMarkup(<SiteHeaderNavigation />);

    expect(html).toContain('aria-label="Open navigation"');
    expect(html).toContain('aria-label="Mobile navigation"');
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('href="/practice"');
    expect(html).toContain('href="/tests"');
    expect(html).toContain('href="/progress"');
    expect(html).toContain('href="/results"');
    expect(html).toContain('href="/exam-format"');
    expect(html).toContain('href="/onboarding"');
    expect(html.match(/>Free Diagnostic<\/a>/g)).toHaveLength(2);
    expect(html).not.toContain('href="/pricing"');
    expect(html).not.toContain(">Pricing</a>");
    expect(html).toContain('aria-current="page"');
  });
});
