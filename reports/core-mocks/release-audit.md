# dMAT Core complete-mock release audit

Generated: 2026-08-25T08:10:49.600Z

Policy: **DEVELOPMENT BALANCE — not an official item-level dMAT difficulty claim**

## Outcome

- Complete mocks: 1000 / 1000
- Generated questions: 60000
- Failed mocks: 0
- Release verdict: **READY WITH MINOR ISSUES**

## Protocol and integrity

- Critical protocol failures: 0
- Answer-integrity failures: 0
- Strict Figure/Equation validation failures: 0
- Missing explanations: 0
- Every successful mock uses 20 Figure, 20 Equation, and 20 Latin questions in authoritative order with 1,500 seconds per section.

## Within-mock similarity

| Module | Max similarity P50/P90/P95/P99/max | Mean similarity | Pairs >0.90 | >0.85 | >0.80 | Largest family P95/max |
|---|---:|---:|---:|---:|---:|---:|
| Figure Sequences | 0.8571/0.9048/0.9048/0.9048/0.9286 | 0.3128 | 183 | 1234 | 1234 | 4/7 |
| Mathematical Equations | 0.8833/0.9333/0.9333/0.9333/0.9375 | 0.4117 | 394 | 1884 | 4837 | 2/2 |
| Latin Squares | 0.9092/0.9282/0.9333/0.9375/0.9396 | 0.4449 | 1259 | 11599 | 14447 | 10/12 |

## Difficulty and pacing

Configured per section: 7 Easy / 7 Medium / 6 Hard, neutrally shuffled with a maximum streak of 3. This is a development policy, not an official distribution claim.

| Module | Easy/Medium/Hard total | Longest E/M/H max | Unique families P50/P95 |
|---|---:|---:|---:|
| Figure Sequences | 7000/7000/6000 | 3/3/3 | 14/16 |
| Mathematical Equations | 7000/7000/6000 | 3/3/3 | 20/20 |
| Latin Squares | 7000/7000/6000 | 3/3/3 | 5/6 |

## Latency

- Total mock P50/P90/P95/P99/max: 2802.357/3833.818/4486.514/5668.315/7734.156 ms
- Figure Sequences P50/P95/P99/max: 571.962/1184.086/1821.504/2950.93 ms
- Mathematical Equations P50/P95/P99/max: 586.462/1269.558/2127.467/3335.234 ms
- Latin Squares P50/P95/P99/max: 1506.396/2464.88/3241.259/5607.961 ms
- Generator attempts per accepted mock, mean/P95/max: 116.117/170/249
- Average outer slot retries per question: 0.0937

## Failure and determinism

- Full-mock failure rate: 0
- Slot retry exhaustion: 0
- Determinism: 100 seeds checked twice; 0 mismatches

## Rule coverage

The JSON companion contains complete global counts for Figure movement/object/progression/rotation/colour/boundary/periodicity, Equation graph/relationship/variable/depth/arithmetic/style/scale-division, and Latin reasoning/depth/intermediate/deduction/redundancy/uniqueness dimensions.

## Development summaries

### phase-5-core-mock-0001

