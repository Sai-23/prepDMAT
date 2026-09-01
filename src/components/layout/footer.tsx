import { ExternalLink, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/practice", label: "Practice" },
  { href: "/tests", label: "Mock Tests" },
  { href: "/progress", label: "Progress" },
  { href: "/exam-format", label: "Exam Format" },
  { href: "/diagnostic", label: "Free Diagnostic" },
] as const;

const independenceDisclaimer =
  "PrepDMAT is an independent preparation platform and is not affiliated with or endorsed by the official dMAT examination authorities or participating universities.";

export function resolveInstagramUrl(value: string | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const isInstagramHost = hostname === "instagram.com" || hostname === "www.instagram.com";

    return url.protocol === "https:" && isInstagramHost ? url.toString() : null;
  } catch {
    return null;
  }
}

export function Footer({
  currentYear,
  instagramUrl,
}: {
  currentYear: number;
  instagramUrl?: string;
}) {
  const instagramHref = resolveInstagramUrl(instagramUrl);

  return (
    <footer
      className="border-t border-workspace-border bg-surface-low"
      data-site-footer
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1.4fr)_minmax(10rem,0.7fr)_minmax(13rem,0.9fr)] md:gap-8 lg:gap-14">
          <section aria-labelledby="footer-brand-heading" className="max-w-md">
            <Link
              aria-label="PrepDMAT home"
              className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-low"
              href="/"
            >
              <Image
                alt="PrepDMAT"
                className="prepdmat-logo-light h-auto w-[220px] max-w-full object-contain"
                height={300}
                src="/branding/logo/prepdmat-logo-light.png"
                width={800}
              />
              <Image
                alt="PrepDMAT"
                className="prepdmat-logo-dark h-auto w-[220px] max-w-full object-contain"
                height={300}
                src="/branding/logo/prepdmat-logo-dark.png"
                width={800}
              />
            </Link>
            <h2 className="mt-1 text-base font-semibold text-on-surface" id="footer-brand-heading">
              Prepare with clarity.
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-on-surface-variant">
              Focused dMAT preparation with practice, mock tests, clear explanations and performance insights.
            </p>
          </section>

          <nav aria-labelledby="footer-quick-links-heading">
            <h2 className="text-sm font-semibold text-on-surface" id="footer-quick-links-heading">
              Quick Links
            </h2>
            <ul className="mt-4 grid gap-1">
              {quickLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    className="inline-flex min-h-11 items-center rounded-md text-sm text-on-surface-variant transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-low"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-8">
            <section aria-labelledby="footer-support-heading">
              <h2 className="text-sm font-semibold text-on-surface" id="footer-support-heading">
                Support
              </h2>
              <p className="mt-4 text-sm text-on-surface-variant">Questions or feedback?</p>
              <a
                className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-primary transition-colors hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-low"
                href="mailto:info@prepdmat.in"
              >
                <Mail aria-hidden="true" className="h-4 w-4" />
                info@prepdmat.in
              </a>
            </section>

            {instagramHref ? (
              <section aria-labelledby="footer-social-heading">
                <h2 className="text-sm font-semibold text-on-surface" id="footer-social-heading">
                  Follow PrepDMAT
                </h2>
                <a
                  aria-label="Follow PrepDMAT on Instagram (opens in a new tab)"
                  className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md text-sm text-on-surface-variant transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-low"
                  href={instagramHref}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <ExternalLink aria-hidden="true" className="h-4 w-4" />
                  Instagram
                </a>
              </section>
            ) : null}
          </div>
        </div>

        <div className="mt-10 border-t border-workspace-separator pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-on-surface-variant">
              © {currentYear} PrepDMAT. All rights reserved.
            </p>
            <Link
              className="inline-flex min-h-11 items-center text-sm font-medium text-on-surface-variant transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              href="/privacy"
            >
              Privacy Policy
            </Link>
          </div>
          <p className="mt-4 max-w-4xl text-xs leading-5 text-muted-foreground">
            {independenceDisclaimer}
          </p>
        </div>
      </div>
    </footer>
  );
}
