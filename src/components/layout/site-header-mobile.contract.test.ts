import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const header = readFileSync(
  resolve(process.cwd(), "src/components/layout/site-header.tsx"),
  "utf8",
);

describe("site header mobile layout contract", () => {
  it("uses the compact square brand asset while the wordmark is hidden", () => {
    expect(header).toContain('src="/branding/icons/icon-192.png"');
    expect(header).toContain('className="size-10 object-contain sm:hidden"');
    expect(header).toContain('<span className="hidden sm:flex">');
  });

  it("uses narrow-screen padding and passes the authenticated state to the menu", () => {
    expect(header).toContain("px-3 sm:px-6 lg:px-12");
    expect(header).toContain("isAuthenticated={initialAccount !== null}");
  });
});
