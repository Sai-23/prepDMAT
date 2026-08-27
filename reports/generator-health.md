# Generator health report

Accepted 6000 questions (2000 per module).

Diversity score = 100 × (0.35 × unique structural ratio + 0.35 × normalized rule-distribution entropy + 0.30 × (1 − recent near-clone rate)). A near-clone has similarity ≥ 0.90.

| Module | Diversity | Unique structures | Avg questions/structure | Structural duplicate rate | Exact duplicate rate | Avg recent similarity | Validation failure rate | Reference max/mean | >.90/.80/.70 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| figure_sequence | 71.9735 | 788 | 2.5381 | 0.606 | 0 | 0.6191 | 0 | not tracked | 0/0/0 |
| mathematical_equation | 69.3869 | 424 | 4.717 | 0.788 | 0 | 0.7182 | 0 | 0.7895/0.4865 | 0/0/667 |
| latin_square | 96.9917 | 1913 | 1.0455 | 0.0435 | 0 | 0.7914 | 0.9062 | not tracked | 0/0/0 |

Reference similarity is reported only where normalized reference evidence is present in the repository. No official question bodies are stored.

## figure_sequence

- Difficulty distribution: {"easy":667,"medium":667,"hard":666}
- Rule distribution: {"linear":3498,"border":998,"direction_cycle":858}
- Candidate attempts: 4128; validation failures: 0; construction failures: 1768; novelty/duplicate rejections: 360.
- Largest exact structural cluster: 10.95%; top fingerprints: figure_sequence-rules:v1:1836ef9aa1d32966=219, figure_sequence-rules:v1:f8e8844655e822e2=163, figure_sequence-rules:v1:458b4dfcf1a8c0d0=154, figure_sequence-rules:v1:7f121abfa3de7fc3=80, figure_sequence-rules:v1:3e8d7fa8d91fbabc=51, figure_sequence-rules:v1:61fc5d9a5249f666=20, figure_sequence-rules:v1:37f0a04068afe7fc=19, figure_sequence-rules:v1:ee93d4761ce8cfd2=19, figure_sequence-rules:v1:9d23248eb97e24da=19, figure_sequence-rules:v1:fade7e1888662a4c=19.
- Figure object counts: {"1":448,"2":268,"3":766,"4":518}

## mathematical_equation

- Difficulty distribution: {"easy":667,"medium":667,"hard":666}
- Rule distribution: {"coupled_pair":667,"star":322,"merged":325,"chain":284,"mixed":214,"branch_recombine":188}
- Candidate attempts: 3845; validation failures: 0; construction failures: 0; novelty/duplicate rejections: 1845.
- Largest exact structural cluster: 15.10%; top fingerprints: mathematical_equation-rules:v1:1effc503c1bd2117=302, mathematical_equation-rules:v1:f1ddfb78a764b8dc=260, mathematical_equation-rules:v1:289a9d1caa835f50=105, mathematical_equation-rules:v1:f34efe58a4d7b21c=23, mathematical_equation-rules:v1:051d17c589a233a9=20, mathematical_equation-rules:v1:9a4dfb5c9d498940=20, mathematical_equation-rules:v1:a706721cfa36b088=19, mathematical_equation-rules:v1:c3c855bc1557eee0=19, mathematical_equation-rules:v1:c5c23e93a9e2886f=17, mathematical_equation-rules:v1:198ad403df53882f=16.
- Dependency graphs: {"coupled_pair":667,"star":322,"merged":325,"chain":284,"mixed":214,"branch_recombine":188}

## latin_square

- Difficulty distribution: {"easy":667,"medium":667,"hard":666}
- Rule distribution: {"direct":667,"indirect":667,"multi_stage":666}
- Candidate attempts: 21577; validation failures: 19554; construction failures: 0; novelty/duplicate rejections: 23.
- Largest exact structural cluster: 0.20%; top fingerprints: latin_square-rules:v1:3639123b6082eaa7=4, latin_square-rules:v1:4863e69ad9bf04e6=4, latin_square-rules:v1:a01ee8b075e3dc8c=3, latin_square-rules:v1:8c0006063a86b36a=3, latin_square-rules:v1:827a6f9f4266e843=3, latin_square-rules:v1:ce37dcacc45bdc88=3, latin_square-rules:v1:e66181eaa6735bd6=3, latin_square-rules:v1:ea6bd93c0410f380=3, latin_square-rules:v1:2353e8b36e365777=2, latin_square-rules:v1:96d67c6b36d54e8f=2.
- Average target deduction depth: 2.0075.

## Recommended improvements

- Figure Sequences: add more specification-supported low-complexity compositions and rebalance the largest movement clusters.
- Mathematical Equations: broaden easy two-variable relationship shapes while preserving the 1-20 integer domain and independent uniqueness proof.
- Latin Squares: make clue removal more goal-directed to reduce the high rejected-candidate rate without relaxing validation.
- Reference protection: add normalized profiles for the actual Figure and Latin reference questions when those source structures are available.
