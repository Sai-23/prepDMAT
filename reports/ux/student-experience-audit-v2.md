# PrepDMAT Student Experience Audit v2

## Scope and evidence

This audit covers the student Dashboard, Practice, Diagnostic, Mock, Progress, Results, Mistake Notebook, and Bookmarks surfaces. It is based on the supplied Practice screenshot, the rendered component hierarchy, route/data contracts, and source inspection. The in-app browser runtime reported that no browser was available, and the attachment contained no local screenshot files, so this report does not claim live viewport validation.

## Sticky Action Root Cause

The earlier `AssessmentShell` used `h-[calc(100dvh-5rem)]` inside a normal document-flow hierarchy. That height did not represent the actual space left by the global site header, `PageShell`/`WorkspaceShell` padding, heading, and footer. The document could therefore exceed the viewport even though the assessment component had its own internal scroll region. The action zone was the last child of that oversized shell, so it was present in the DOM but could sit partly below the usable viewport.

Before, the body could scroll while the assessment content also scrolled. Practice and Diagnostic retained the full workspace sidebar, and the footer/outer padding remained part of the page-height calculation. This produced nested vertical scroll ownership and reduced the width available to Figure Sequences.

## Scroll Architecture

Before:

`document/body scroll -> site main -> padded workspace + sidebar -> statically calculated assessment shell -> question scroll -> action zone`

Target:

`100dvh app frame -> fixed-size site header -> min-height:0 site main -> focused workspace -> assessment header + one question-content scroll region + shrink-0 action zone`

Only the question-content region should own substantial vertical scrolling during an active assessment.

## Figure Sequence Layout

The sequence strip used fixed-width `w-40` matrices, fixed gaps, `min-w-max`, and an expanded workspace sidebar. Its minimum width commonly exceeded the question workspace. The overflow belonged to a sequence container, but the layout forced desktop scrolling too readily and contributed a horizontal scrollbar near the action edge.

## Selection Visibility

Figure candidates relied mainly on a border/tint/ring. Generic single-choice answers changed from a one-pixel to a two-pixel border when selected, causing a small layout shift, and Latin choices relied primarily on fill color. Selection and focus were not consistently represented with non-color signals or radio semantics.

## Focused Assessment Mode

The global workspace sidebar remained visible during Practice and Diagnostic. Mock used a separate route layout but still needed the same bounded action-shell contract. The sidebar consumed high-value assessment width while its navigation was secondary to the current question.

## Horizontal Overflow

The root issue was the combination of fixed candidate/matrix sizes, fixed gaps, min-content strip sizing, and the sidebar-reduced workspace. Hiding overflow at the workspace level would clip required question content and was therefore rejected.

## Diagnostic completion

The primary navigation always used `Free Diagnostic`. `/onboarding` sent a completed user to Dashboard, so clicking the apparently available diagnostic caused a surprising destination. The profile diagnostic state already existed, but it was not included in root navigation state or Dashboard action selection.

## Mistake Notebook root cause

The notebook queried only submitted `test_attempts` and incorrect `user_responses` with non-null canonical `question_id` values. It then joined canonical `questions` and `question_options`. Current Practice and Diagnostic answers live in `practice_session_items`; generated Mock questions use `question_key` plus `practice_attempt_items` immutable snapshots and can have `question_id = null`. Those three current data paths were omitted.

The existing review-state table was also keyed only by canonical `question_id`, so it could not persist notes or understood state for generated snapshot items. Its existing user-owned RLS was sound and reusable.

## Practice incorrect families removal audit

Student-facing occurrences were found in:

- Practice completion: `Practise incorrect skills` plus focus-copy derived from `incorrectFamilies`.
- Practice review: `Practice incorrect families`.
- Practice review metadata: raw reasoning classification and `Family:` values.
- Mock question review: a focus-family query CTA labelled `Practice this skill`.
- Mock result recommendation URLs: `focus` and `fromMock` parameters derived from internal skill-loss classification.

The backend family/skill classifications remain useful to generation, analytics, and recommendation ranking and should not be deleted.

## Cognitive load audit

Priority meanings: P0 is required for the immediate decision; P1 is useful support; P2 is optional detail; P3 is internal/redundant and should be removed or hidden.

| Screen | Visible information audit | Before load | Main issue |
| --- | --- | --- | --- |
| Dashboard | P0 resume/recommendation; P1 compact progress/recent activity; P2 quick links; missing diagnostic state | Medium | Diagnostic state and next action could disagree with the header. |
| Practice | P0 question/answer/action; P1 progress/timer/feedback; P2 report; P3 global sidebar, duplicate summary metrics, family CTAs | High | The action competed with page scroll and navigation; completion duplicated analytics. |
| Diagnostic | P0 question/save-and-advance/action; P1 progress; P3 global sidebar and stale public nav label | Medium-High | Completion state was not reflected in navigation; action inherited the same viewport risk. |
| Mock | P0 question/answer/Next or Submit; P1 timer/navigator; P2 review flags; P3 global page-height competition | High | Consequential actions needed a guaranteed bounded shell and explicit Exit handling. |
| Progress | P0 module direction/next recommendation; P1 strongest/needs-work; P2 skills/difficulty/timing/history | Medium | Existing disclosure is appropriate; no backend rewrite is warranted. |
| Results | P0 result/section outcome/next action; P1 largest weakness; P2 timing, skill losses, question review; P3 repeated history timing metadata | High | Detailed analysis preceded or competed with the next action. |
| Mistakes | P0 unresolved queue/state/answers/Review; P1 source/difficulty/date; P2 explanation/note/bookmark; P3 three summary cards and full explanation on every card | High | Data was incomplete, unbounded, and presented as an analytics page rather than a revision queue. |
| Bookmarks | P0 saved question/Practice; P1 module/difficulty filters; P2 search/remove | Low-Medium | Module filtering was missing. |

## Data-heavy screens found

Mock Results, Mistake Notebook, Progress detail, and Practice Review are the densest surfaces. Mock Results and Mistakes needed progressive disclosure. Progress already had a suitable `View detailed breakdown` boundary. Practice Review remains intentionally detailed because the student explicitly opened answer review, but internal family metadata and redundant summary metrics were not justified.

## Mobile Assessment

The previous static viewport subtraction and two-column action grid could waste vertical space or leave a primary-only action at half width. Safe-area padding existed but did not compensate for an oversized outer document. A dedicated small-screen Figure Sequence scroller is appropriate only within the strip; the assessment workspace itself must not horizontally scroll.

## Baseline client bundles

Measured from the existing production build before remediation:

| Route | Raw client JS | Files |
| --- | ---: | ---: |
| Practice | 465,913 B | 8 |
| Mock | 454,512 B | 7 |
| Diagnostic | 444,255 B | 7 |
| Mistakes | 315,988 B | 5 |
| Dashboard | 305,398 B | 5 |
| Progress | 305,398 B | 5 |

