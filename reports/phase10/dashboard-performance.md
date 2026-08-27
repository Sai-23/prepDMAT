# Phase 10 dashboard performance audit

Seven runs per representative persisted-answer history; values are medians.

| Answer history | Phase 8 preparation (ms) | Pure dashboard assembly (ms) |
| ---: | ---: | ---: |
| 0 | 0.343 | 0.075 |
| 100 | 1.293 | 0.099 |
| 1000 | 3.703 | 0.07 |
| 5000 | 13.936 | 0.072 |

Dashboard database history is bounded before assembly: six practice sessions, six mock attempts, and at most 600 aggregate response rows. Independent sources load concurrently; no per-activity query is issued.
