# dMAT Prep student-experience audit

Audit date: 2026-08-25

Scope: the public and signed-in student journey on desktop, tablet, and mobile, in light and dark themes. Generator, grading, analytics, persistence, and publishing internals are outside the redesign boundary.

Severity: P0 blocks a required journey; P1 causes major confusion or exam-format misinformation; P2 adds recurring friction; P3 is polish or an uncommon edge case.

## Top 10 UX problems

1. **P1 — Exam Format does not explain the exam.** It shows implementation language, badges, and no timing, question counts, test-day structure, or realistic examples.
2. **P1 — The landing page still reads like a product-development preview.** “MVP foundation,” “payloads,” architecture, and future-phase copy obscure the student benefit.
3. **P1 — Practice makes configuration compete with the main choice.** An always-visible setup card appears before a module is selected, and each module control contains five separate pieces of information.
4. **P1 — Student navigation is split between the header and workspace sidebar.** Dashboard and Progress are separated from Practice and Mock Tests; Home and Pricing remain prominent inside signed-in work.
5. **P1 — Mock entry does not make official-format versus custom tests instantly distinguishable.** The generated full Core mock is described accurately but buried in a promotional card above a mixed catalog.
6. **P1 — Mock navigation relies heavily on fill colour.** Current, answered, unanswered, and flagged states need persistent labels or symbols as well as colour.
7. **P2 — Progress leads with measurement methodology.** Confidence thresholds, evidence rules, normalized estimates, source mix, and detailed history compete with “How am I doing?” and “What should I practise?”
8. **P2 — Results expose analysis terminology before the recovery path.** Weighted marks, metadata, snapshots, and timing caveats are more prominent than reviewing mistakes and taking one next action.
9. **P2 — Repeated cards, borders, badges, and explanatory paragraphs weaken hierarchy.** The same visual weight is used for primary tasks, context, metrics, and implementation notes.
10. **P2 — Several empty/loading/error and onboarding messages describe system state rather than a calm next step.** Phase labels and “validated” content make incomplete states feel technical.

## Route and component findings

