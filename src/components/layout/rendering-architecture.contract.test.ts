import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("route rendering architecture", () => {
  it("keeps request-bound auth out of the root and public app frames", () => {
    const root = source("src/app/layout.tsx");
    const publicFrame = source("src/components/layout/public-app-frame.tsx");
    const authenticatedFrame = source("src/components/layout/authenticated-app-frame.tsx");

    expect(`${root}\n${publicFrame}`).not.toMatch(/resolveRootAuthState|cookies\(/);
    expect(authenticatedFrame).toContain("resolveRootAuthState()");
  });

  it("retains request rendering only to support the strict per-request CSP nonce", () => {
    const publicLayout = source("src/app/(public)/layout.tsx");
    expect(publicLayout).toContain("await headers()");
    expect(publicLayout).toContain("per-request CSP nonce");
  });

  it("avoids session verification for public documents and all static asset classes", () => {
    const proxy = source("src/proxy.ts");
    expect(proxy).toContain('const anonymousPublicRoutes = ["/", "/exam-format", "/privacy"]');
    expect(proxy.indexOf("matchesRoute(pathname, anonymousPublicRoutes)")).toBeLessThan(
      proxy.indexOf("updateSupabaseSession(request, requestHeaders)"),
    );
    for (const asset of ["_next/static", "_next/image", "favicon.ico", "sitemap.xml", "robots.txt", "woff2", "webp"]) {
      expect(proxy).toContain(asset);
    }
  });

  it("does not prefetch low-probability workspace sidebar routes", () => {
    expect(source("src/components/layout/app-sidebar.tsx")).toContain("prefetch={false}");
  });

  it("keeps the mock runner's answer predicate out of the Zod schema runtime", () => {
    const activeResponse = source("src/lib/tests/active-response.ts");
    const answerContract = source("src/lib/practice/answer-contract.ts");
    expect(activeResponse).toContain('from "@/lib/practice/answer-contract"');
    expect(answerContract).not.toMatch(/from "zod"|practiceAnswerSchema/);
  });
});
