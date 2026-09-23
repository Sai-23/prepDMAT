import type { SiteAnnouncement } from "@/config/site-announcements";

export const DISMISSED_ANNOUNCEMENTS_KEY = "prepdmat.dismissedAnnouncements";

function timestamp(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function parseDismissedAnnouncementIds(value: string | null): string[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? [...new Set(parsed.filter((id): id is string => typeof id === "string" && id.length > 0))]
      : [];
  } catch {
    return [];
  }
}

export function selectSiteAnnouncement(
  announcements: readonly SiteAnnouncement[],
  now: Date,
  dismissedIds: readonly string[] = [],
): SiteAnnouncement | null {
  const currentTime = now.getTime();
  if (Number.isNaN(currentTime)) return null;

  const dismissed = new Set(dismissedIds);
  return [...announcements]
    .filter((announcement) => {
      if (!announcement.enabled || dismissed.has(announcement.id)) return false;
      const startsAt = timestamp(announcement.startsAt, Number.NEGATIVE_INFINITY);
      const expiresAt = timestamp(announcement.expiresAt, Number.POSITIVE_INFINITY);
      return currentTime >= startsAt && currentTime < expiresAt;
    })
    .sort((left, right) => {
      const priorityDifference = (right.priority ?? 0) - (left.priority ?? 0);
      if (priorityDifference !== 0) return priorityDifference;

      const startDifference = timestamp(right.startsAt, Number.NEGATIVE_INFINITY)
        - timestamp(left.startsAt, Number.NEGATIVE_INFINITY);
      return startDifference !== 0 ? startDifference : right.id.localeCompare(left.id);
    })[0] ?? null;
}