| Route | Component | Problem | Severity | Why it creates confusion | Recommended solution | Implemented? | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | `src/app/page.tsx`, marketing components | Product-development preview copy, four dense feature cards, MVP/architecture language, and an inaccurate diagnostic CTA destination | P1 | Students cannot quickly tell what the product helps them do | Lead with preparation outcomes, show the three student benefits, and route the diagnostic CTA to onboarding | No | Preserve independent-product disclaimer |
| `/exam-format` | `src/app/exam-format/page.tsx` | No real structure, counts, timing, test-day context, or authentic examples; copy is almost entirely internal engineering language | P1 | Fails the page’s core purpose and undermines trust | Present the two-part exam, exact Core contract, current General Academic Module context, and full-width static examples using Practice renderers | No | Repository protocol is already 20 questions / 25 minutes for each Core subtest |
| `/practice` | `PracticeExperience` | Module controls are text-heavy; performance empties repeat three times; configuration is visible before selection | P1 | The student must parse too much before the first action | Use three concise selectable modules; reveal compact segmented setup only after selection | No | Preserve initial deep links and session resume |
| `/practice` active | `PracticeSession`, `NativePracticeResponse` | Sticky card header, metadata line, badges, timing note, answer card, and report affordance compete with the question | P2 | Reduces focus during the learning task | Keep module, progress, prompt, response, and one primary Check Answer action dominant | No | Preserve immediate feedback and explanation architecture |
| `/practice` feedback | module feedback components | Strong explanations are surrounded by multiple cards and competing actions | P2 | Correct/incorrect outcome and next step are slower to scan | Make result concise, retain the rich explanation below, keep Next Question as the clear primary action | No | No explanation logic changes |
| `/practice/review/[sessionId]` | `PracticeReview` | Review hierarchy needs alignment with the simplified active session | P3 | Context switching feels like another product surface | Reuse concise summary and progressive question review treatment | No | Preserve all saved answers |
| `/tests` | mock catalog and generated mock CTA | Official full mock and custom/published tests are not clearly grouped; admin-oriented empty copy leaks to students | P1 | Students cannot tell which option best matches the real Core exam | Add a prominent official-format option and label other tests as custom practice mocks | No | Full Core contract remains 60 questions, approximately 90 minutes |
| `/tests/[testId]` | test overview | Dense instruction card and equal-weight metrics; strict end-subtest behavior is not explicit | P2 | Students may begin without understanding navigation boundaries | Use a short readiness checklist and a visible boundary warning where applicable | No | Do not change section transition rules without evidence |
| `/tests/[testId]/take` | `TestRunner` | Navigator states are mostly encoded with colour; submit is always visually prominent; question chrome is dense | P1 | Status is less accessible and the final action distracts during every question | Add shape/text status cues, simplify header, and keep submission deliberate | No | Preserve autosave, timeout, delayed feedback, and sequential sections |
| `/results` | result history | Technical origin/status labels and “raw accuracy” lead each item | P2 | The history reads like an audit log rather than a student record | Lead with test title, result, date, and Review | No | Preserve origin data internally |
| `/results?attempt=…` | `MockAnalysisView`, `ResultReview` | Valuable score-first layout is followed by too many equally prominent sections and internal analysis wording | P2 | Next best action and mistake review get buried | Keep score and section performance first, then one recommended action and mistakes; place methodology later | No | No analytics calculation changes |
| `/progress` | progress page | Detailed measurement model, thresholds, source comparison, and repeated module cards dominate | P2 | Students must understand analytics internals to decide what to do next | Put overall/module progress and strongest/needs-work first; move detail lower and translate copy | No | Data model remains unchanged |
| `/dashboard` | dashboard page | Primary action is good, but quick actions duplicate navigation and Phase/evidence copy leaks into progress | P2 | Repetition adds visual weight after the key action | Keep next action first, simplify Core progress, then recent activity; remove phase language | No | Preserve recommendation ordering |
| `/onboarding` | `OnboardingExperience` | Five educational cards and confidence thresholds make the introduction feel like documentation | P2 | Adds effort before the first useful task | Reduce to a welcome, the three formats, and Start diagnostic / Explore first | No | Diagnostic remains optional where current architecture permits |
| `/onboarding/diagnostic` | `DiagnosticExperience` | Core interaction is sound but inherits the full workspace shell and explanatory chrome | P3 | Diagnostic content is not as dominant as it could be | Keep the saved-answer flow; shorten framing and ensure the action remains thumb-friendly | No | Existing 15-question 5+5+5 contract remains frozen |
| `/onboarding/diagnostic/summary` | summary page | Confidence vocabulary and two large cards delay the recommended next action | P3 | Students need the starting direction more than methodology | Lead with score and recommendation; keep module breakdown concise | No | No grading changes |
| `/login`, `/register`, password routes | auth forms/providers | Auth works but must be checked for narrow-screen CTA order, safe errors, and copy density | P3 | Entry friction can prevent reaching the student journey | Retain architecture; verify focus, errors, wrapping, and mobile actions | No | No auth/security changes |
| `/profile` | profile/theme preferences | Secondary settings are correctly separate but should not compete in primary navigation | P3 | A prominent Profile destination adds navigation load | Keep account access in the header and secondary mobile menu | No | Preserve preferences |
| `/mistakes`, `/bookmarks` | learning libraries | Useful secondary tools occupy the same sidebar level as core journeys | P2 | Primary destinations are harder to identify | Move to a secondary “Review” group or contextual links | No | Preserve filters and stored items |
| Global student shell | header, sidebar, workspace shell | Two navigation systems, numbered links, “Student desk,” Zen Mode, and “Technical academic workspace” frame the product as tooling | P1 | Competing shells fail the three-second orientation test | Use one clear student hierarchy: Dashboard, Practice, Mock Tests, Progress; keep Exam Format and review tools secondary | No | Admin/reviewer navigation remains untouched |
| Global loading/error/empty | route states and shared states | Several messages mention phases, publishing, or system details | P2 | Errors and empty states do not consistently answer what to do next | Use concise, safe messages with a single recovery action where available | No | Do not expose provider/database details |
| Global responsive/theme | CSS tokens and route compositions | Tokens support both themes, but dense card grids and multi-column metrics need viewport verification | P2 | Narrow screens can turn secondary details into the dominant content | Audit 320, 375, 430, tablet, and desktop widths in both themes; eliminate horizontal overflow | No | Browser verification required after implementation |

