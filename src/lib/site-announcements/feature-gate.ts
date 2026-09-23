import "server-only";

/** Narrow, fail-closed check that deliberately avoids full environment validation. */
export function isSiteAnnouncementsEnabled(): boolean {
  return process.env.SITE_ANNOUNCEMENTS_ENABLED === "true"
    && process.env.NEXT_PUBLIC_SITE_ANNOUNCEMENTS_ENABLED === "true";
}