| Module | # | Difficulty | Structural family | Novelty | Reasoning |
|---|---:|---|---|---:|---|
| Figure Sequences | 1 | easy | border+linear-axis | 1 | border + linear-axis |
| Figure Sequences | 2 | medium | border+border+border | 0.571429 | border + border + border |
| Figure Sequences | 3 | easy | linear-diagonal | 0.728571 | linear-diagonal |
| Figure Sequences | 4 | easy | linear-axis+linear-diagonal | 0.428571 | linear-axis + linear-diagonal |
| Figure Sequences | 5 | medium | border+linear-axis+linear-axis | 0.27619 | border + linear-axis + linear-axis |
| Figure Sequences | 6 | easy | linear-axis | 0.428571 | linear-axis |
| Figure Sequences | 7 | hard | border+direction_cycle+linear-axis+linear-diagonal | 0.726364 | border + direction_cycle + linear-axis + linear-diagonal |
| Figure Sequences | 8 | hard | border+linear-axis+linear-axis | 0.633723 | border + linear-axis + linear-axis |
| Figure Sequences | 9 | easy | border | 0.414286 | border |
| Figure Sequences | 10 | hard | border+direction_cycle+linear-diagonal | 0.583492 | border + direction_cycle + linear-diagonal |
| Figure Sequences | 11 | medium | border+linear-axis | 0.409524 | border + linear-axis |
| Figure Sequences | 12 | medium | linear-axis+linear-axis | 0.556349 | linear-axis + linear-axis |
| Figure Sequences | 13 | medium | direction_cycle+linear-axis | 0.592381 | direction_cycle + linear-axis |
| Figure Sequences | 14 | easy | border+linear-axis | 0.42381 | border + linear-axis |
| Figure Sequences | 15 | hard | border+border+linear-axis+linear-diagonal | 0.593333 | border + border + linear-axis + linear-diagonal |
| Figure Sequences | 16 | medium | direction_cycle+linear-axis+linear-axis | 0.554286 | direction_cycle + linear-axis + linear-axis |
| Figure Sequences | 17 | hard | border+linear-axis+linear-diagonal | 0.527619 | border + linear-axis + linear-diagonal |
| Figure Sequences | 18 | medium | border | 0.533333 | border |
| Figure Sequences | 19 | easy | linear-axis+linear-axis | 0.428571 | linear-axis + linear-axis |
| Figure Sequences | 20 | hard | border+linear-axis+linear-diagonal | 0.468095 | border + linear-axis + linear-diagonal |
| Mathematical Equations | 1 | hard | cascade|multi_variable_balance+offset_difference+offset_difference+offset_difference | 1 | cascade |
| Mathematical Equations | 2 | hard | merged|direct_value+direct_value+multi_variable_balance+sum_complement | 0.604167 | merged |
| Mathematical Equations | 3 | easy | direct|direct_value+offset_difference | 0.634028 | direct |
| Mathematical Equations | 4 | hard | mixed|multi_variable_balance+offset_difference+offset_difference+sum_complement | 0.518651 | mixed |
| Mathematical Equations | 5 | hard | mixed|offset_difference+scale_divide+weighted_sum+weighted_sum | 0.295635 | mixed |
| Mathematical Equations | 6 | medium | triangle|multi_variable_sum+offset_difference+sum_complement | 0.426389 | triangle |
| Mathematical Equations | 7 | medium | triangle|multi_variable_balance+scale_divide+sum_complement | 0.244444 | triangle |
| Mathematical Equations | 8 | easy | direct|offset_difference+sum_complement | 0.40625 | direct |
| Mathematical Equations | 9 | medium | reverse_chain|multi_variable_balance+offset_difference+weighted_sum | 0.420833 | reverse_chain |
| Mathematical Equations | 10 | easy | reverse_chain|offset_difference+sum_complement | 0.243056 | reverse_chain |
| Mathematical Equations | 11 | easy | reverse_chain|sum_complement+weighted_sum | 0.277778 | reverse_chain |
| Mathematical Equations | 12 | hard | mixed|scale_divide+sum_complement+weighted_sum+weighted_sum | 0.066667 | mixed |
| Mathematical Equations | 13 | medium | chain|direct_value+offset_difference+scale_divide | 0.444444 | chain |
| Mathematical Equations | 14 | easy | reverse_chain|offset_difference+sum_complement | 0.125 | reverse_chain |
| Mathematical Equations | 15 | medium | reverse_chain|scale_divide+weighted_sum+weighted_sum | 0.269444 | reverse_chain |
| Mathematical Equations | 16 | hard | branch|multi_variable_balance+scale_divide+sum_complement+sum_complement | 0.443452 | branch |
| Mathematical Equations | 17 | easy | reverse_chain|weighted_sum+weighted_sum | 0.215278 | reverse_chain |
| Mathematical Equations | 18 | easy | chain|direct_value+sum_complement | 0.354167 | chain |
| Mathematical Equations | 19 | medium | triangle|multi_variable_balance+offset_difference+sum_complement | 0.090278 | triangle |
| Mathematical Equations | 20 | medium | chain|direct_value+offset_difference+sum_complement | 0.1875 | chain |
| Latin Squares | 1 | medium | SINGLE_INTERMEDIATE|depth-2 | 1 | SINGLE_INTERMEDIATE |
| Latin Squares | 2 | hard | CHAINED_INTERMEDIATE|depth-2 | 0.622075 | CHAINED_INTERMEDIATE |
| Latin Squares | 3 | hard | CHAINED_INTERMEDIATE|depth-2 | 0.288427 | CHAINED_INTERMEDIATE |
| Latin Squares | 4 | easy | DIRECT_AXIS_ELIMINATION|depth-1 | 0.673573 | DIRECT_AXIS_ELIMINATION |
| Latin Squares | 5 | easy | DIRECT_AXIS_ELIMINATION|depth-1 | 0.144982 | DIRECT_AXIS_ELIMINATION |
| Latin Squares | 6 | medium | CHAINED_INTERMEDIATE|depth-2 | 0.293714 | CHAINED_INTERMEDIATE |
| Latin Squares | 7 | easy | DIRECT_AXIS_ELIMINATION|depth-1 | 0.128645 | DIRECT_AXIS_ELIMINATION |
| Latin Squares | 8 | hard | MULTI_STAGE_DEDUCTION|depth-3 | 0.513018 | MULTI_STAGE_DEDUCTION |
| Latin Squares | 9 | medium | CHAINED_INTERMEDIATE|depth-2 | 0.286147 | CHAINED_INTERMEDIATE |
| Latin Squares | 10 | medium | SINGLE_INTERMEDIATE|depth-2 | 0.384746 | SINGLE_INTERMEDIATE |
| Latin Squares | 11 | easy | DIRECT_AXIS_ELIMINATION|depth-1 | 0.109463 | DIRECT_AXIS_ELIMINATION |
| Latin Squares | 12 | medium | CHAINED_INTERMEDIATE|depth-2 | 0.403713 | CHAINED_INTERMEDIATE |
| Latin Squares | 13 | easy | DIRECT_AXIS_ELIMINATION|depth-1 | 0.085256 | DIRECT_AXIS_ELIMINATION |
| Latin Squares | 14 | medium | SINGLE_INTERMEDIATE|depth-2 | 0.297934 | SINGLE_INTERMEDIATE |
| Latin Squares | 15 | hard | CHAINED_INTERMEDIATE|depth-2 | 0.138105 | CHAINED_INTERMEDIATE |
| Latin Squares | 16 | easy | ROW_COLUMN_INTERSECTION|depth-1 | 0.262796 | ROW_COLUMN_INTERSECTION |
| Latin Squares | 17 | hard | CHAINED_INTERMEDIATE|depth-2 | 0.241857 | CHAINED_INTERMEDIATE |
| Latin Squares | 18 | hard | CHAINED_INTERMEDIATE|depth-2 | 0.233179 | CHAINED_INTERMEDIATE |
| Latin Squares | 19 | easy | ROW_COLUMN_INTERSECTION|depth-1 | 0.114229 | ROW_COLUMN_INTERSECTION |
| Latin Squares | 20 | medium | CHAINED_INTERMEDIATE|depth-2 | 0.303817 | CHAINED_INTERMEDIATE |

