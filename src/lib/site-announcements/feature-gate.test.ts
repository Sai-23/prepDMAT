import { afterEach, describe, expect, it, vi } from "vitest";

import { isSiteAnnouncementsEnabled } from "./feature-gate";

describe("site announcement feature gate", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("fails closed when either flag is missing", () => {
    vi.stubEnv("SITE_ANNOUNCEMENTS_ENABLED", undefined);
    vi.stubEnv("NEXT_PUBLIC_SITE_ANNOUNCEMENTS_ENABLED", undefined);
    expect(isSiteAnnouncementsEnabled()).toBe(false);

    vi.stubEnv("SITE_ANNOUNCEMENTS_ENABLED", "true");
    expect(isSiteAnnouncementsEnabled()).toBe(false);
  });

  it("stays hidden when either flag is off", () => {
    vi.stubEnv("SITE_ANNOUNCEMENTS_ENABLED", "false");
    vi.stubEnv("NEXT_PUBLIC_SITE_ANNOUNCEMENTS_ENABLED", "true");
    expect(isSiteAnnouncementsEnabled()).toBe(false);

    vi.stubEnv("SITE_ANNOUNCEMENTS_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_SITE_ANNOUNCEMENTS_ENABLED", "false");
    expect(isSiteAnnouncementsEnabled()).toBe(false);
  });

  it("enables announcements only when both flags are true", () => {
    vi.stubEnv("SITE_ANNOUNCEMENTS_ENABLED", "true");
    vi.stubEnv("NEXT_PUBLIC_SITE_ANNOUNCEMENTS_ENABLED", "true");
    expect(isSiteAnnouncementsEnabled()).toBe(true);
  });
});
