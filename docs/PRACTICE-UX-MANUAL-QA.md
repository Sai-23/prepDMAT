# Practice UX manual QA

Run this checklist against a local database with `202608220018_practice_sessions.sql` applied. Test each Core module at desktop, tablet, and phone widths.

## Landing and configuration

- [ ] `/practice` shows Figure Sequences, Mathematical Equations, and Latin Squares as distinct selectable cards.
- [ ] Every card describes the task format, learning purpose, and recent accuracy (or a clear first-session empty state).
- [ ] Keyboard focus, hover, selected, and pressed states remain visible for every card and configuration button.
- [ ] Easy, Medium, Hard, and Mixed each start a session in all three modules.
- [ ] Counts 5, 10, and 20 each start a session in all three modules.
- [ ] Untimed sessions show no countdown; timed sessions show a stable countdown.
- [ ] A timed 20-question session uses the shared 25-minute Core module protocol.
- [ ] The page clearly distinguishes learning-oriented practice from assessment-oriented mock tests.
- [ ] An exact-question bookmark or mistake-notebook link creates a one-question untimed session with the correct native response format.
- [ ] A generation or persistence failure leaves configuration intact and displays a safe, actionable error without seeds, answers, or fingerprints.

## Session and answers

- [ ] The header shows module, current question, total count, progress, and timing state.
- [ ] Figure Sequences uses two native matrix selections; Mathematical Equations uses symbol-value inputs; Latin Squares uses the native symbol selector.
- [ ] Check Answer remains disabled until the native answer is complete.
- [ ] Ctrl/Command+Enter checks an answer and advances only after feedback is shown.
- [ ] Check Answer saves exactly once; double-clicking or retrying the action cannot change the answer.
- [ ] Correct and incorrect feedback is announced and visually distinguishable without relying on colour alone.
- [ ] Correct answers and private explanation traces are absent from page data before answer submission.
- [ ] Opening a walkthrough records one `explanation_opened` event; closing and reopening does not duplicate it.
- [ ] Next Question advances only after feedback; the final action is Complete Session.
- [ ] Leaving an active session requires an explicit Exit action or triggers the browser navigation warning.
- [ ] Refreshing before an answer restores the current question and original shown time.
- [ ] Refreshing after an answer restores the locked response and its feedback.
- [ ] A second tab cannot submit a different answer after the first tab succeeds.
- [ ] A second active practice session cannot be created for the same account.
- [ ] Expired timed sessions reject answer submission with a clear message.

## Summary, retry, and review

- [ ] Completion is rejected until every item has been answered.
- [ ] Summary score, correct, incorrect, accuracy, average time, module, and difficulty match the saved items.
- [ ] The insight references persisted reasoning-family metadata and never invents a content diagnosis.
- [ ] Review Every Answer opens `/practice/review/[sessionId]` and preserves question order, submitted answer, correct answer, timing, family, and explanation.
- [ ] Review controls cannot alter a submitted response or the completed session.
- [ ] Another account cannot open the review URL.
- [ ] Practice Incorrect Families carries the saved family identifiers into the next practice configuration as an interface hook; it does not claim adaptive generation.
- [ ] Generated practice-question reports attach to the immutable practice item even without a bank question ID.

## Responsive and accessibility

- [ ] At 320px width there is no horizontal page overflow; native figures, equation inputs, feedback cards, and action rows remain usable.
- [ ] At 768px and 1024px widths the module grid and session header reflow without covering content.
- [ ] At 200% zoom all controls and feedback remain operable and text remains readable.
- [ ] A keyboard-only pass reaches module cards, settings, native inputs, Check Answer, explanation steps, Next, Exit, summary, and review in a logical order.
- [ ] Progress and timer updates expose meaningful accessible labels and avoid disruptive announcements.
- [ ] Error and outcome messages are available to assistive technology.
- [ ] Reduced-motion preference removes nonessential progress animations.

## Regression boundaries

- [ ] Curated and generated Core mock creation, running, submission, and immutable review behave exactly as before.
- [ ] `/tests`, `/results`, `/bookmarks`, and `/mistakes` retain their existing flows.
- [ ] Practice writes only `practice_sessions`, `practice_session_items`, and `practice_events`; mocks continue to use `test_attempts` and `user_responses`.
- [ ] Generator validity, duplicate protection, difficulty, taxonomy, fidelity, and mock quality suites remain green.
