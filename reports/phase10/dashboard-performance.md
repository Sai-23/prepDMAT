# Phase 10 dashboard performance audit

Seven runs per representative persisted-answer history; values are medians.

| Answer history | Phase 8 preparation (ms) | Pure dashboard assembly (ms) |
| ---: | ---: | ---: |
| 0 | 0.343 | 0.07 |
| 100 | 1.101 | 0.091 |
| 1000 | 4.46 | 0.07 |
| 5000 | 15.876 | 0.065 |

Dashboard database history is bounded before assembly: six practice sessions, six mock attempts, and at most 600 aggregate response rows. Independent sources load concurrently; no per-activity query is issued.