### phase-5-core-mock-0002

| Module | # | Difficulty | Structural family | Novelty | Reasoning |
|---|---:|---|---|---:|---|
| Figure Sequences | 1 | medium | border+direction_cycle | 1 | border + direction_cycle |
| Figure Sequences | 2 | medium | direction_cycle+linear-axis+linear-diagonal | 0.635714 | direction_cycle + linear-axis + linear-diagonal |
| Figure Sequences | 3 | medium | border+linear-axis+linear-axis | 0.614286 | border + linear-axis + linear-axis |
| Figure Sequences | 4 | hard | linear-axis+linear-diagonal | 0.657143 | linear-axis + linear-diagonal |
| Figure Sequences | 5 | medium | border+linear-diagonal | 0.557143 | border + linear-diagonal |
| Figure Sequences | 6 | medium | border+linear-diagonal | 0.457143 | border + linear-diagonal |
| Figure Sequences | 7 | easy | border | 0.452381 | border |
| Figure Sequences | 8 | easy | linear-axis+linear-diagonal | 0.559524 | linear-axis + linear-diagonal |
| Figure Sequences | 9 | medium | border+linear-axis | 0.461905 | border + linear-axis |
| Figure Sequences | 10 | hard | border+border+linear-axis | 0.627211 | border + border + linear-axis |
| Figure Sequences | 11 | hard | direction_cycle+linear-axis+linear-axis+linear-diagonal | 0.664286 | direction_cycle + linear-axis + linear-axis + linear-diagonal |
| Figure Sequences | 12 | hard | border+direction_cycle+linear-axis+linear-diagonal | 0.575476 | border + direction_cycle + linear-axis + linear-diagonal |
| Figure Sequences | 13 | easy | linear-diagonal | 0.504762 | linear-diagonal |
| Figure Sequences | 14 | easy | linear-axis | 0.428571 | linear-axis |
| Figure Sequences | 15 | hard | border+linear-axis+linear-axis+linear-diagonal | 0.542857 | border + linear-axis + linear-axis + linear-diagonal |
| Figure Sequences | 16 | medium | border+linear-diagonal | 0.460952 | border + linear-diagonal |
| Figure Sequences | 17 | easy | linear-diagonal | 0.428571 | linear-diagonal |
| Figure Sequences | 18 | easy | linear-diagonal | 0.142857 | linear-diagonal |
| Figure Sequences | 19 | easy | border+linear-axis | 0.414286 | border + linear-axis |
| Figure Sequences | 20 | hard | border+border+border+linear-axis | 0.478912 | border + border + border + linear-axis |
| Mathematical Equations | 1 | easy | reverse_chain|scale_divide+weighted_sum | 1 | reverse_chain |
| Mathematical Equations | 2 | hard | branch|scale_divide+sum_complement+sum_complement+weighted_sum | 0.543056 | branch |
| Mathematical Equations | 3 | medium | branch|sum_complement+weighted_sum+weighted_sum | 0.320139 | branch |
| Mathematical Equations | 4 | medium | reverse_chain|multi_variable_balance+offset_difference+weighted_sum | 0.40625 | reverse_chain |
| Mathematical Equations | 5 | easy | reverse_chain|scale_divide+sum_complement | 0.270833 | reverse_chain |
| Mathematical Equations | 6 | hard | branch|multi_variable_balance+sum_complement+sum_complement+sum_complement | 0.236111 | branch |
| Mathematical Equations | 7 | easy | direct|direct_value+sum_complement | 0.440972 | direct |
| Mathematical Equations | 8 | medium | branch|offset_difference+offset_difference+weighted_sum | 0.2 | branch |
| Mathematical Equations | 9 | easy | reverse_chain|scale_divide+sum_complement | 0.083333 | reverse_chain |
| Mathematical Equations | 10 | medium | triangle|multi_variable_balance+offset_difference+sum_complement | 0.486111 | triangle |
| Mathematical Equations | 11 | medium | chain|direct_value+weighted_sum+weighted_sum | 0.519444 | chain |
| Mathematical Equations | 12 | medium | triangle|offset_difference+sum_complement+weighted_sum | 0.236111 | triangle |
| Mathematical Equations | 13 | hard | star|offset_difference+sum_complement+sum_complement+weighted_sum | 0.299306 | star |
| Mathematical Equations | 14 | easy | chain|direct_value+offset_difference | 0.388889 | chain |
| Mathematical Equations | 15 | medium | merged|direct_value+direct_value+multi_variable_balance | 0.552083 | merged |
| Mathematical Equations | 16 | hard | mixed|multi_variable_balance+offset_difference+scale_divide+sum_complement | 0.3125 | mixed |
| Mathematical Equations | 17 | hard | branch|offset_difference+offset_difference+weighted_sum+weighted_sum | 0.214286 | branch |
| Mathematical Equations | 18 | hard | branch_recombine|multi_variable_balance+multi_variable_sum+offset_difference+sum_complement | 0.365873 | branch_recombine |
| Mathematical Equations | 19 | easy | reverse_chain|offset_difference+weighted_sum | 0.215278 | reverse_chain |
| Mathematical Equations | 20 | easy | reverse_chain|offset_difference+sum_complement | 0.208333 | reverse_chain |
| Latin Squares | 1 | medium | CHAINED_INTERMEDIATE|depth-2 | 1 | CHAINED_INTERMEDIATE |
| Latin Squares | 2 | medium | SINGLE_INTERMEDIATE|depth-2 | 0.596936 | SINGLE_INTERMEDIATE |
| Latin Squares | 3 | medium | CHAINED_INTERMEDIATE|depth-2 | 0.119702 | CHAINED_INTERMEDIATE |
| Latin Squares | 4 | hard | CHAINED_INTERMEDIATE|depth-2 | 0.244216 | CHAINED_INTERMEDIATE |
| Latin Squares | 5 | medium | SINGLE_INTERMEDIATE|depth-2 | 0.301047 | SINGLE_INTERMEDIATE |
| Latin Squares | 6 | medium | CHAINED_INTERMEDIATE|depth-2 | 0.319716 | CHAINED_INTERMEDIATE |
| Latin Squares | 7 | hard | CHAINED_INTERMEDIATE|depth-2 | 0.317337 | CHAINED_INTERMEDIATE |
| Latin Squares | 8 | easy | DIRECT_AXIS_ELIMINATION|depth-1 | 0.57563 | DIRECT_AXIS_ELIMINATION |
| Latin Squares | 9 | hard | MULTI_STAGE_DEDUCTION|depth-3 | 0.572219 | MULTI_STAGE_DEDUCTION |
| Latin Squares | 10 | easy | DIRECT_AXIS_ELIMINATION|depth-1 | 0.103175 | DIRECT_AXIS_ELIMINATION |
| Latin Squares | 11 | easy | ROW_COLUMN_INTERSECTION|depth-1 | 0.277778 | ROW_COLUMN_INTERSECTION |
| Latin Squares | 12 | easy | DIRECT_AXIS_ELIMINATION|depth-1 | 0.108582 | DIRECT_AXIS_ELIMINATION |
| Latin Squares | 13 | hard | CHAINED_INTERMEDIATE|depth-2 | 0.233325 | CHAINED_INTERMEDIATE |
| Latin Squares | 14 | hard | CHAINED_INTERMEDIATE|depth-2 | 0.113291 | CHAINED_INTERMEDIATE |
| Latin Squares | 15 | easy | DIRECT_AXIS_ELIMINATION|depth-1 | 0.116232 | DIRECT_AXIS_ELIMINATION |
| Latin Squares | 16 | hard | CHAINED_INTERMEDIATE|depth-2 | 0.240463 | CHAINED_INTERMEDIATE |
| Latin Squares | 17 | medium | CHAINED_INTERMEDIATE|depth-2 | 0.227725 | CHAINED_INTERMEDIATE |
| Latin Squares | 18 | medium | DIRECT_AXIS_ELIMINATION|depth-1 | 0.365996 | DIRECT_AXIS_ELIMINATION |
| Latin Squares | 19 | easy | DIRECT_AXIS_ELIMINATION|depth-1 | 0.088294 | DIRECT_AXIS_ELIMINATION |
| Latin Squares | 20 | easy | ROW_COLUMN_INTERSECTION|depth-1 | 0.109463 | ROW_COLUMN_INTERSECTION |

