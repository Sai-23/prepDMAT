"use client";

import {
  CheckCircle2,
  Info,
  Sparkles,
  TriangleAlert,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { SITE_ANNOUNCEMENTS, type SiteAnnouncement, type SiteAnnouncementType } from "@/config/site-announcements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DISMISSED_ANNOUNCEMENTS_KEY,
  parseDismissedAnnouncementIds,
  selectSiteAnnouncement,
} from "@/lib/site-announcements/selection";
import { cn } from "@/lib/utils";

const variantDetails: Record<SiteAnnouncementType, {
  icon: LucideIcon;
  iconClassName: string;
  badgeVariant: "default" | "subtle" | "success" | "warning";
}> = {
  resolved: { icon: CheckCircle2, iconClassName: "text-success", badgeVariant: "success" },
  info: { icon: Info, iconClassName: "text-primary", badgeVariant: "default" },
  new: { icon: Sparkles, iconClassName: "text-primary", badgeVariant: "default" },
  maintenance: { icon: Wrench, iconClassName: "text-on-surface-variant", badgeVariant: "subtle" },
  warning: { icon: TriangleAlert, iconClassName: "text-warning", badgeVariant: "warning" },
};

const dismissalChangeEvent = "prepdmat:announcements-changed";

function subscribeToDismissals(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(dismissalChangeEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(dismissalChangeEvent, callback);
  };
}

function getDismissalSnapshot(): string {
  try {
    return window.localStorage.getItem(DISMISSED_ANNOUNCEMENTS_KEY) ?? "";
  } catch {
    return "";
  }
}

const getServerDismissalSnapshot = () => "";
const subscribeToHydration = () => () => undefined;
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

export function SiteAnnouncementCard({
  announcement,
  onDismiss,
}: {
  announcement: SiteAnnouncement;
  onDismiss?: () => void;
}) {
  const type = announcement.type ?? "info";
  const details = variantDetails[type];
  const Icon = details.icon;

  return (
    <aside
      aria-label={`Site announcement: ${announcement.title}`}
      className="site-announcement-enter relative min-w-0 overflow-hidden rounded-xl border-2 border-primary/45 bg-gradient-to-br from-primary-muted via-surface-lowest to-surface-low p-4 shadow-sm sm:p-5"
      data-announcement-variant={type}
      role="region"
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-primary" />
      {announcement.dismissible ? (
        <button
          aria-label={`Dismiss ${announcement.title}`}
          className="absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-high hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onClick={onDismiss}
          type="button"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      ) : null}

      <div className="grid min-w-0 gap-4 pr-8 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:pr-8">
        <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2">
          <span className="inline-flex size-9 items-center justify-center rounded-lg border border-workspace-border bg-surface-lowest shadow-sm">
            <Icon aria-hidden="true" className={cn("size-5", details.iconClassName)} />
          </span>
          <Badge variant={details.badgeVariant}>{type}</Badge>
        </div>

        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-on-surface sm:text-lg">{announcement.title}</h2>
          <p className="mt-1 text-sm leading-6 text-on-surface-variant">{announcement.message}</p>
        </div>

        {(announcement.href && announcement.ctaLabel) || (announcement.secondaryHref && announcement.secondaryLabel) ? (
          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
            {announcement.href && announcement.ctaLabel ? (
              <Button asChild className="w-full sm:w-auto" size="sm">
                <Link href={announcement.href}>{announcement.ctaLabel}</Link>
              </Button>
            ) : null}
            {announcement.secondaryHref && announcement.secondaryLabel ? (
              <Link
                className="inline-flex min-h-10 items-center justify-center rounded-md px-3 text-sm font-semibold text-primary hover:bg-primary-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                href={announcement.secondaryHref}
              >
                {announcement.secondaryLabel}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}

export function SiteAnnouncementBanner({
  enabled,
  announcements = SITE_ANNOUNCEMENTS,
}: {
  enabled: boolean;
  announcements?: readonly SiteAnnouncement[];
}) {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const storedDismissals = useSyncExternalStore(
    subscribeToDismissals,
    getDismissalSnapshot,
    getServerDismissalSnapshot,
  );
  const [sessionDismissals, setSessionDismissals] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const dismissedIds = useMemo(
    () => [...new Set([...parseDismissedAnnouncementIds(storedDismissals), ...sessionDismissals])],
    [sessionDismissals, storedDismissals],
  );

  const announcement = useMemo(() => {
    if (!enabled || !hydrated) return null;
    return selectSiteAnnouncement(announcements, new Date(currentTime), dismissedIds);
  }, [announcements, currentTime, dismissedIds, enabled, hydrated]);

  useEffect(() => {
    if (!announcement?.expiresAt) return;
    const remaining = Date.parse(announcement.expiresAt) - Date.now();
    const timer = window.setTimeout(
      () => setCurrentTime(Date.now()),
      Math.max(0, Math.min(remaining + 25, 2_147_483_647)),
    );
    return () => window.clearTimeout(timer);
  }, [announcement]);

  const dismiss = useCallback(() => {
    if (!announcement) return;
    const next = [...new Set([...dismissedIds, announcement.id])];
    setSessionDismissals((current) => [...new Set([...current, announcement.id])]);
    try {
      window.localStorage.setItem(DISMISSED_ANNOUNCEMENTS_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(dismissalChangeEvent));
    } catch {
      // Session dismissal still succeeds when persistent storage is unavailable.
    }
  }, [announcement, dismissedIds]);

  return announcement ? <SiteAnnouncementCard announcement={announcement} onDismiss={dismiss} /> : null;
}
