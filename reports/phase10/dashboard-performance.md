# Phase 10 dashboard performance audit

Seven runs per representative persisted-answer history; values are medians.

| Answer history | Phase 8 preparation (ms) | Pure dashboard assembly (ms) |
| ---: | ---: | ---: |
| 0 | 0.222 | 0.11 |
| 100 | 0.428 | 0.05 |
| 1000 | 3.731 | 0.047 |
| 5000 | 14.855 | 0.045 |

Dashboard database history is bounded before assembly: six practice sessions, six mock attempts, and at most 600 aggregate response rows. Independent sources load concurrently; no per-activity query is issued.