### phase-5-core-mock-0003

| Module | # | Difficulty | Structural family | Novelty | Reasoning |
|---|---:|---|---|---:|---|
| Figure Sequences | 1 | medium | direction_cycle+linear-axis+linear-diagonal | 1 | direction_cycle + linear-axis + linear-diagonal |
| Figure Sequences | 2 | hard | linear-axis+linear-axis+linear-diagonal | 0.657143 | linear-axis + linear-axis + linear-diagonal |
| Figure Sequences | 3 | easy | border+linear-diagonal | 0.578571 | border + linear-diagonal |
| Figure Sequences | 4 | medium | direction_cycle | 0.7 | direction_cycle |
| Figure Sequences | 5 | easy | border | 0.414286 | border |
| Figure Sequences | 6 | medium | border+linear-axis | 0.571429 | border + linear-axis |
| Figure Sequences | 7 | medium | linear-axis+linear-diagonal+linear-diagonal | 0.414286 | linear-axis + linear-diagonal + linear-diagonal |
| Figure Sequences | 8 | easy | linear-axis | 0.557143 | linear-axis |
| Figure Sequences | 9 | easy | linear-axis | 0.142857 | linear-axis |
| Figure Sequences | 10 | hard | border+linear-diagonal | 0.624762 | border + linear-diagonal |
| Figure Sequences | 11 | medium | linear-axis | 0.571429 | linear-axis |
| Figure Sequences | 12 | hard | linear-axis+linear-axis+linear-diagonal+linear-diagonal | 0.52619 | linear-axis + linear-axis + linear-diagonal + linear-diagonal |
| Figure Sequences | 13 | medium | border+linear-axis+linear-axis | 0.420952 | border + linear-axis + linear-axis |
| Figure Sequences | 14 | medium | direction_cycle+linear-diagonal | 0.538095 | direction_cycle + linear-diagonal |
| Figure Sequences | 15 | hard | border+border+border+linear-axis | 0.559864 | border + border + border + linear-axis |
| Figure Sequences | 16 | easy | border | 0.514286 | border |
| Figure Sequences | 17 | hard | border+border+direction_cycle+linear-axis | 0.561657 | border + border + direction_cycle + linear-axis |
| Figure Sequences | 18 | easy | linear-diagonal | 0.514286 | linear-diagonal |
| Figure Sequences | 19 | hard | border+border+linear-axis+linear-diagonal | 0.56355 | border + border + linear-axis + linear-diagonal |
| Figure Sequences | 20 | easy | linear-diagonal | 0.142857 | linear-diagonal |
| Mathematical Equations | 1 | easy | reverse_chain|offset_difference+sum_complement | 1 | reverse_chain |
| Mathematical Equations | 2 | easy | reverse_chain|scale_divide+sum_complement | 0.236111 | reverse_chain |
| Mathematical Equations | 3 | hard | star|multi_variable_balance+sum_complement+weighted_sum+weighted_sum | 0.584722 | star |
| Mathematical Equations | 4 | medium | triangle|multi_variable_balance+offset_difference+sum_complement | 0.577083 | triangle |
| Mathematical Equations | 5 | easy | reverse_chain|offset_difference+weighted_sum | 0.277778 | reverse_chain |
| Mathematical Equations | 6 | hard | branch|offset_difference+scale_divide+weighted_sum+weighted_sum | 0.452877 | branch |
| Mathematical Equations | 7 | medium | reverse_chain|multi_variable_balance+sum_complement+weighted_sum | 0.378472 | reverse_chain |
| Mathematical Equations | 8 | easy | direct|scale_divide+sum_complement | 0.243056 | direct |
| Mathematical Equations | 9 | easy | direct|direct_value+sum_complement | 0.385417 | direct |
| Mathematical Equations | 10 | hard | branch|multi_variable_balance+scale_divide+scale_divide+weighted_sum | 0.239583 | branch |
| Mathematical Equations | 11 | medium | triangle|offset_difference+sum_complement+weighted_sum | 0.236111 | triangle |
| Mathematical Equations | 12 | easy | direct|offset_difference+sum_complement | 0.194444 | direct |
| Mathematical Equations | 13 | hard | merged|direct_value+direct_value+multi_variable_sum+sum_complement | 0.604861 | merged |
| Mathematical Equations | 14 | medium | reverse_chain|multi_variable_balance+offset_difference+offset_difference | 0.206944 | reverse_chain |
| Mathematical Equations | 15 | hard | branch_recombine|multi_variable_balance+multi_variable_balance+offset_difference+sum_complement | 0.368056 | branch_recombine |
| Mathematical Equations | 16 | medium | chain|direct_value+offset_difference+offset_difference | 0.447917 | chain |
| Mathematical Equations | 17 | hard | mixed|multi_variable_balance+scale_divide+sum_complement+sum_complement | 0.370833 | mixed |
| Mathematical Equations | 18 | medium | merged|direct_value+direct_value+multi_variable_sum | 0.180556 | merged |
| Mathematical Equations | 19 | medium | triangle|offset_difference+scale_divide+weighted_sum | 0.155208 | triangle |
| Mathematical Equations | 20 | easy | direct|offset_difference+sum_complement | 0.09375 | direct |
| Latin Squares | 1 | medium | SINGLE_INTERMEDIATE|depth-2 | 1 | SINGLE_INTERMEDIATE |
| Latin Squares | 2 | easy | DIRECT_AXIS_ELIMINATION|depth-1 | 0.619967 | DIRECT_AXIS_ELIMINATION |
| Latin Squares | 3 | easy | ROW_COLUMN_INTERSECTION|depth-1 | 0.285179 | ROW_COLUMN_INTERSECTION |
| Latin Squares | 4 | easy | DIRECT_AXIS_ELIMINATION|depth-1 | 0.127997 | DIRECT_AXIS_ELIMINATION |
| Latin Squares | 5 | medium | SINGLE_INTERMEDIATE|depth-2 | 0.316686 | SINGLE_INTERMEDIATE |
| Latin Squares | 6 | hard | CHAINED_INTERMEDIATE|depth-2 | 0.615199 | CHAINED_INTERMEDIATE |
| Latin Squares | 7 | easy | DIRECT_AXIS_ELIMINATION|depth-1 | 0.113565 | DIRECT_AXIS_ELIMINATION |
| Latin Squares | 8 | easy | ROW_COLUMN_INTERSECTION|depth-1 | 0.16495 | ROW_COLUMN_INTERSECTION |
| Latin Squares | 9 | medium | CHAINED_INTERMEDIATE|depth-2 | 0.274425 | CHAINED_INTERMEDIATE |
| Latin Squares | 10 | hard | MULTI_STAGE_DEDUCTION|depth-3 | 0.621505 | MULTI_STAGE_DEDUCTION |
| Latin Squares | 11 | medium | SINGLE_INTERMEDIATE|depth-2 | 0.122367 | SINGLE_INTERMEDIATE |
| Latin Squares | 12 | medium | SINGLE_INTERMEDIATE|depth-2 | 0.341982 | SINGLE_INTERMEDIATE |
| Latin Squares | 13 | hard | CHAINED_INTERMEDIATE|depth-2 | 0.286933 | CHAINED_INTERMEDIATE |
| Latin Squares | 14 | hard | CHAINED_INTERMEDIATE|depth-2 | 0.257089 | CHAINED_INTERMEDIATE |
| Latin Squares | 15 | hard | MULTI_STAGE_DEDUCTION|depth-3 | 0.398352 | MULTI_STAGE_DEDUCTION |
| Latin Squares | 16 | medium | CHAINED_INTERMEDIATE|depth-2 | 0.290056 | CHAINED_INTERMEDIATE |
| Latin Squares | 17 | easy | DIRECT_AXIS_ELIMINATION|depth-1 | 0.116447 | DIRECT_AXIS_ELIMINATION |
| Latin Squares | 18 | easy | DIRECT_AXIS_ELIMINATION|depth-1 | 0.071695 | DIRECT_AXIS_ELIMINATION |
| Latin Squares | 19 | hard | MULTI_STAGE_DEDUCTION|depth-3 | 0.256544 | MULTI_STAGE_DEDUCTION |
| Latin Squares | 20 | medium | CHAINED_INTERMEDIATE|depth-2 | 0.291932 | CHAINED_INTERMEDIATE |

