# Phase 10 dashboard performance audit

Seven runs per representative persisted-answer history; values are medians.

| Answer history | Phase 8 preparation (ms) | Pure dashboard assembly (ms) |
| ---: | ---: | ---: |
| 0 | 0.475 | 0.129 |
| 100 | 1.507 | 0.156 |
| 1000 | 4.099 | 0.071 |
| 5000 | 15.622 | 0.068 |

Dashboard database history is bounded before assembly: six practice sessions, six mock attempts, and at most 600 aggregate response rows. Independent sources load concurrently; no per-activity query is issued.
