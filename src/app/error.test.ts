import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("root route error boundary", () => {
  it("keeps the UI generic while logging only safe render diagnostics", () => {
    const source = readFileSync(resolve(process.cwd(), "src/app/error.tsx"), "utf8");

    expect(source).toContain('"[route.render] failed"');
    expect(source).toContain('category: "unexpected_render_error"');
    expect(source).toContain('operation: "render"');
    expect(source).toContain("window.location.pathname");
    expect(source).toContain('error.digest ?? "unavailable"');
    expect(source).not.toMatch(/error\.(message|stack|cause)/);
    expect(source).toContain('title="Something went wrong"');
  });
});