### phase-5-core-mock-0004

| Module | # | Difficulty | Structural family | Novelty | Reasoning |
|---|---:|---|---|---:|---|
| Figure Sequences | 1 | easy | border+linear-diagonal | 1 | border + linear-diagonal |
| Figure Sequences | 2 | easy | border | 0.414286 | border |
| Figure Sequences | 3 | medium | border+linear-axis | 0.590476 | border + linear-axis |
| Figure Sequences | 4 | hard | direction_cycle+linear-axis | 0.668571 | direction_cycle + linear-axis |
| Figure Sequences | 5 | medium | border+linear-axis+linear-axis | 0.445238 | border + linear-axis + linear-axis |
| Figure Sequences | 6 | medium | direction_cycle+linear-axis | 0.452381 | direction_cycle + linear-axis |
| Figure Sequences | 7 | easy | border | 0.414286 | border |
| Figure Sequences | 8 | medium | border+linear-diagonal | 0.615238 | border + linear-diagonal |
| Figure Sequences | 9 | medium | border+border | 0.533333 | border + border |
| Figure Sequences | 10 | hard | border+border+linear-axis | 0.65 | border + border + linear-axis |
| Figure Sequences | 11 | hard | border+direction_cycle+linear-diagonal | 0.603333 | border + direction_cycle + linear-diagonal |
| Figure Sequences | 12 | medium | linear-axis+linear-diagonal | 0.47619 | linear-axis + linear-diagonal |
| Figure Sequences | 13 | hard | border+border+direction_cycle+linear-diagonal | 0.604286 | border + border + direction_cycle + linear-diagonal |
| Figure Sequences | 14 | easy | linear-diagonal | 0.453333 | linear-diagonal |
| Figure Sequences | 15 | hard | border+linear-axis+linear-axis+linear-axis | 0.575714 | border + linear-axis + linear-axis + linear-axis |
| Figure Sequences | 16 | medium | border+linear-axis | 0.414286 | border + linear-axis |
| Figure Sequences | 17 | hard | border+linear-axis+linear-diagonal | 0.606349 | border + linear-axis + linear-diagonal |
| Figure Sequences | 18 | easy | border+border | 0.357143 | border + border |
| Figure Sequences | 19 | easy | linear-axis | 0.571429 | linear-axis |
| Figure Sequences | 20 | easy | linear-diagonal | 0.514286 | linear-diagonal |
| Mathematical Equations | 1 | hard | branch|multi_variable_balance+offset_difference+scale_divide+sum_complement | 1 | branch |
| Mathematical Equations | 2 | medium | merged|direct_value+direct_value+multi_variable_balance | 0.736111 | merged |
| Mathematical Equations | 3 | easy | reverse_chain|offset_difference+sum_complement | 0.577083 | reverse_chain |
| Mathematical Equations | 4 | medium | reverse_chain|multi_variable_balance+sum_complement+sum_complement | 0.388889 | reverse_chain |
| Mathematical Equations | 5 | medium | branch|multi_variable_balance+offset_difference+offset_difference | 0.313194 | branch |
| Mathematical Equations | 6 | hard | cascade|multi_variable_sum+offset_difference+scale_divide+sum_complement | 0.422817 | cascade |
| Mathematical Equations | 7 | easy | direct|offset_difference+sum_complement | 0.284722 | direct |
| Mathematical Equations | 8 | hard | merged|direct_value+direct_value+multi_variable_sum+scale_divide | 0.320139 | merged |
| Mathematical Equations | 9 | hard | branch_recombine|multi_variable_balance+multi_variable_balance+offset_difference+scale_divide | 0.343056 | branch_recombine |
| Mathematical Equations | 10 | medium | chain|direct_value+offset_difference+scale_divide | 0.5 | chain |
| Mathematical Equations | 11 | easy | chain|direct_value+scale_divide | 0.256944 | chain |
| Mathematical Equations | 12 | easy | chain|direct_value+offset_difference | 0.229167 | chain |
| Mathematical Equations | 13 | hard | merged|direct_value+direct_value+offset_difference+weighted_sum | 0.229167 | merged |
| Mathematical Equations | 14 | medium | triangle|offset_difference+sum_complement+weighted_sum | 0.527778 | triangle |
| Mathematical Equations | 15 | hard | cascade|multi_variable_sum+offset_difference+sum_complement+weighted_sum | 0.138095 | cascade |
| Mathematical Equations | 16 | medium | merged|direct_value+direct_value+multi_variable_sum | 0.180556 | merged |
| Mathematical Equations | 17 | medium | chain|direct_value+offset_difference+sum_complement | 0.2125 | chain |
| Mathematical Equations | 18 | easy | chain|direct_value+weighted_sum | 0.28125 | chain |
| Mathematical Equations | 19 | easy | direct|direct_value+offset_difference | 0.125 | direct |
| Mathematical Equations | 20 | easy | direct|direct_value+weighted_sum | 0.125 | direct |
| Latin Squares | 1 | hard | MULTI_STAGE_DEDUCTION|depth-3 | 1 | MULTI_STAGE_DEDUCTION |
| Latin Squares | 2 | hard | CHAINED_INTERMEDIATE|depth-2 | 0.512957 | CHAINED_INTERMEDIATE |
| Latin Squares | 3 | easy | ROW_COLUMN_INTERSECTION|depth-1 | 0.731195 | ROW_COLUMN_INTERSECTION |
| Latin Squares | 4 | easy | DIRECT_AXIS_ELIMINATION|depth-1 | 0.325661 | DIRECT_AXIS_ELIMINATION |
| Latin Squares | 5 | easy | DIRECT_AXIS_ELIMINATION|depth-1 | 0.104167 | DIRECT_AXIS_ELIMINATION |
| Latin Squares | 6 | medium | CHAINED_INTERMEDIATE|depth-2 | 0.378365 | CHAINED_INTERMEDIATE |
| Latin Squares | 7 | hard | MULTI_STAGE_DEDUCTION|depth-3 | 0.292659 | MULTI_STAGE_DEDUCTION |
| Latin Squares | 8 | easy | DIRECT_AXIS_ELIMINATION|depth-1 | 0.142217 | DIRECT_AXIS_ELIMINATION |
| Latin Squares | 9 | hard | MULTI_STAGE_DEDUCTION|depth-3 | 0.365616 | MULTI_STAGE_DEDUCTION |
| Latin Squares | 10 | medium | CHAINED_INTERMEDIATE|depth-2 | 0.303068 | CHAINED_INTERMEDIATE |
| Latin Squares | 11 | easy | DIRECT_AXIS_ELIMINATION|depth-1 | 0.10232 | DIRECT_AXIS_ELIMINATION |
| Latin Squares | 12 | medium | SINGLE_INTERMEDIATE|depth-2 | 0.549684 | SINGLE_INTERMEDIATE |
| Latin Squares | 13 | hard | MULTI_STAGE_DEDUCTION|depth-3 | 0.309262 | MULTI_STAGE_DEDUCTION |
| Latin Squares | 14 | hard | CHAINED_INTERMEDIATE|depth-2 | 0.325761 | CHAINED_INTERMEDIATE |
| Latin Squares | 15 | easy | DIRECT_AXIS_ELIMINATION|depth-1 | 0.145257 | DIRECT_AXIS_ELIMINATION |
| Latin Squares | 16 | medium | CHAINED_INTERMEDIATE|depth-2 | 0.266768 | CHAINED_INTERMEDIATE |
| Latin Squares | 17 | medium | CHAINED_INTERMEDIATE|depth-2 | 0.234264 | CHAINED_INTERMEDIATE |
| Latin Squares | 18 | easy | DIRECT_AXIS_ELIMINATION|depth-1 | 0.132116 | DIRECT_AXIS_ELIMINATION |
| Latin Squares | 19 | medium | SINGLE_INTERMEDIATE|depth-2 | 0.291565 | SINGLE_INTERMEDIATE |
| Latin Squares | 20 | medium | DIRECT_AXIS_ELIMINATION|depth-1 | 0.364 | DIRECT_AXIS_ELIMINATION |

