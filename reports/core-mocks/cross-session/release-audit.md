# dMAT Core cross-session novelty audit

Generated: 2026-08-21T21:48:02.561Z

- Synthetic students: 500
- Complete mocks: 2496 / 2500
- Generated questions: 149760
- Structural profile window: 3 generated mocks per student
- Exact fingerprint window: 5 generated mocks per student
- Near-clone rejection threshold: 0.94

| Module | Exact repeats | Near-clones ≥ threshold (active/outside) | Max similarity P50/P95/P99/max | Active-window max | Mean similarity | Repeated-family questions | Repeated family/difficulty-family sequences |
|---|---:|---:|---:|---:|---:|---:|---:|
| Figure Sequences | 0 | 1332 (0/1332) | 1/1/1/1 | 0.928571 | 0.318882 | 29662 | 0/0 |
| Mathematical Equations | 0 | 3542 (0/3542) | 1/1/1/1 | 0.939236 | 0.426991 | 9026 | 0/0 |
| Latin Squares | 0 | 162 (0/162) | 0.936304/1/1/1 | 0.939782 | 0.455982 | 39427 | 0/0 |

Broad structural-family recurrence is expected from finite taxonomies. Exact repeated questions and accepted fingerprint near-clones are not.

Generation duration P50/P95/P99/max: 3794.123/5510.791/6484.07/8902.666 ms under sharded audit load.

## Release blockers

- 4 mock generation failures
- figure_sequence: 1332 cross-five near-clones at/above threshold (0 inside the active window)
- mathematical_equation: 3542 cross-five near-clones at/above threshold (0 inside the active window)
- latin_square: 162 cross-five near-clones at/above threshold (0 inside the active window)

Final verdict: **NOT READY**
