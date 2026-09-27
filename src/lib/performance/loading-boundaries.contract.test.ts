import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("authenticated hot-route loading boundaries", () => {
  it.each(["dashboard", "practice", "progress", "results"])("keeps a stable %s shell while route data loads", (route) => {
    const path = resolve(process.cwd(), `src/app/(authenticated)/${route}/loading.tsx`);
    expect(existsSync(path)).toBe(true);
    const loading = readFileSync(path, "utf8");
    expect(loading).toContain("<PageShell");
    expect(loading).toContain("motion-reduce:animate-none");
  });
});
