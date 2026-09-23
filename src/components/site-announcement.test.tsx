import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { SiteAnnouncement, SiteAnnouncementType } from "@/config/site-announcements";

import { SiteAnnouncementCard } from "./site-announcement";

function announcement(type: SiteAnnouncementType): SiteAnnouncement {
  return {
    id: `${type}-announcement`,
    type,
    title: `${type} title`,
    message: "A concise product update.",
    enabled: true,
    href: "/practice",
    ctaLabel: "Try Practice",
    secondaryHref: "/practice#core-modules",
    secondaryLabel: "What changed?",
    dismissible: true,
  };
}

describe("site announcement card", () => {
  it.each(["resolved", "info", "new", "maintenance", "warning"] as const)(
    "renders the %s variant",
    (type) => {
      const html = renderToStaticMarkup(<SiteAnnouncementCard announcement={announcement(type)} />);
      expect(html).toContain(`data-announcement-variant="${type}"`);
      expect(html).toContain(`>${type}</div>`);
    },
  );

  it("renders accessible actions and the configured destinations", () => {
    const html = renderToStaticMarkup(<SiteAnnouncementCard announcement={announcement("resolved")} />);
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Site announcement: resolved title"');
    expect(html).toContain('aria-label="Dismiss resolved title"');
    expect(html).toContain('href="/practice"');
    expect(html).toContain('href="/practice#core-modules"');
    expect(html).toContain("Try Practice");
    expect(html).toContain("What changed?");
  });

  it("uses mobile-first stacking without horizontal overflow", () => {
    const html = renderToStaticMarkup(<SiteAnnouncementCard announcement={announcement("info")} />);
    expect(html).toContain("min-w-0");
    expect(html).toContain("flex-col");
    expect(html).toContain("sm:grid-cols-[auto_minmax(0,1fr)_auto]");
    expect(html).toContain("w-full");
  });
});
