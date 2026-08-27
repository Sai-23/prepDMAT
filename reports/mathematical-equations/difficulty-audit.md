# Mathematical Equations difficulty audit

Accepted sample: 200 per difficulty (600 total).

| Difficulty | Variables avg | Equations avg | Exact count | Depth avg | Solve steps avg | Substitutions avg | Operator variety avg | Compound freq. | Branch freq. | Recombine freq. | Indirect-entry freq. | Working memory avg | Obvious-entry penalty | Score avg | Solver reject rate | Difficulty reject rate | Global structural reuse | Within-session duplicate rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| easy | 2 | 2 | 100% | 1 | 2.465 | 1 | 1.465 | 0.195 | 0 | 0 | 0.465 | 1.305 | 0.268 | 2.67 | 0 | 0 | 0.635 | 0 |
| medium | 3 | 3 | 100% | 1.565 | 3.97 | 2.21 | 2.225 | 0.87 | 0.415 | 0.44 | 0.59 | 3.23 | 0.213 | 10.305 | 0 | 0 | 0.395 | 0 |
| hard | 4 | 4 | 100% | 2 | 5.965 | 3.42 | 2.725 | 1 | 0.68 | 0.625 | 0.795 | 4.38 | 0.102 | 17.3 | 0 | 0 | 0.12 | 0 |

## Operator counts

- easy: add 126, subtract 117, multiply 70, divide 20
- medium: add 356, subtract 233, multiply 122, divide 20
- hard: add 629, subtract 358, multiply 176, divide 47

## Structural-family distribution

- easy: direct 77, chain 62, reverse_chain 61
- medium: branch 41, reverse_chain 35, chain 36, merged 46, triangle 42
- hard: branch_recombine 42, cascade 23, mixed 42, merged 41, branch 29, star 23

## Dependency-graph distribution

- easy: depth-1/branch-0/recombine-0/indirect-0 107, depth-1/branch-0/recombine-0/indirect-1 93
- medium: depth-1/branch-1/recombine-0/indirect-1 41, depth-2/branch-0/recombine-0/indirect-1 35, depth-2/branch-0/recombine-0/indirect-0 36, depth-1/branch-0/recombine-1/indirect-0 46, depth-2/branch-1/recombine-1/indirect-1 42
- hard: depth-2/branch-1/recombine-1/indirect-1 84, depth-3/branch-0/recombine-0/indirect-1 23, depth-2/branch-0/recombine-1/indirect-0 41, depth-2/branch-1/recombine-0/indirect-1 29, depth-1/branch-1/recombine-0/indirect-1 23

## Diversity interpretation

Canonical structural signatures are rejected within 10-question audit sessions, exercising the repository's bounded generated-set policy.
Within-session duplicate rate is therefore the acceptance metric. Global structural reuse is also reported across all 200 questions to show finite catalog saturation, especially for two-variable Easy systems.
