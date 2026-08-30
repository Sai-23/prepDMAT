import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import nextConfig from "../../../next.config";
import { metadata as diagnosticMetadata } from "@/app/diagnostic/page";
import { metadata as examFormatMetadata } from "@/app/exam-format/page";
import { metadata as homeMetadata } from "@/app/page";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import {
  noIndexMetadata,
  siteConfig,
  siteUrl,
  websiteStructuredData,
} from "@/lib/site-config";

const root = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

describe("minimal production SEO", () => {
  it("centralizes the canonical production origin independently of auth environment configuration", () => {
    expect(siteConfig.url).toBe("https://prepdmat.in");
    expect(siteUrl("/exam-format")).toBe("https://prepdmat.in/exam-format");
    expect(read("src/lib/site-config.ts")).not.toContain("NEXT_PUBLIC_APP_URL");
  });

  it("defines unique indexable metadata for the three public acquisition pages", () => {
    expect(homeMetadata.title).toEqual({ absolute: siteConfig.defaultTitle });
    expect(homeMetadata.description).toBe(siteConfig.description);
    expect(homeMetadata.alternates).toEqual({ canonical: "https://prepdmat.in/" });

    expect(examFormatMetadata.title).toBe("dMAT Exam Format & Core Module");
    expect(examFormatMetadata.description).not.toBe(siteConfig.description);
    expect(examFormatMetadata.alternates).toEqual({ canonical: "/exam-format" });

    expect(diagnosticMetadata.title).toBe("Free dMAT Diagnostic Test");
    expect(diagnosticMetadata.description).not.toBe(siteConfig.description);
    expect(diagnosticMetadata.alternates).toEqual({ canonical: "/diagnostic" });

    for (const metadata of [homeMetadata, examFormatMetadata, diagnosticMetadata]) {
      expect(metadata.robots).toMatchObject({ index: true, follow: true });
    }
  });

  it("keeps private pages out of the index through route metadata and handler headers", async () => {
    expect(noIndexMetadata.robots).toMatchObject({ index: false, follow: false });

    const privateLayouts = [
      "admin", "bookmarks", "dashboard", "forgot-password", "login", "mistakes",
      "onboarding", "practice", "profile", "progress", "register", "reset-password",
      "results", "tests", "diagnostic/result", "diagnostic/take",
    ];
    for (const route of privateLayouts) {
      expect(read(`src/app/${route}/layout.tsx`)).toContain("noIndexMetadata");
    }

    const headers = await nextConfig.headers?.();
    expect(headers).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: "/auth/:path*" }),
      expect.objectContaining({ source: "/api/:path*" }),
    ]));
  });

  it("publishes a deliberately small canonical sitemap", () => {
    expect(sitemap()).toEqual([
      { url: "https://prepdmat.in/" },
      { url: "https://prepdmat.in/exam-format" },
      { url: "https://prepdmat.in/diagnostic" },
    ]);
    expect(JSON.stringify(sitemap())).not.toMatch(/admin|auth|attempt|result|login/);
  });

  it("publishes crawl rules and the canonical sitemap location", () => {
    const result = robots();
    expect(result.sitemap).toBe("https://prepdmat.in/sitemap.xml");
    expect(result.host).toBe(siteConfig.url);
    expect(result.rules).toMatchObject({ userAgent: "*" });
    expect(JSON.stringify(result.rules)).toContain("/favicon.ico");
    expect(JSON.stringify(result.rules)).toContain("/admin/");
  });

  it("uses only truthful minimal WebSite structured data", () => {
    expect(websiteStructuredData).toEqual({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "PrepDMAT",
      url: "https://prepdmat.in/",
    });
    expect(JSON.stringify(websiteStructuredData)).not.toMatch(/Review|Rating|FAQ|Course/);
  });

  it("keeps public intent and navigation in server-rendered source", () => {
    const home = read("src/app/page.tsx");
    expect(home.match(/<h1\b/g)).toHaveLength(1);
    expect(home).toContain('href="/exam-format"');
    expect(home).toContain('href="/diagnostic"');
    expect(home).toContain("Figure Sequences");
    expect(home).toContain("Mathematical Equations");
    expect(home).toContain("Latin Squares");

    expect(read("src/app/exam-format/page.tsx").match(/<h1\b/g)).toHaveLength(1);
    expect(read("src/components/layout/page-shell.tsx")).toContain("<h1");
  });

  it("does not emit meta keywords or reference a missing social image", () => {
    const layout = read("src/app/layout.tsx");
    expect(layout).not.toMatch(/keywords\s*:/);
    expect(layout).not.toContain("prepdmat-og.png");
    expect(fs.existsSync(path.join(root, "src/app/favicon.ico"))).toBe(true);
    expect(fs.existsSync(path.join(root, "src/app/icon.png"))).toBe(true);
    expect(fs.existsSync(path.join(root, "src/app/apple-icon.png"))).toBe(true);
  });

  it("declares the stable favicon URL explicitly in root metadata", () => {
    const layout = read("src/app/layout.tsx");
    expect(layout).toContain('{ url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" }');
    expect(layout).toContain('{ url: "/icon.png", sizes: "512x512", type: "image/png" }');
  });
});
