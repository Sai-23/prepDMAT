import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const component = source("src/components/site-announcement.tsx");
const dashboard = source("src/app/dashboard/page.tsx");
const practicePage = source("src/app/practice/page.tsx");
const practiceExperience = source("src/components/practice/practice-experience.tsx");
const selection = source("src/lib/site-announcements/selection.ts");
const styles = source("src/app/globals.css");

describe("site announcement integration contract", () => {
  it("shows on Dashboard and in the Practice library", () => {
    expect(dashboard).toContain("<SiteAnnouncementBanner enabled={siteAnnouncementsEnabled}");
    expect(practicePage).toContain("<SiteAnnouncementBanner enabled={siteAnnouncementsEnabled}");
  });

  it("keeps the announcement out of an active or resumed Practice session", () => {
    expect(practicePage.indexOf("<SiteAnnouncementBanner")).toBeLessThan(practicePage.indexOf("libraryIntro={libraryIntro}"));
    expect(practiceExperience.indexOf("if (session)")).toBeLessThan(practiceExperience.indexOf("{libraryIntro}"));
  });

  it("persists dismissal by ID and supports automatic expiration", () => {
    expect(selection).toContain("prepdmat.dismissedAnnouncements");
    expect(component).toContain("window.localStorage.setItem");
    expect(component).toContain("announcement.expiresAt");
    expect(component).toContain("window.setTimeout");
  });

  it("uses a one-time reduced-motion-safe entrance", () => {
    expect(styles).toContain("@keyframes site-announcement-enter");
    expect(styles).toContain("animation: site-announcement-enter 220ms ease-out both");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).toContain("animation: none");
    expect(component).not.toMatch(/pulse|bounce|shake/);
  });
});