## Protocol discrepancy audit

The repository’s current authority chain is internally consistent:

- `DMAT_CURRENT_CORE_PROTOCOL` defines Figure Sequences, Mathematical Equations, and Latin Squares as **20 questions and 25 minutes each**.
- `DMAT_EXAM_SPEC` consumes that protocol and requires an official full Core mock to contain all three sections.
- The current official TestAS structure states the same three subtests, **20 items each**, **25 minutes each**, and approximately **90 minutes total including instructions**.
- The current dMAT information for India states that applicants targeting the summer semester 2027 or later in the listed fields take the Core Module plus the General Academic Module. It describes that second module as applying cognitive and analytical skills to academic problem solving rather than testing memorised facts.

Therefore, there is no stale protocol constant to correct. The discrepancy is presentational: the existing Exam Format page omits these facts, and the mock entry does not clearly label the 60-question Core simulation. The redesign must not infer unsupported General Academic Module item counts or fabricate a sample question.

## Implementation outcome

The table above remains the requested pre-redesign snapshot. Final outcomes for this release:

| Area | Outcome | Verification |
| --- | --- | --- |
| Landing | Implemented | Student purpose, benefits, Core structure, and clear start actions replace development-preview copy |
| Exam Format | Implemented | Current protocol, test-day context, General Academic Module boundary, and three real Practice renderers covered by contract tests |
| Practice entry/configuration | Implemented | Module-first selection, concise controls, conditional setup, retained session and feedback architecture |
| Practice active/feedback/review | Partially simplified | Question and primary action remain dominant; protected rich explanation and review components were deliberately retained |
| Mock catalog/overview/runner | Implemented | Full official-format Core option separated from custom mocks; strict section warning and four non-colour navigator states covered by tests |
| Results | Implemented | Score and sections first, one next action, student-language analysis, detailed review retained lower down |
| Progress | Implemented | Three module summaries and next practice action first; methodology translated and moved lower |
| Dashboard | Implemented | Resume/recommendation first, then Core progress and recent activity; duplicate quick-action card grid removed |
| Navigation | Implemented | Dashboard, Practice, Mock Tests, and Progress are the primary order; Exam Format is secondary and account access stays in the header |
| Onboarding | Implemented | One concise starting screen replaces the three-step documentation flow; diagnostic architecture unchanged |
| Auth/profile/review libraries | Preserved | Existing secure flows retained; Profile stays in the account control and review libraries remain secondary |
| Loading/error/empty copy | Partially simplified | Main student routes updated; remaining route-specific P3 copy is listed below |
| Responsive/theme | Contract-verified | Narrow-screen classes, theme tokens, focus states, reduced motion, and renderer output pass; live browser runtime was unavailable |

## Remaining P2/P3 follow-up

- Run a signed-in visual pass at 320, 375, 430, tablet, and desktop widths in both themes when an in-app browser session is available.
- Consider progressively disclosing the lowest Progress methodology sections after observing real student usage.
- Align the Practice review page’s outer spacing with the simplified active-session surface without changing its explanation content.
- Review every low-frequency auth and library empty/error state in the live browser; their security and persistence behavior was intentionally untouched.