### phase-5-core-mock-0005

| Module | # | Difficulty | Structural family | Novelty | Reasoning |
|---|---:|---|---|---:|---|
| Figure Sequences | 1 | easy | border | 1 | border |
| Figure Sequences | 2 | medium | border+linear-axis | 0.738095 | border + linear-axis |
| Figure Sequences | 3 | easy | border | 0.514286 | border |
| Figure Sequences | 4 | medium | linear-axis+linear-diagonal+linear-diagonal | 0.691429 | linear-axis + linear-diagonal + linear-diagonal |
| Figure Sequences | 5 | hard | direction_cycle+linear-diagonal | 0.689796 | direction_cycle + linear-diagonal |
| Figure Sequences | 6 | medium | linear-axis+linear-diagonal | 0.619048 | linear-axis + linear-diagonal |
| Figure Sequences | 7 | hard | direction_cycle+linear-axis+linear-diagonal | 0.511905 | direction_cycle + linear-axis + linear-diagonal |
| Figure Sequences | 8 | easy | border+linear-axis | 0.409524 | border + linear-axis |
| Figure Sequences | 9 | easy | border+linear-diagonal | 0.380952 | border + linear-diagonal |
| Figure Sequences | 10 | easy | border+border | 0.357143 | border + border |
| Figure Sequences | 11 | hard | border+direction_cycle+linear-axis+linear-axis | 0.620769 | border + direction_cycle + linear-axis + linear-axis |
| Figure Sequences | 12 | medium | border+direction_cycle+linear-axis | 0.546667 | border + direction_cycle + linear-axis |
| Figure Sequences | 13 | easy | linear-axis | 0.514286 | linear-axis |
| Figure Sequences | 14 | hard | border+direction_cycle | 0.589116 | border + direction_cycle |
| Figure Sequences | 15 | medium | border+border | 0.466667 | border + border |
| Figure Sequences | 16 | medium | border | 0.533333 | border |
| Figure Sequences | 17 | medium | border+border | 0.42381 | border + border |
| Figure Sequences | 18 | hard | border+linear-axis+linear-axis | 0.57674 | border + linear-axis + linear-axis |
| Figure Sequences | 19 | hard | linear-axis+linear-axis+linear-axis+linear-diagonal | 0.541054 | linear-axis + linear-axis + linear-axis + linear-diagonal |
| Figure Sequences | 20 | easy | linear-axis | 0.514286 | linear-axis |
| Mathematical Equations | 1 | easy | chain|direct_value+sum_complement | 1 | chain |
| Mathematical Equations | 2 | easy | direct|scale_divide+sum_complement | 0.510417 | direct |
| Mathematical Equations | 3 | easy | direct|sum_complement+weighted_sum | 0.305556 | direct |
| Mathematical Equations | 4 | medium | branch|multi_variable_balance+offset_difference+offset_difference | 0.645833 | branch |
| Mathematical Equations | 5 | easy | chain|direct_value+scale_divide | 0.270833 | chain |
| Mathematical Equations | 6 | hard | cascade|multi_variable_balance+offset_difference+offset_difference+offset_difference | 0.460069 | cascade |
| Mathematical Equations | 7 | medium | chain|direct_value+sum_complement+weighted_sum | 0.288194 | chain |
| Mathematical Equations | 8 | easy | reverse_chain|offset_difference+scale_divide | 0.416667 | reverse_chain |
| Mathematical Equations | 9 | easy | reverse_chain|scale_divide+sum_complement | 0.229167 | reverse_chain |
| Mathematical Equations | 10 | medium | reverse_chain|multi_variable_sum+offset_difference+weighted_sum | 0.427083 | reverse_chain |
| Mathematical Equations | 11 | hard | mixed|offset_difference+sum_complement+sum_complement+weighted_sum | 0.556944 | mixed |
| Mathematical Equations | 12 | medium | merged|direct_value+direct_value+multi_variable_balance | 0.552083 | merged |
| Mathematical Equations | 13 | medium | reverse_chain|offset_difference+weighted_sum+weighted_sum | 0.1875 | reverse_chain |
| Mathematical Equations | 14 | hard | cascade|multi_variable_sum+offset_difference+sum_complement+sum_complement | 0.276786 | cascade |
| Mathematical Equations | 15 | medium | merged|direct_value+direct_value+weighted_sum | 0.1875 | merged |
| Mathematical Equations | 16 | medium | triangle|multi_variable_balance+offset_difference+weighted_sum | 0.440972 | triangle |
| Mathematical Equations | 17 | hard | branch_recombine|multi_variable_balance+sum_complement+sum_complement+weighted_sum | 0.405556 | branch_recombine |
| Mathematical Equations | 18 | hard | cascade|offset_difference+sum_complement+weighted_sum+weighted_sum | 0.263889 | cascade |
| Mathematical Equations | 19 | hard | mixed|multi_variable_balance+offset_difference+offset_difference+sum_complement | 0.236111 | mixed |
| Mathematical Equations | 20 | easy | chain|direct_value+offset_difference | 0.229167 | chain |
| Latin Squares | 1 | medium | CHAINED_INTERMEDIATE|depth-2 | 1 | CHAINED_INTERMEDIATE |
| Latin Squares | 2 | medium | SINGLE_INTERMEDIATE|depth-2 | 0.567017 | SINGLE_INTERMEDIATE |
| Latin Squares | 3 | easy | DIRECT_AXIS_ELIMINATION|depth-1 | 0.614898 | DIRECT_AXIS_ELIMINATION |
| Latin Squares | 4 | hard | CHAINED_INTERMEDIATE|depth-2 | 0.347315 | CHAINED_INTERMEDIATE |
| Latin Squares | 5 | easy | DIRECT_AXIS_ELIMINATION|depth-1 | 0.138855 | DIRECT_AXIS_ELIMINATION |
| Latin Squares | 6 | hard | CHAINED_INTERMEDIATE|depth-2 | 0.222222 | CHAINED_INTERMEDIATE |
| Latin Squares | 7 | easy | DIRECT_AXIS_ELIMINATION|depth-1 | 0.115546 | DIRECT_AXIS_ELIMINATION |
| Latin Squares | 8 | hard | MULTI_STAGE_DEDUCTION|depth-4 | 0.636905 | MULTI_STAGE_DEDUCTION |
| Latin Squares | 9 | easy | DIRECT_AXIS_ELIMINATION|depth-1 | 0.088745 | DIRECT_AXIS_ELIMINATION |
| Latin Squares | 10 | medium | SINGLE_INTERMEDIATE|depth-2 | 0.271527 | SINGLE_INTERMEDIATE |
| Latin Squares | 11 | medium | CHAINED_INTERMEDIATE|depth-2 | 0.363653 | CHAINED_INTERMEDIATE |
| Latin Squares | 12 | easy | ROW_COLUMN_INTERSECTION|depth-1 | 0.279512 | ROW_COLUMN_INTERSECTION |
| Latin Squares | 13 | easy | DIRECT_AXIS_ELIMINATION|depth-1 | 0.111998 | DIRECT_AXIS_ELIMINATION |
| Latin Squares | 14 | hard | MULTI_STAGE_DEDUCTION|depth-3 | 0.382853 | MULTI_STAGE_DEDUCTION |
| Latin Squares | 15 | easy | DIRECT_AXIS_ELIMINATION|depth-1 | 0.115385 | DIRECT_AXIS_ELIMINATION |
| Latin Squares | 16 | medium | SINGLE_INTERMEDIATE|depth-2 | 0.298063 | SINGLE_INTERMEDIATE |
| Latin Squares | 17 | medium | CHAINED_INTERMEDIATE|depth-2 | 0.308036 | CHAINED_INTERMEDIATE |
| Latin Squares | 18 | medium | CHAINED_INTERMEDIATE|depth-2 | 0.245337 | CHAINED_INTERMEDIATE |
| Latin Squares | 19 | hard | MULTI_STAGE_DEDUCTION|depth-3 | 0.362835 | MULTI_STAGE_DEDUCTION |
| Latin Squares | 20 | hard | MULTI_STAGE_DEDUCTION|depth-3 | 0.27561 | MULTI_STAGE_DEDUCTION |

## Release blockers

- None found in the deterministic audit.

Final verdict: **READY WITH MINOR ISSUES**
