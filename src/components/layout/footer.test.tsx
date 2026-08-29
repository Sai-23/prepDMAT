import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Footer, resolveInstagramUrl } from "./footer";

describe("public footer", () => {
  it("renders the branded content, real quick links, support email, and disclaimer", () => {
    const html = renderToStaticMarkup(<Footer currentYear={2026} />);

    expect(html).toContain("Prepare with clarity.");
    expect(html).toContain("Focused dMAT preparation with practice, mock tests, clear explanations and performance insights.");
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/practice"');
    expect(html).toContain('href="/tests"');
    expect(html).toContain('href="/progress"');
    expect(html).toContain('href="/exam-format"');
    expect(html).toContain('href="/diagnostic"');
    expect(html).toContain('href="mailto:info@prepdmat.in"');
    expect(html).toContain("© 2026 PrepDMAT. All rights reserved.");
    expect(html).toContain("not affiliated with or endorsed by the official dMAT examination authorities or participating universities");
    expect(html).toContain("md:grid-cols-");
    expect(html).toContain("sm:px-6");
    expect(html).toContain("min-h-11");
    expect(html).toContain("prepdmat-logo-light");
    expect(html).toContain("prepdmat-logo-dark");
    expect(html).not.toMatch(/Privacy Policy|Terms of Service|About|FAQ/);
  });

  it("renders a secure external Instagram link only when a real profile URL is configured", () => {
    const configured = renderToStaticMarkup(
      <Footer currentYear={2026} instagramUrl="https://www.instagram.com/prepdmat.example/" />,
    );
    const unconfigured = renderToStaticMarkup(<Footer currentYear={2026} />);

    expect(configured).toContain('href="https://www.instagram.com/prepdmat.example/"');
    expect(configured).toContain('target="_blank"');
    expect(configured).toContain('rel="noopener noreferrer"');
    expect(configured).toContain('aria-label="Follow PrepDMAT on Instagram (opens in a new tab)"');
    expect(unconfigured).not.toContain("Follow PrepDMAT");
  });

  it("rejects malformed or non-Instagram social URLs", () => {
    expect(resolveInstagramUrl(undefined)).toBeNull();
    expect(resolveInstagramUrl("not-a-url")).toBeNull();
    expect(resolveInstagramUrl("http://instagram.com/prepdmat")).toBeNull();
    expect(resolveInstagramUrl("https://example.com/prepdmat")).toBeNull();
    expect(resolveInstagramUrl("https://instagram.com/prepdmat")).toBe("https://instagram.com/prepdmat");
  });

  it("is mounted only by the three public landing pages, outside the root layout", () => {
    const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

    expect(read("src/app/page.tsx")).toContain("<SiteFooter />");
    expect(read("src/app/exam-format/page.tsx")).toContain("<SiteFooter />");
    expect(read("src/app/diagnostic/page.tsx")).toContain("<SiteFooter />");
    expect(read("src/app/layout.tsx")).not.toContain("SiteFooter");
    expect(read("src/components/layout/site-footer.tsx")).toContain("new Date().getUTCFullYear()");
  });
});
