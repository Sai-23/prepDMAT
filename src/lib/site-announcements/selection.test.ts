import { describe, expect, it } from "vitest";

import type { SiteAnnouncement } from "@/config/site-announcements";

import { parseDismissedAnnouncementIds, selectSiteAnnouncement } from "./selection";

const current: SiteAnnouncement = {
  id: "current",
  title: "Current",
  message: "Current announcement",
  enabled: true,
  priority: 1,
  startsAt: "2026-09-20T00:00:00.000Z",
  expiresAt: "2026-09-30T00:00:00.000Z",
};
const now = new Date("2026-09-23T12:00:00.000Z");

describe("site announcement selection", () => {
  it("shows an enabled current announcement", () => {
    expect(selectSiteAnnouncement([current], now)?.id).toBe("current");
  });

  it("hides future and expired announcements", () => {
    expect(selectSiteAnnouncement([{ ...current, startsAt: "2026-09-24T00:00:00.000Z" }], now)).toBeNull();
    expect(selectSiteAnnouncement([{ ...current, expiresAt: "2026-09-23T12:00:00.000Z" }], now)).toBeNull();
  });

  it("hides only the dismissed ID so a newer announcement can still appear", () => {
    const newer = { ...current, id: "newer", startsAt: "2026-09-22T00:00:00.000Z" };
    expect(selectSiteAnnouncement([current, newer], now, ["current"])?.id).toBe("newer");
    expect(selectSiteAnnouncement([current], now, ["current"])).toBeNull();
  });

  it("chooses highest priority, then newest start date", () => {
    const high = { ...current, id: "high", priority: 10, startsAt: "2026-09-19T00:00:00.000Z" };
    const newest = { ...current, id: "newest", startsAt: "2026-09-22T00:00:00.000Z" };
    expect(selectSiteAnnouncement([current, newest, high], now)?.id).toBe("high");
    expect(selectSiteAnnouncement([current, newest], now)?.id).toBe("newest");
  });

  it("parses safe unique dismissal IDs and ignores invalid storage", () => {
    expect(parseDismissedAnnouncementIds('["current","current","newer",1]')).toEqual(["current", "newer"]);
    expect(parseDismissedAnnouncementIds("not-json")).toEqual([]);
  });
});
