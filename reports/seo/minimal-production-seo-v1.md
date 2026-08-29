# PrepDMAT minimal production SEO v1

Date: 2026-08-29  
Canonical production origin: `https://prepdmat.in`  
Verdict: **SEO FOUNDATION NEEDS MANUAL VERIFICATION**

The repository now has a small, technically explicit SEO foundation. Code-level checks pass. The remaining work requires the deployed domain, DNS, redirects and Google Search Console, so it cannot be truthfully marked domain-launch ready from a local build alone.

## 1. Routes audited

All App Router pages and route handlers under `src/app` were enumerated. The substantive public acquisition pages are:

- `/`
- `/exam-format`
- `/diagnostic`

The audit also covered public navigation/footer links, authentication and callback routes, the student application, onboarding, diagnostic attempt/result routes, administration, API routes, the retired `/pricing` redirect, and unknown-route handling.

No additional indexable pages were created. The remaining routes are authenticated application surfaces, authentication utilities, transient results/attempts, administration, or non-document handlers.

## 2. Index/noindex matrix

| Route or family | Decision | Control |
|---|---|---|
| `/` | INDEX | Page metadata: `index, follow`; self-canonical |
| `/exam-format` | INDEX | Page metadata: `index, follow`; self-canonical |
| `/diagnostic` | INDEX | Page metadata: `index, follow`; self-canonical |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | NOINDEX | Segment layout metadata: `noindex, nofollow` |
| `/dashboard`, `/practice/*`, `/tests/*`, `/results/*`, `/progress`, `/mistakes`, `/bookmarks`, `/profile` | NOINDEX | Segment layout metadata: `noindex, nofollow` |
| `/onboarding/*` | NOINDEX | Parent segment layout metadata: `noindex, nofollow` |
| `/diagnostic/take`, `/diagnostic/result` | NOINDEX | Child segment layout metadata overrides the public diagnostic parent |
| `/admin/*` | NOINDEX | Parent segment layout metadata: `noindex, nofollow` |
| `/auth/*`, `/api/*` | NOINDEX | `X-Robots-Tag: noindex, nofollow` response header |
| `/pricing` | Not indexable content | Existing temporary redirect to `/`; excluded from sitemap |
| Unknown pages | NOINDEX + 404 | Genuine HTTP 404 verified; explicit not-found robots metadata |

`noindex` is only an SEO control. Existing authentication, ownership checks and RLS remain the security controls and were not changed by this work.

## 3. Titles and descriptions

| Page | Resulting title | Description |
|---|---|---|
| `/` | `dMAT Preparation & Mock Tests | PrepDMAT` | `Prepare for the dMAT Core Module with practice questions, a free diagnostic and mock tests for Figure Sequences, Mathematical Equations and Latin Squares.` |
| `/exam-format` | `dMAT Exam Format & Core Module | PrepDMAT` | `Understand the dMAT Core Module format, including Figure Sequences, Mathematical Equations and Latin Squares, with timings and preparation guidance.` |
| `/diagnostic` | `Free dMAT Diagnostic Test | PrepDMAT` | `Take a free dMAT Core diagnostic covering Figure Sequences, Mathematical Equations and Latin Squares. No account required to start.` |

The root template is `%s | PrepDMAT`; the homepage uses an absolute title so the brand is not duplicated. No `meta keywords` tag was added.

## 4. Canonical implementation

`src/lib/site-config.ts` is the single SEO identity source:

- site name: `PrepDMAT`
- canonical origin: `https://prepdmat.in`
- default title and description
- canonical URL helper
- shared index/noindex robots metadata
- minimal WebSite structured data

`metadataBase` is fixed to that production origin rather than an environment-derived Vercel preview or localhost origin. Each indexable page has a distinct self-canonical. Authentication callback origin configuration remains separate and environment-driven so localhost development is not broken.

## 5. Sitemap contents

`/sitemap.xml` is produced by the Next.js metadata route and contains exactly:

- `https://prepdmat.in/`
- `https://prepdmat.in/exam-format`
- `https://prepdmat.in/diagnostic`

It has no speculative `changefreq`, dishonest `lastModified`, private page, admin page, authentication route, attempt or result URL.

## 6. Robots implementation

`/robots.txt` is produced by the Next.js metadata route. It:

- permits public crawling;
- disallows the private, auth, API, utility, attempt and administration route families;
- declares `Host: https://prepdmat.in`;
- references `https://prepdmat.in/sitemap.xml`.

Private page exclusion does not depend on robots.txt: document pages also emit `noindex`, and route handlers receive `X-Robots-Tag`.

## 7. Structured data

The homepage emits one server-rendered `application/ld+json` object:

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "PrepDMAT",
  "url": "https://prepdmat.in/"
}
```

No Organization, Course, FAQ, review, rating or institutional relationship was fabricated.

## 8. Server-rendered content findings

- The homepage purpose, product description, three Core modules, diagnostic CTA and exam-format link are emitted from a Server Component.
- `/exam-format` has one semantic H1, useful existing evidence-classified content and logical H2 sections. Its factual protocol copy was not changed for SEO.
- `/diagnostic` has a server-rendered H1 and explanatory text covering the three modules, 15-question format, no-account start and secure result timing. Existing resume redirects remain intact.
- Primary content does not require `useEffect`, tab interaction or bot-specific rendering.

No answer key, question-bank internals, private diagnostic state or user data was added to metadata or public copy.

## 9. Internal-link findings

The homepage contains crawlable Next.js links to:

- `Exam Format` → `/exam-format`
- `Free Diagnostic` / `Take the free diagnostic` → `/diagnostic`

The public header and footer retain real anchor navigation to both pages. Buttons are used as styled action affordances with links as the underlying navigation element. No private route was exposed merely for SEO.

## 10. Duplicate-host handling

All application-generated canonical, Open Graph, sitemap and structured-data URLs point to `https://prepdmat.in`, never the Vercel hostname.

