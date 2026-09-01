import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { indexRobots, siteConfig, siteUrl } from "@/lib/site-config";

const description =
  "Learn how PrepDMAT collects, uses, stores and handles account, assessment and preference information.";

export const metadata: Metadata = {
  title: { absolute: "Privacy Policy | PrepDMAT" },
  description,
  alternates: { canonical: "/privacy" },
  robots: indexRobots,
  openGraph: {
    type: "website",
    url: siteUrl("/privacy"),
    siteName: siteConfig.name,
    title: "Privacy Policy | PrepDMAT",
    description,
  },
  twitter: {
    card: "summary",
    title: "Privacy Policy | PrepDMAT",
    description,
  },
};

const sectionClass = "space-y-3";
const headingClass = "text-xl font-semibold tracking-tight text-on-surface sm:text-2xl";
const paragraphClass = "text-sm leading-7 text-on-surface-variant sm:text-base";
const listClass = "list-disc space-y-2 pl-5 text-sm leading-7 text-on-surface-variant sm:text-base";

export default function PrivacyPage() {
  return (
    <>
      <article className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <header className="border-b border-workspace-separator pb-8">
          <p className="text-sm font-semibold text-primary">Legal</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-on-surface sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Last updated: September 1, 2026
          </p>
        </header>

        <div className="mt-10 space-y-10">
          <section aria-labelledby="privacy-introduction" className={sectionClass}>
            <h2 className={headingClass} id="privacy-introduction">1. Introduction</h2>
            <p className={paragraphClass}>
              PrepDMAT is an independent online dMAT preparation platform. This Privacy Policy
              explains how information is collected, used, stored and handled when you use
              PrepDMAT.
            </p>
            <p className={paragraphClass}>
              Questions about this policy can be sent to{" "}
              <a className="font-medium text-primary hover:text-primary-hover hover:underline" href="mailto:info@prepdmat.in">
                info@prepdmat.in
              </a>.
            </p>
          </section>

          <section aria-labelledby="privacy-information" className={sectionClass}>
            <h2 className={headingClass} id="privacy-information">2. Information we collect</h2>
            <h3 className="text-base font-semibold text-on-surface sm:text-lg">Account information</h3>
            <p className={paragraphClass}>
              We process your email address, authentication account identifier, and optional name
              or profile information supplied by a supported sign-in provider. Authentication
              credentials are handled through Supabase Auth. PrepDMAT does not store raw passwords
              in its application database.
            </p>
            <h3 className="text-base font-semibold text-on-surface sm:text-lg">Profile and preferences</h3>
            <p className={paragraphClass}>
              We may store display or profile information where available, theme and interface
              preferences, onboarding status, diagnostic status, and your optional marketing email
              consent.
            </p>
            <h3 className="text-base font-semibold text-on-surface sm:text-lg">Learning and assessment information</h3>
            <p className={paragraphClass}>
              We store information created through diagnostics, practice sessions and mock tests.
              This can include questions shown, answers, correctness, scores, response and attempt
              timing, difficulty, progress, bookmarks, mistake-review notes, question reports, and
              performance or recommendation information.
            </p>
            <h3 className="text-base font-semibold text-on-surface sm:text-lg">Generated assessment metadata</h3>
            <p className={paragraphClass}>
              Where applicable, assessment records may include generation seeds, fingerprints,
              generator and validator versions, immutable question snapshots, quality information,
              and other provenance metadata. This helps preserve attempt history, produce accurate
              explanations and results, and improve question quality and reliability.
            </p>
            <h3 className="text-base font-semibold text-on-surface sm:text-lg">Public diagnostic</h3>
            <p className={paragraphClass}>
              If you begin the public diagnostic before creating an account, a temporary opaque
              diagnostic identifier may be stored in your browser. A hashed representation is
              stored server-side with the diagnostic questions, responses and result. The browser
              identifier does not directly contain your answers or email address.
            </p>
            <h3 className="text-base font-semibold text-on-surface sm:text-lg">Browser preferences</h3>
            <p className={paragraphClass}>
              Local browser storage may remember your theme, sidebar state, and zen or focus mode.
              PrepDMAT does not deliberately store answers or email addresses in localStorage.
            </p>
            <h3 className="text-base font-semibold text-on-surface sm:text-lg">Security and technical information</h3>
            <p className={paragraphClass}>
              Pseudonymous or hashed identifiers may be processed for security and rate limiting.
              Infrastructure providers may also process ordinary technical request information,
              such as IP address and browser information, while operating the service. PrepDMAT
              does not intentionally create advertising or device fingerprints.
            </p>
          </section>

          <section aria-labelledby="privacy-use" className={sectionClass}>
            <h2 className={headingClass} id="privacy-use">3. How information is used</h2>
            <p className={paragraphClass}>We use information to:</p>
            <ul className={listClass}>
              <li>Create and authenticate accounts, maintain sessions, verify email addresses, and support password recovery.</li>
              <li>Provide diagnostics, practice sessions and mock tests.</li>
              <li>Calculate scores and results, track progress, identify areas for improvement, and provide recommendations.</li>
              <li>Preserve attempt history and maintain bookmarks and mistake-review information.</li>
              <li>Investigate question reports and improve assessment quality and reliability.</li>
              <li>Maintain security, prevent abuse, and diagnose technical problems.</li>
              <li>Send optional PrepDMAT email updates when you have consented to receive them.</li>
            </ul>
            <p className={paragraphClass}>
              Account verification, security notices and essential service messages do not depend
              on marketing consent.
            </p>
          </section>

          <section aria-labelledby="privacy-storage" className={sectionClass}>
            <h2 className={headingClass} id="privacy-storage">4. Cookies and local storage</h2>
            <p className={paragraphClass}>
              Supabase authentication and session cookies support sign-in and session continuity.
              The public diagnostic uses a separate temporary cookie. That cookie is HttpOnly,
              uses SameSite=Lax, is Secure in production, and has an approximate two-hour lifetime.
            </p>
            <p className={paragraphClass}>
              Local storage may retain theme, sidebar, and zen or focus-mode choices so the
              interface remains consistent on the same browser. The current application does not
              use advertising cookies.
            </p>
          </section>

          <section aria-labelledby="privacy-providers" className={sectionClass}>
            <h2 className={headingClass} id="privacy-providers">5. Third-party service providers</h2>
            <ul className={listClass}>
              <li><strong className="text-on-surface">Supabase</strong> provides authentication, database storage, session handling, email verification and password recovery services.</li>
              <li><strong className="text-on-surface">Vercel</strong> provides application hosting and related infrastructure.</li>
              <li><strong className="text-on-surface">Google</strong> may process the authentication request and provide account information required for authentication if you choose to sign in with Google.</li>
            </ul>
            <p className={paragraphClass}>
              These providers process information according to their applicable terms and privacy
              practices while supplying services to PrepDMAT.
            </p>
          </section>

          <section aria-labelledby="privacy-marketing" className={sectionClass}>
            <h2 className={headingClass} id="privacy-marketing">6. Marketing communications</h2>
            <p className={paragraphClass}>
              PrepDMAT offers an optional email marketing preference. You can change this choice
              from your Profile. Essential account, verification, security and service messages
              are independent of this preference. PrepDMAT does not currently offer an SMS
              marketing option.
            </p>
          </section>

          <section aria-labelledby="privacy-retention" className={sectionClass}>
            <h2 className={headingClass} id="privacy-retention">7. Data retention</h2>
            <p className={paragraphClass}>
              Account-associated learning and assessment history may be retained while your
              account remains active unless deletion is otherwise required. This supports attempt
              history, results, progress and review features. PrepDMAT does not currently apply one
              fixed retention period to every category of account information.
            </p>
            <p className={paragraphClass}>
              Temporary anonymous public-diagnostic information is subject to shorter expiry and
              cleanup behaviour. Some operational, security or audit information may be retained
              separately where needed to operate and protect the service.
            </p>
          </section>

          <section aria-labelledby="privacy-security" className={sectionClass}>
            <h2 className={headingClass} id="privacy-security">8. Data security</h2>
            <p className={paragraphClass}>
              PrepDMAT uses reasonable technical and organizational safeguards, including managed
              authentication, access controls, database security policies, server-side validation,
              and rate limiting. No method of transmission or internet storage can guarantee
              absolute security.
            </p>
          </section>

          <section aria-labelledby="privacy-choices" className={sectionClass}>
            <h2 className={headingClass} id="privacy-choices">9. Your choices</h2>
            <p className={paragraphClass}>Current controls allow you to:</p>
            <ul className={listClass}>
              <li>Change supported appearance and interface preferences.</li>
              <li>Change your optional marketing email consent from Profile.</li>
              <li>Sign out or request a password reset.</li>
              <li>Manage bookmarks and mistake-review information where those controls are available.</li>
            </ul>
            <p className={paragraphClass}>
              PrepDMAT does not currently provide self-service account deletion or a self-service
              account data export. Contact{" "}
              <a className="font-medium text-primary hover:text-primary-hover hover:underline" href="mailto:info@prepdmat.in">
                info@prepdmat.in
              </a>{" "}
              for privacy or data-related requests.
            </p>
          </section>

          <section aria-labelledby="privacy-children" className={sectionClass}>
            <h2 className={headingClass} id="privacy-children">10. Children</h2>
            <p className={paragraphClass}>
              PrepDMAT is intended for people preparing for higher-education admissions and
              assessment. It is not designed as a service for children.
            </p>
          </section>

          <section aria-labelledby="privacy-international" className={sectionClass}>
            <h2 className={headingClass} id="privacy-international">11. International processing</h2>
            <p className={paragraphClass}>
              Service providers may process or store information in locations outside your
              country. Where applicable, information is handled subject to the safeguards and
              legal requirements relevant to that processing.
            </p>
          </section>

          <section aria-labelledby="privacy-changes" className={sectionClass}>
            <h2 className={headingClass} id="privacy-changes">12. Changes to this policy</h2>
            <p className={paragraphClass}>
              This Privacy Policy may be updated as PrepDMAT changes. The “Last updated” date will
              reflect material revisions to the policy.
            </p>
          </section>

          <section aria-labelledby="privacy-contact" className={sectionClass}>
            <h2 className={headingClass} id="privacy-contact">13. Contact</h2>
            <p className={paragraphClass}>
              For privacy questions or data-related requests, email{" "}
              <a className="font-medium text-primary hover:text-primary-hover hover:underline" href="mailto:info@prepdmat.in">
                info@prepdmat.in
              </a>.
            </p>
          </section>
        </div>
      </article>
      <SiteFooter />
    </>
  );
}
