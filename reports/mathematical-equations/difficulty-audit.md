# Mathematical Equations difficulty audit

Accepted sample: 200 per difficulty (600 total).

| Difficulty | Variables avg | Equations avg | Exact count | Depth avg | Solve steps avg | Substitutions avg | Operator variety avg | Compound freq. | Branch freq. | Recombine freq. | Indirect-entry freq. | Working memory avg | Obvious-entry penalty | Score avg | Solver reject rate | Difficulty reject rate | Global structural reuse | Within-session duplicate rate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| easy | 2 | 2 | 100% | 1 | 3 | 1 | 2.195 | 0.725 | 0 | 0 | 1 | 1.32 | 0 | 3.16 | 0 | 0 | 0.44 | 0 |
| medium | 3 | 3 | 100% | 1.815 | 4.405 | 2.39 | 2.695 | 0.98 | 0.575 | 0.39 | 1 | 3.385 | 0 | 11.305 | 0 | 0 | 0.12 | 0 |
| hard | 4 | 4 | 100% | 2.21 | 6.23 | 3.6 | 2.97 | 1 | 0.845 | 0.6 | 1 | 4.615 | 0 | 17.825 | 0 | 0 | 0.015 | 0 |

## Operator counts

- easy: add 197, subtract 189, multiply 187, divide 16
- medium: add 411, subtract 328, multiply 230, divide 22
- hard: add 705, subtract 423, multiply 307, divide 32

## Structural-family distribution

- easy: chain 61, direct 75, reverse_chain 64
- medium: merged 42, chain 41, triangle 36, branch 37, reverse_chain 44
- hard: star 26, branch_recombine 43, merged 37, branch 23, mixed 40, cascade 31

## Relationship-family distribution

- easy: divide_by_constant 16, offset_subtract 66, offset_add 77, weighted_sum 105, scale 18, difference 47, sum 43, complement 28
- medium: weighted_sum 136, sum 43, offset_subtract 71, offset_add 73, scale 29, multi_variable_balance 106, complement 41, multi_variable_sum 25, difference 54, divide_by_constant 22
- hard: offset_subtract 108, offset_add 102, sum 74, multi_variable_balance 146, difference 67, weighted_sum 170, complement 38, divide_by_constant 32, multi_variable_sum 36, scale 27

## Reasoning-family distribution

- easy: dependency_chain 125, division 16, elimination_pair 136, same_target 136, weighted_elimination 110, scale_offset 61, direct_scale 18, weighted_difference 48, simple_difference 47, weighted_sum 37, simple_sum 43, coefficient_collection 18, variables_both_sides 18, constant_first 28, reverse_difference 28
- medium: elimination_pair 119, recombination 42, same_target 119, scale_offset 58, simple_sum 39, three_variable 159, weighted_elimination 90, dependency_chain 85, weighted_sum 29, direct_scale 28, constant_first 40, reverse_difference 40, coefficient_collection 30, variables_both_sides 30, simple_difference 53, weighted_difference 43, branching 37, division 21
- hard: scale_offset 92, simple_sum 66, three_variable 182, branching 106, recombination 120, simple_difference 58, weighted_sum 76, constant_first 36, division 32, elimination_pair 77, reverse_difference 36, same_target 77, weighted_elimination 52, dependency_chain 31, weighted_difference 39, direct_scale 26, coefficient_collection 20, variables_both_sides 20

## Dependency-graph distribution

- easy: depth-1/branch-0/recombine-0/indirect-1 200
- medium: depth-2/branch-1/recombine-1/indirect-1 78, depth-2/branch-0/recombine-0/indirect-1 85, depth-1/branch-1/recombine-0/indirect-1 37
- hard: depth-1/branch-1/recombine-0/indirect-1 26, depth-2/branch-1/recombine-1/indirect-1 83, depth-3/branch-1/recombine-1/indirect-1 37, depth-2/branch-1/recombine-0/indirect-1 23, depth-3/branch-0/recombine-0/indirect-1 31

## Arithmetic safety and performance

| Difficulty | Max intermediate | Min intermediate | Fractions | Negatives | Range violations | Attempts / accepted | Accepted / sec |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| easy | 20 | 1 | 0 | 0 | 0 | 1.105 | 136.812 |
| medium | 20 | 1 | 0 | 0 | 0 | 1 | 86.153 |
| hard | 20 | 1 | 0 | 0 | 0 | 1 | 11.172 |

## Duplicate and rejection analysis

- easy: exact duplicate rate 0; structural duplicate rate 0.44; presentation-only variation rate 0.665; rejection reasons {"duplicate_structural_signature":8,"duplicate_fingerprint":11}
- medium: exact duplicate rate 0; structural duplicate rate 0.12; presentation-only variation rate 0.22; rejection reasons {}
- hard: exact duplicate rate 0; structural duplicate rate 0.015; presentation-only variation rate 0.03; rejection reasons {}

## Diversity interpretation

Canonical structural signatures are rejected within 10-question audit sessions, exercising the repository's bounded generated-set policy.
Within-session duplicate rate is therefore the acceptance metric. Global structural reuse is also reported across all 200 questions to show finite catalog saturation, especially for two-variable Easy systems.
