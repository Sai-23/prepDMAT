# Latin Square difficulty audit

Accepted sample: 100 per difficulty (300 total).

| Difficulty | Clues min/median/avg/max | Initial candidates avg | Target rounds | Forced before target avg | Direct/indirect/multi-stage | Row deps avg | Column deps avg | Depth avg | Working memory avg | Solver reject rate | Ambiguity reject rate | Structural duplicate rate |
| --- | --- | ---: | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| easy | 10/11/11.02/13 | 1 | 1:100 | 0 | 100/0/0 | 0 | 0 | 1 | 3 | 0 | 0 | 0 |
| medium | 10/11/11.54/15 | 2.26 | 2:100 | 2.75 | 0/100/0 | 1.01 | 1.36 | 2 | 10.76 | 0 | 0 | 0.03 |
| hard | 10/12/12.44/15 | 3.66 | 2:68, 3:27, 4:5 | 6.61 | 0/68/32 | 3.14 | 3.95 | 2.37 | 20.94 | 0 | 0 | 0.04 |

Target row and column distributions (positions 1-5):

- easy: rows 14/20/23/21/22; columns 18/21/22/21/18
- medium: rows 18/20/22/20/20; columns 17/19/26/17/21
- hard: rows 18/13/19/33/17; columns 20/20/18/16/26

Rates are proportions from 0 to 1. Structural signatures ignore A-E relabeling.
