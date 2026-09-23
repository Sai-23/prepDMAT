import type { Route } from "next";

export type SiteAnnouncementType = "resolved" | "info" | "new" | "maintenance" | "warning";

export type SiteAnnouncement = {
  id: string;
  title: string;
  message: string;
  enabled: boolean;
  type?: SiteAnnouncementType;
  priority?: number;
  startsAt?: string;
  expiresAt?: string;
  href?: Route;
  ctaLabel?: string;
  secondaryHref?: Route;
  secondaryLabel?: string;
  dismissible?: boolean;
};

export const SITE_ANNOUNCEMENTS: readonly SiteAnnouncement[] = [
  {
    id: "practice-scroll-fixed-2026-09-23",
    type: "resolved",
    title: "Practice scrolling is fixed",
    message: "You can now scroll normally through all Core question types in Practice.",
    ctaLabel: "Try Practice",
    href: "/practice",
    secondaryLabel: "What changed?",
    secondaryHref: "/practice#core-modules",
    dismissible: true,
    enabled: true,
    priority: 100,
    startsAt: "2026-09-23T00:00:00.000Z",
    expiresAt: "2026-09-30T00:00:00.000Z",
  },
] as const;