The application deliberately does not perform a host-based redirect: doing so in repository middleware/config could break localhost and Vercel previews. After the custom domain is live, configure the deployment platform so:

`https://prep-dmat.vercel.app/<path>?<query>` permanently redirects to `https://prepdmat.in/<path>?<query>`.

Use a permanent `301` or `308`, preserve path/query, and verify several nested URLs. Google recommends permanent redirects for duplicate/old hosts and checking the new canonical annotations after activation: [Google site-move guidance](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes).

## 11. Performance impact

- No npm dependency was added.
- No analytics, tag manager or SEO runtime package was added.
- Metadata, sitemap, robots and JSON-LD are server/static output.
- No new Client Component or hydration boundary was introduced.
- Existing diagnostic client output is unchanged; all new route layouts are pass-through Server Components.

Expected client-JavaScript impact: effectively zero. Production bundle compilation remains the final guard.

## 12. Tests

Added `src/lib/seo/minimal-seo.test.ts` with eight contract tests covering:

1. centralized production canonical configuration;
2. unique public titles, descriptions, canonicals and index rules;
3. private route metadata and handler headers;
4. exact sitemap membership;
5. robots and sitemap reference;
6. minimal truthful WebSite JSON-LD;
7. H1s, module terminology and crawlable public links;
8. absence of meta keywords/missing social-image references and presence of icons.

Results:

- Targeted SEO: **8 passed**
- Full regression: **129 files passed, 17 skipped; 739 tests passed, 27 skipped**
- Skips are the repository's existing opt-in suites; no SEO failure was skipped.
- `npm audit`: **0 vulnerabilities**

## 13. Build and static verification

Completed checks:

- ESLint: passed
- Next route type generation: passed
- TypeScript (`tsc --noEmit`): passed
- Targeted SEO tests: 8 passed
- Full regression: 739 passed, 27 existing opt-in tests skipped
- Production build: passed (Next.js 16.3.3; 39 routes generated)
- `git diff --check`: passed (line-ending conversion notices only; no whitespace errors)
- `npm audit`: 0 vulnerabilities
- Local production HTTP inspection:
  - all three public pages returned HTTP 200 with unique metadata and correct canonical URLs;
  - `/login` emitted `noindex, nofollow`;
  - `/robots.txt` referenced the canonical sitemap;
  - `/sitemap.xml` contained exactly three URLs;
  - an unknown public route returned HTTP 404;
  - an auth handler response carried `X-Robots-Tag: noindex, nofollow`.

## 14. Manual production steps

1. Add and verify `prepdmat.in` as the production custom domain in Vercel; complete the required DNS records and confirm TLS is valid.
2. Set the production authentication origin (`NEXT_PUBLIC_APP_URL`) to `https://prepdmat.in`. The SEO canonical does not depend on this variable, but authentication callbacks do.
3. Update the production Supabase Site URL and redirect allowlist to include `https://prepdmat.in/auth/callback`. Retain appropriate localhost entries only for development.
4. Make `prepdmat.in` the primary deployment domain.
5. Configure the Vercel hostname to permanently redirect to the same path/query on `prepdmat.in`; do this at the platform/domain layer so preview deployments and localhost keep working.
6. On the live deployment, inspect `/`, `/exam-format`, `/diagnostic`, `/login`, `/robots.txt`, `/sitemap.xml`, a nested callback response and an unknown path.
7. Confirm the old-host redirects are permanent and every final response/canonical uses HTTPS and `prepdmat.in`.

## 15. Google Search Console steps

1. Add a **Domain property** for `prepdmat.in` in Search Console. A Domain property covers protocols and subdomains and requires DNS verification: [Google property setup](https://support.google.com/webmasters/answer/34592).
2. Add the supplied DNS TXT verification record without removing unrelated DNS records; wait for propagation and verify ownership.
3. Submit `https://prepdmat.in/sitemap.xml` in the Sitemaps report. Google treats submission as a discovery hint, not an indexing guarantee: [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
4. Use URL Inspection on the homepage, exam-format page and diagnostic page. Confirm the user-declared canonical, live-test each URL, then request indexing where appropriate.
5. Inspect the Pages/Indexing report after Google has recrawled. Confirm private URLs are excluded by `noindex` and the three intended URLs are eligible for indexing.
6. Monitor Search performance, sitemap processing and crawl errors. Do not manufacture extra pages merely to increase indexed URL count.
7. If the Vercel hostname was previously indexed as a separate property, keep the permanent redirects active and monitor both hosts during consolidation.

## 16. Remaining optional SEO opportunities

These are deliberately non-blocking:

- Design a lightweight, properly sized branded Open Graph image and add it to Open Graph/Twitter metadata. No suitable social card currently exists, so text-only truthful social metadata is used.
- Reassess whether any future public guide has enough original student value to be indexed; do not create thin module pages for keyword coverage.
- After real production traffic exists, use Search Console evidence to refine titles or snippets rather than guessing pre-launch.
- Run a post-deployment Lighthouse/Core Web Vitals check on the canonical host.

No generator, grading, diagnostic security, RLS, authentication behavior, mock attempt logic or rate-limit threshold was changed for SEO.
