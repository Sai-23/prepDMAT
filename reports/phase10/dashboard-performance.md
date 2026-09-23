# Phase 10 dashboard performance audit

Seven runs per representative persisted-answer history; values are medians.

| Answer history | Phase 8 preparation (ms) | Pure dashboard assembly (ms) |
| ---: | ---: | ---: |
| 0 | 0.219 | 0.072 |
| 100 | 0.84 | 0.08 |
| 1000 | 5.259 | 0.063 |
| 5000 | 20.652 | 0.067 |

Dashboard database history is bounded before assembly: six practice sessions, six mock attempts, and at most 600 aggregate response rows. Independent sources load concurrently; no per-activity query is issued.
