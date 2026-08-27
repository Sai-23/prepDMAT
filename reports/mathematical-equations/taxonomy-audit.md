# Mathematical Equations taxonomy audit

Accepted: 5000; attempts: 8487.
Diversity score: 71.3809. Formula: 100 * (0.35 * uniqueStructuralRatio + 0.35 * normalizedGraphEntropy + 0.30 * (1 - recentNearCloneRateAt0.90)).
Unique structural fingerprints: 1175; structural duplicate rate: 0.765; average questions per structure: 4.2553.
Largest structural cluster: {"fingerprint":"mathematical_equation-rules:v1:f31ac0c60fbd78a2","count":165,"percentage":3.3}.

## Like-for-like comparison

```json
{
  "oldSampleSize": 2000,
  "oldUniqueStructures": 549,
  "oldStructuralDuplicateRate": 0.7255,
  "oldDiversityScore": 70.5652,
  "newSampleSize": 2000,
  "newUniqueStructures": 707,
  "newStructuralDuplicateRate": 0.6465,
  "newDiversityScore": 75.5663,
  "uniqueStructureIncreasePercent": 28.7796,
  "structuralDuplicateRateImprovementPoints": 7.9,
  "diversityScoreIncrease": 5.0011,
  "fingerprintCompatibility": "unchanged Structural Fingerprint V2 semantics and weights"
}
```

## Rejections

- Validator rejection rate: 0
- Style rejection rate: 0
- Difficulty rejection rate: 0
- Novelty rejection rate: 0.4109
- Semantic-duplicate rejection rate: 0.3729
- Reference-near-clone rejection rate: 0.009
- Recent-near-clone rejection rate: 0.029
- Construction rejection rate: 0

## Graph distribution

| Graph | Count | Percentage |
| --- | ---: | ---: |
| direct | 573 | 11.46% |
| chain | 914 | 18.28% |
| reverse_chain | 830 | 16.6% |
| star | 295 | 5.9% |
| triangle | 319 | 6.38% |
| branch | 629 | 12.58% |
| branch_recombine | 273 | 5.46% |
| merged | 605 | 12.1% |
| cascade | 283 | 5.66% |
| mixed | 279 | 5.58% |

## Relationship distribution

| Relationship | Count | Percentage |
| --- | ---: | ---: |
| direct_value | 2351 | 15.6744% |
| offset_add | 1190 | 7.9339% |
| offset_subtract | 1210 | 8.0672% |
| scale | 800 | 5.3337% |
| divide_by_constant | 777 | 5.1803% |
| sum | 1357 | 9.0473% |
| difference | 1259 | 8.3939% |
| complement | 1432 | 9.5473% |
| weighted_sum | 2305 | 15.3677% |
| multi_variable_sum | 586 | 3.9069% |
| multi_variable_balance | 1732 | 11.5474% |

## Style audit

```json
{
  "variablesOutsideOneToTwenty": 0,
  "nonIntegerSolutions": 0,
  "nonUniqueSystems": 0,
  "negativeDisplayedConstants": 0,
  "constantsAbove20": 3161,
  "maximumDisplayedConstant": 40,
  "averageDisplayedConstant": 12.2553,
  "averageCoefficient": 2.9064,
  "maximumCoefficient": 5,
  "coefficientDistribution": {
    "2": {
      "count": 1955,
      "percentage": 49.8852
    },
    "3": {
      "count": 883,
      "percentage": 22.5313
    },
    "4": {
      "count": 574,
      "percentage": 14.6466
    },
    "5": {
      "count": 507,
      "percentage": 12.937
    }
  },
  "mentalArithmeticCost": {
    "count": 5000,
    "buckets": {
      "<=20": 5000,
      "21-30": 0,
      "31-40": 0,
      "41-60": 0,
      ">60": 0
    },
    "mean": 5.1908,
    "median": 4.8,
    "maximum": 15.7,
    "p90": 9.5,
    "p95": 10.45,
    "p99": 12.2
  },
  "presentationPenalty": {
    "count": 5000,
    "buckets": {
      "<=20": 5000,
      "21-30": 0,
      "31-40": 0,
      "41-60": 0,
      ">60": 0
    },
    "mean": 1.7736,
    "median": 1.49,
    "maximum": 10.15,
    "p90": 4.63,
    "p95": 5.19,
    "p99": 7.12
  }
}
```

## Visible constants by difficulty

```json
{
  "easy": {
    "count": 3827,
    "buckets": {
      "<=20": 3110,
      "21-30": 627,
      "31-40": 90,
      "41-60": 0,
      ">60": 0
    },
    "mean": 12.4876,
    "median": 12,
    "maximum": 40,
    "p90": 24,
    "p95": 27,
    "p99": 35
  },
  "medium": {
    "count": 5742,
    "buckets": {
      "<=20": 4634,
      "21-30": 695,
      "31-40": 413,
      "41-60": 0,
      ">60": 0
    },
    "mean": 12.4904,
    "median": 10,
    "maximum": 40,
    "p90": 28,
    "p95": 32,
    "p99": 38
  },
  "hard": {
    "count": 7772,
    "buckets": {
      "<=20": 6436,
      "21-30": 700,
      "31-40": 636,
      "41-60": 0,
      ">60": 0
    },
    "mean": 11.9673,
    "median": 9,
    "maximum": 40,
    "p90": 28,
    "p95": 35,
    "p99": 40
  }
}
```

## Visible constants by relationship

```json
{
  "direct_value": {
    "count": 2351,
    "buckets": {
      "<=20": 2351,
      "21-30": 0,
      "31-40": 0,
      "41-60": 0,
      ">60": 0
    },
    "mean": 10.6844,
    "median": 11,
    "maximum": 20,
    "p90": 18,
    "p95": 19,
    "p99": 20
  },
  "offset_add": {
    "count": 1190,
    "buckets": {
      "<=20": 1190,
      "21-30": 0,
      "31-40": 0,
      "41-60": 0,
      ">60": 0
    },
    "mean": 7.3513,
    "median": 7,
    "maximum": 19,
    "p90": 15,
    "p95": 16,
    "p99": 18
  },
  "offset_subtract": {
    "count": 1210,
    "buckets": {
      "<=20": 1210,
      "21-30": 0,
      "31-40": 0,
      "41-60": 0,
      ">60": 0
    },
    "mean": 6.1926,
    "median": 5,
    "maximum": 19,
    "p90": 14,
    "p95": 15,
    "p99": 18
  },
  "scale": {
    "count": 800,
    "buckets": {
      "<=20": 800,
      "21-30": 0,
      "31-40": 0,
      "41-60": 0,
      ">60": 0
    },
    "mean": 3.1425,
    "median": 3,
    "maximum": 5,
    "p90": 5,
    "p95": 5,
    "p99": 5
  },
  "divide_by_constant": {
    "count": 777,
    "buckets": {
      "<=20": 777,
      "21-30": 0,
      "31-40": 0,
      "41-60": 0,
      ">60": 0
    },
    "mean": 3.1956,
    "median": 3,
    "maximum": 5,
    "p90": 5,
    "p95": 5,
    "p99": 5
  },
  "sum": {
    "count": 1357,
    "buckets": {
      "<=20": 938,
      "21-30": 402,
      "31-40": 17,
      "41-60": 0,
      ">60": 0
    },
    "mean": 18.1297,
    "median": 19,
    "maximum": 35,
    "p90": 25,
    "p95": 27,
    "p99": 31
  },
  "difference": {
    "count": 1259,
    "buckets": {
      "<=20": 1259,
      "21-30": 0,
      "31-40": 0,
      "41-60": 0,
      ">60": 0
    },
    "mean": 8.4067,
    "median": 8,
    "maximum": 19,
    "p90": 15,
    "p95": 17,
    "p99": 19
  },
  "complement": {
    "count": 1432,
    "buckets": {
      "<=20": 1012,
      "21-30": 415,
      "31-40": 5,
      "41-60": 0,
      ">60": 0
    },
    "mean": 18.0887,
    "median": 19,
    "maximum": 35,
    "p90": 24,
    "p95": 26,
    "p99": 30
  },
  "weighted_sum": {
    "count": 4647,
    "buckets": {
      "<=20": 2928,
      "21-30": 895,
      "31-40": 824,
      "41-60": 0,
      ">60": 0
    },
    "mean": 14.813,
    "median": 5,
    "maximum": 40,
    "p90": 35,
    "p95": 38,
    "p99": 40
  },
  "multi_variable_sum": {
    "count": 586,
    "buckets": {
      "<=20": 52,
      "21-30": 245,
      "31-40": 289,
      "41-60": 0,
      ">60": 0
    },
    "mean": 30.2594,
    "median": 30,
    "maximum": 40,
    "p90": 39,
    "p95": 40,
    "p99": 40
  },
  "multi_variable_balance": {
    "count": 1732,
    "buckets": {
      "<=20": 1663,
      "21-30": 65,
      "31-40": 4,
      "41-60": 0,
      ">60": 0
    },
    "mean": 10.6848,
    "median": 10,
    "maximum": 32,
    "p90": 19,
    "p95": 20,
    "p99": 26
  }
}
```

## Graph distribution by difficulty

```json
{
  "easy": {
    "direct": {
      "count": 573,
      "percentage": 34.3731
    },
    "chain": {
      "count": 584,
      "percentage": 35.033
    },
    "reverse_chain": {
      "count": 510,
      "percentage": 30.5939
    },
    "star": {
      "count": 0,
      "percentage": 0
    },
    "triangle": {
      "count": 0,
      "percentage": 0
    },
    "branch": {
      "count": 0,
      "percentage": 0
    },
    "branch_recombine": {
      "count": 0,
      "percentage": 0
    },
    "merged": {
      "count": 0,
      "percentage": 0
    },
    "cascade": {
      "count": 0,
      "percentage": 0
    },
    "mixed": {
      "count": 0,
      "percentage": 0
    }
  },
  "medium": {
    "direct": {
      "count": 0,
      "percentage": 0
    },
    "chain": {
      "count": 330,
      "percentage": 19.796
    },
    "reverse_chain": {
      "count": 320,
      "percentage": 19.1962
    },
    "star": {
      "count": 0,
      "percentage": 0
    },
    "triangle": {
      "count": 319,
      "percentage": 19.1362
    },
    "branch": {
      "count": 356,
      "percentage": 21.3557
    },
    "branch_recombine": {
      "count": 0,
      "percentage": 0
    },
    "merged": {
      "count": 342,
      "percentage": 20.5159
    },
    "cascade": {
      "count": 0,
      "percentage": 0
    },
    "mixed": {
      "count": 0,
      "percentage": 0
    }
  },
  "hard": {
    "direct": {
      "count": 0,
      "percentage": 0
    },
    "chain": {
      "count": 0,
      "percentage": 0
    },
    "reverse_chain": {
      "count": 0,
      "percentage": 0
    },
    "star": {
      "count": 295,
      "percentage": 17.7071
    },
    "triangle": {
      "count": 0,
      "percentage": 0
    },
    "branch": {
      "count": 273,
      "percentage": 16.3866
    },
    "branch_recombine": {
      "count": 273,
      "percentage": 16.3866
    },
    "merged": {
      "count": 263,
      "percentage": 15.7863
    },
    "cascade": {
      "count": 283,
      "percentage": 16.9868
    },
    "mixed": {
      "count": 279,
      "percentage": 16.7467
    }
  }
}
```

## Relationship distribution by difficulty

```json
{
  "easy": {
    "direct_value": {
      "count": 811,
      "percentage": 24.3251
    },
    "offset_add": {
      "count": 291,
      "percentage": 8.7283
    },
    "offset_subtract": {
      "count": 275,
      "percentage": 8.2484
    },
    "scale": {
      "count": 130,
      "percentage": 3.8992
    },
    "divide_by_constant": {
      "count": 131,
      "percentage": 3.9292
    },
    "sum": {
      "count": 402,
      "percentage": 12.0576
    },
    "difference": {
      "count": 338,
      "percentage": 10.138
    },
    "complement": {
      "count": 468,
      "percentage": 14.0372
    },
    "weighted_sum": {
      "count": 488,
      "percentage": 14.6371
    },
    "multi_variable_sum": {
      "count": 0,
      "percentage": 0
    },
    "multi_variable_balance": {
      "count": 0,
      "percentage": 0
    }
  },
  "medium": {
    "direct_value": {
      "count": 1014,
      "percentage": 20.2759
    },
    "offset_add": {
      "count": 342,
      "percentage": 6.8386
    },
    "offset_subtract": {
      "count": 360,
      "percentage": 7.1986
    },
    "scale": {
      "count": 269,
      "percentage": 5.3789
    },
    "divide_by_constant": {
      "count": 250,
      "percentage": 4.999
    },
    "sum": {
      "count": 361,
      "percentage": 7.2186
    },
    "difference": {
      "count": 348,
      "percentage": 6.9586
    },
    "complement": {
      "count": 391,
      "percentage": 7.8184
    },
    "weighted_sum": {
      "count": 728,
      "percentage": 14.5571
    },
    "multi_variable_sum": {
      "count": 243,
      "percentage": 4.859
    },
    "multi_variable_balance": {
      "count": 695,
      "percentage": 13.8972
    }
  },
  "hard": {
    "direct_value": {
      "count": 526,
      "percentage": 7.8932
    },
    "offset_add": {
      "count": 557,
      "percentage": 8.3583
    },
    "offset_subtract": {
      "count": 575,
      "percentage": 8.6285
    },
    "scale": {
      "count": 401,
      "percentage": 6.0174
    },
    "divide_by_constant": {
      "count": 396,
      "percentage": 5.9424
    },
    "sum": {
      "count": 594,
      "percentage": 8.9136
    },
    "difference": {
      "count": 573,
      "percentage": 8.5984
    },
    "complement": {
      "count": 573,
      "percentage": 8.5984
    },
    "weighted_sum": {
      "count": 1089,
      "percentage": 16.3415
    },
    "multi_variable_sum": {
      "count": 343,
      "percentage": 5.1471
    },
    "multi_variable_balance": {
      "count": 1037,
      "percentage": 15.5612
    }
  }
}
```

## Hidden value distribution

```json
{
  "overall": {
    "frequencies": {
      "1": 947,
      "2": 961,
      "3": 875,
      "4": 895,
      "5": 988,
      "6": 967,
      "7": 779,
      "8": 812,
      "9": 819,
      "10": 793,
      "11": 574,
      "12": 741,
      "13": 560,
      "14": 585,
      "15": 791,
      "16": 710,
      "17": 538,
      "18": 672,
      "19": 446,
      "20": 546
    },
    "mean": 9.4408,
    "median": 9,
    "entropy": 0.9921,
    "largestValueShare": 0.0659,
    "largestValue": "5"
  },
  "byDifficulty": {
    "easy": {
      "frequencies": {
        "1": 135,
        "2": 179,
        "3": 176,
        "4": 206,
        "5": 210,
        "6": 204,
        "7": 184,
        "8": 199,
        "9": 180,
        "10": 191,
        "11": 144,
        "12": 180,
        "13": 139,
        "14": 163,
        "15": 187,
        "16": 173,
        "17": 135,
        "18": 149,
        "19": 95,
        "20": 105
      },
      "mean": 9.8431,
      "median": 9,
      "entropy": 0.9935,
      "largestValueShare": 0.063,
      "largestValue": "5"
    },
    "medium": {
      "frequencies": {
        "1": 294,
        "2": 296,
        "3": 275,
        "4": 278,
        "5": 309,
        "6": 311,
        "7": 260,
        "8": 276,
        "9": 306,
        "10": 272,
        "11": 206,
        "12": 243,
        "13": 224,
        "14": 182,
        "15": 286,
        "16": 247,
        "17": 170,
        "18": 236,
        "19": 143,
        "20": 187
      },
      "mean": 9.6411,
      "median": 9,
      "entropy": 0.9933,
      "largestValueShare": 0.0622,
      "largestValue": "6"
    },
    "hard": {
      "frequencies": {
        "1": 518,
        "2": 486,
        "3": 424,
        "4": 411,
        "5": 469,
        "6": 452,
        "7": 335,
        "8": 337,
        "9": 333,
        "10": 330,
        "11": 224,
        "12": 318,
        "13": 197,
        "14": 240,
        "15": 318,
        "16": 290,
        "17": 233,
        "18": 287,
        "19": 208,
        "20": 254
      },
      "mean": 9.0893,
      "median": 8,
      "entropy": 0.9866,
      "largestValueShare": 0.0777,
      "largestValue": "1"
    }
  },
  "byRelationship": {
    "direct_value": {
      "frequencies": {
        "1": 73,
        "2": 91,
        "3": 83,
        "4": 104,
        "5": 125,
        "6": 130,
        "7": 142,
        "8": 133,
        "9": 133,
        "10": 153,
        "11": 115,
        "12": 126,
        "13": 135,
        "14": 133,
        "15": 140,
        "16": 129,
        "17": 120,
        "18": 107,
        "19": 95,
        "20": 84
      },
      "mean": 10.6844,
      "median": 11,
      "entropy": 0.9939,
      "largestValueShare": 0.0651,
      "largestValue": "10"
    },
    "offset_add": {
      "frequencies": {
        "1": 94,
        "2": 105,
        "3": 102,
        "4": 109,
        "5": 124,
        "6": 125,
        "7": 129,
        "8": 120,
        "9": 133,
        "10": 123,
        "11": 121,
        "12": 142,
        "13": 111,
        "14": 110,
        "15": 168,
        "16": 149,
        "17": 121,
        "18": 104,
        "19": 93,
        "20": 97
      },
      "mean": 10.6151,
      "median": 11,
      "entropy": 0.996,
      "largestValueShare": 0.0706,
      "largestValue": "15"
    },
    "offset_subtract": {
      "frequencies": {
        "1": 150,
        "2": 188,
        "3": 158,
        "4": 156,
        "5": 178,
        "6": 175,
        "7": 147,
        "8": 140,
        "9": 165,
        "10": 131,
        "11": 108,
        "12": 112,
        "13": 78,
        "14": 90,
        "15": 83,
        "16": 87,
        "17": 65,
        "18": 95,
        "19": 59,
        "20": 55
      },
      "mean": 8.6723,
      "median": 8,
      "entropy": 0.9793,
      "largestValueShare": 0.0777,
      "largestValue": "2"
    },
    "scale": {
      "frequencies": {
        "1": 54,
        "2": 106,
        "3": 136,
        "4": 173,
        "5": 154,
        "6": 161,
        "7": 25,
        "8": 89,
        "9": 78,
        "10": 93,
        "11": 0,
        "12": 92,
        "13": 0,
        "14": 25,
        "15": 101,
        "16": 84,
        "17": 0,
        "18": 117,
        "19": 0,
        "20": 112
      },
      "mean": 8.925,
      "median": 7,
      "entropy": 0.9647,
      "largestValueShare": 0.1081,
      "largestValue": "4"
    },
    "divide_by_constant": {
      "frequencies": {
        "1": 112,
        "2": 119,
        "3": 158,
        "4": 169,
        "5": 150,
        "6": 142,
        "7": 36,
        "8": 71,
        "9": 58,
        "10": 83,
        "11": 0,
        "12": 98,
        "13": 0,
        "14": 36,
        "15": 85,
        "16": 75,
        "17": 0,
        "18": 74,
        "19": 0,
        "20": 88
      },
      "mean": 8.0573,
      "median": 6,
      "entropy": 0.9688,
      "largestValueShare": 0.1088,
      "largestValue": "4"
    },
    "sum": {
      "frequencies": {
        "1": 181,
        "2": 177,
        "3": 149,
        "4": 167,
        "5": 186,
        "6": 189,
        "7": 145,
        "8": 171,
        "9": 161,
        "10": 147,
        "11": 117,
        "12": 135,
        "13": 113,
        "14": 111,
        "15": 145,
        "16": 101,
        "17": 83,
        "18": 96,
        "19": 74,
        "20": 66
      },
      "mean": 9.0648,
      "median": 8,
      "entropy": 0.9865,
      "largestValueShare": 0.0696,
      "largestValue": "6"
    },
    "difference": {
      "frequencies": {
        "1": 124,
        "2": 141,
        "3": 136,
        "4": 130,
        "5": 152,
        "6": 156,
        "7": 139,
        "8": 140,
        "9": 146,
        "10": 122,
        "11": 98,
        "12": 120,
        "13": 120,
        "14": 105,
        "15": 132,
        "16": 125,
        "17": 103,
        "18": 124,
        "19": 98,
        "20": 107
      },
      "mean": 9.996,
      "median": 9,
      "entropy": 0.997,
      "largestValueShare": 0.062,
      "largestValue": "6"
    },
    "complement": {
      "frequencies": {
        "1": 155,
        "2": 183,
        "3": 173,
        "4": 163,
        "5": 207,
        "6": 202,
        "7": 178,
        "8": 182,
        "9": 174,
        "10": 164,
        "11": 137,
        "12": 147,
        "13": 113,
        "14": 107,
        "15": 142,
        "16": 127,
        "17": 93,
        "18": 101,
        "19": 63,
        "20": 53
      },
      "mean": 9.0443,
      "median": 8,
      "entropy": 0.9838,
      "largestValueShare": 0.0723,
      "largestValue": "5"
    },
    "weighted_sum": {
      "frequencies": {
        "1": 665,
        "2": 546,
        "3": 444,
        "4": 374,
        "5": 400,
        "6": 404,
        "7": 298,
        "8": 284,
        "9": 270,
        "10": 250,
        "11": 175,
        "12": 202,
        "13": 169,
        "14": 184,
        "15": 250,
        "16": 200,
        "17": 206,
        "18": 229,
        "19": 181,
        "20": 146
      },
      "mean": 8.2273,
      "median": 7,
      "entropy": 0.9685,
      "largestValueShare": 0.1132,
      "largestValue": "1"
    },
    "multi_variable_sum": {
      "frequencies": {
        "1": 150,
        "2": 141,
        "3": 131,
        "4": 111,
        "5": 136,
        "6": 133,
        "7": 109,
        "8": 82,
        "9": 120,
        "10": 115,
        "11": 73,
        "12": 94,
        "13": 55,
        "14": 52,
        "15": 91,
        "16": 92,
        "17": 60,
        "18": 103,
        "19": 49,
        "20": 66
      },
      "mean": 9.0331,
      "median": 8,
      "entropy": 0.9827,
      "largestValueShare": 0.0764,
      "largestValue": "1"
    },
    "multi_variable_balance": {
      "frequencies": {
        "1": 234,
        "2": 280,
        "3": 276,
        "4": 355,
        "5": 376,
        "6": 360,
        "7": 307,
        "8": 345,
        "9": 334,
        "10": 327,
        "11": 238,
        "12": 318,
        "13": 232,
        "14": 257,
        "15": 353,
        "16": 318,
        "17": 218,
        "18": 255,
        "19": 190,
        "20": 233
      },
      "mean": 10.0351,
      "median": 10,
      "entropy": 0.9941,
      "largestValueShare": 0.0648,
      "largestValue": "5"
    }
  }
}
```

## Mental arithmetic cost

```json
{
  "easy": {
    "mean": 2.335,
    "median": 2,
    "p90": 4.3,
    "maximum": 8
  },
  "medium": {
    "mean": 4.9469,
    "median": 5.1,
    "p90": 7.5,
    "maximum": 12.3
  },
  "hard": {
    "mean": 8.2924,
    "median": 8.4,
    "p90": 10.95,
    "maximum": 15.7
  }
}
```

## Efficiency comparison

```json
{
  "oldAccepted": 5000,
  "oldAttempts": 5776,
  "oldAttemptsPerAccepted": 1.1552,
  "phase4Accepted": 5000,
  "phase4Attempts": 8487,
  "phase4AttemptsPerAccepted": 1.6974,
  "oldObservedConstructionRejectionRate": 0,
  "phase4ObservedConstructionRejectionRate": 0,
  "relationshipFeasibility": {
    "scale": {
      "oldShare": 0.010467,
      "phase4Share": 0.0533
    },
    "divideByConstant": {
      "oldShare": 0.015534,
      "phase4Share": 0.0518
    },
    "weightedSum": {
      "oldShare": 0.161211,
      "phase4Share": 0.1537
    },
    "note": "The previous generator did not expose internal per-relationship value-resampling failures. Comparison therefore uses accepted occurrence and observed construction rejection without fabricating unavailable failure counts."
  }
}
```

## Previous-audit comparison

```json
{
  "oldVisibleConstants": {
    "constantsAbove20": 4508,
    "maximum": 40,
    "mean": 14.0336,
    "detailedBuckets": "unavailable: the Phase 3 baseline audit did not record 21-30/31-40/41-60/>60, percentiles, or per-difficulty buckets",
    "above20ByRelationshipFromFirstAttemptDiagnostic": {
      "complement": 975,
      "multi_variable_balance": 138,
      "multi_variable_sum": 745,
      "sum": 982,
      "weighted_sum": 1660
    }
  },
  "phase4VisibleConstants": {
    "count": 17341,
    "buckets": {
      "<=20": 14180,
      "21-30": 2022,
      "31-40": 1139,
      "41-60": 0,
      ">60": 0
    },
    "mean": 12.2553,
    "median": 10,
    "maximum": 40,
    "p90": 27,
    "p95": 32,
    "p99": 39
  },
  "oldRelationshipDistribution": {
    "direct_value": 0.165811,
    "offset_add": 0.052403,
    "offset_subtract": 0.05407,
    "scale": 0.010467,
    "divide_by_constant": 0.015534,
    "sum": 0.122475,
    "difference": 0.108874,
    "complement": 0.120875,
    "weighted_sum": 0.161211,
    "multi_variable_sum": 0.058671,
    "multi_variable_balance": 0.129609
  },
  "phase4RelationshipDistribution": {
    "direct_value": {
      "count": 2351,
      "percentage": 15.6744
    },
    "offset_add": {
      "count": 1190,
      "percentage": 7.9339
    },
    "offset_subtract": {
      "count": 1210,
      "percentage": 8.0672
    },
    "scale": {
      "count": 800,
      "percentage": 5.3337
    },
    "divide_by_constant": {
      "count": 777,
      "percentage": 5.1803
    },
    "sum": {
      "count": 1357,
      "percentage": 9.0473
    },
    "difference": {
      "count": 1259,
      "percentage": 8.3939
    },
    "complement": {
      "count": 1432,
      "percentage": 9.5473
    },
    "weighted_sum": {
      "count": 2305,
      "percentage": 15.3677
    },
    "multi_variable_sum": {
      "count": 586,
      "percentage": 3.9069
    },
    "multi_variable_balance": {
      "count": 1732,
      "percentage": 11.5474
    }
  },
  "oldEasyGraphDistribution": {
    "direct": 1,
    "nonDirect": 0
  },
  "phase4EasyGraphSummary": {
    "largestGraph": "chain",
    "largestGraphShare": 0.3503,
    "directShare": 0.3437,
    "nonDirectShare": 0.6563
  },
  "oldFirstAttemptHiddenValues": {
    "frequencies": {
      "1": 765,
      "2": 812,
      "3": 824,
      "4": 851,
      "5": 786,
      "6": 823,
      "7": 751,
      "8": 797,
      "9": 696,
      "10": 753,
      "11": 705,
      "12": 782,
      "13": 688,
      "14": 757,
      "15": 689,
      "16": 729,
      "17": 698,
      "18": 666,
      "19": 695,
      "20": 732
    },
    "mean": 10.1966,
    "median": 10,
    "entropy": 0.9992,
    "largestValueShare": 0.0567,
    "largestValue": "4"
  },
  "phase4HiddenValues": {
    "frequencies": {
      "1": 947,
      "2": 961,
      "3": 875,
      "4": 895,
      "5": 988,
      "6": 967,
      "7": 779,
      "8": 812,
      "9": 819,
      "10": 793,
      "11": 574,
      "12": 741,
      "13": 560,
      "14": 585,
      "15": 791,
      "16": 710,
      "17": 538,
      "18": 672,
      "19": 446,
      "20": 546
    },
    "mean": 9.4408,
    "median": 9,
    "entropy": 0.9921,
    "largestValueShare": 0.0659,
    "largestValue": "5"
  }
}
```

## Reasoning audit

```json
{
  "variableCount": {
    "2": 1667,
    "3": 1667,
    "4": 1666
  },
  "equationCount": {
    "2": 1667,
    "3": 1667,
    "4": 1666
  },
  "dependencyDepth": {
    "1": 2660,
    "2": 2057,
    "3": 283
  },
  "substitutionDepth": {
    "1": 1667,
    "2": 1348,
    "3": 1433,
    "4": 552
  },
  "targetDepth": {
    "0": 833,
    "1": 1827,
    "2": 2057,
    "3": 283
  },
  "difficulty": {
    "easy": 1667,
    "medium": 1667,
    "hard": 1666
  },
  "graphFamily": {
    "direct": 573,
    "branch": 629,
    "chain": 914,
    "mixed": 279,
    "reverse_chain": 830,
    "merged": 605,
    "cascade": 283,
    "triangle": 319,
    "star": 295,
    "branch_recombine": 273
  },
  "operatorVariety": {
    "1": 1073,
    "2": 2093,
    "3": 1627,
    "4": 207
  }
}
```

## Reference similarity

```json
{
  "maximum": 0.8264,
  "mean": 0.41,
  "above090": 0,
  "above080": 13,
  "above070": 269
}
```

## Development samples (hidden solutions; never student-facing)

### easy

#### 1. direct

- B = 24 − A
- 3 × A = B
- Seed: equation-taxonomy-audit-0
- Hidden solution: {"A":6,"B":18}
- Target: A
- Relationships: complement, scale
- Visible constants: 24, 3
- Mental arithmetic cost: 2.75
- Calculated difficulty: easy
- Structural fingerprint: mathematical_equation-rules:v1:abbcd3450953a1f1
- Novelty score: 0.2986

#### 2. chain

- B − 15 = A
- B = 17
- Seed: equation-taxonomy-audit-3
- Hidden solution: {"A":2,"B":17}
- Target: A
- Relationships: offset_subtract, direct_value
- Visible constants: 15, 17
- Mental arithmetic cost: 1.5
- Calculated difficulty: easy
- Structural fingerprint: mathematical_equation-rules:v1:6ef7ea0649df483a
- Novelty score: 0.5313

#### 3. reverse_chain

- 2 × A + B = 21
- B + A = 16
- Seed: equation-taxonomy-audit-6
- Hidden solution: {"A":5,"B":11}
- Target: B
- Relationships: weighted_sum, sum
- Visible constants: 2, 21, 16
- Mental arithmetic cost: 4.3
- Calculated difficulty: easy
- Structural fingerprint: mathematical_equation-rules:v1:ded1341b15e183b7
- Novelty score: 0.5

#### 4. reverse_chain

- 4 × B = A
- 15 − A = B
- Seed: equation-taxonomy-audit-9
- Hidden solution: {"A":12,"B":3}
- Target: B
- Relationships: scale, complement
- Visible constants: 4, 15
- Mental arithmetic cost: 2.95
- Calculated difficulty: easy
- Structural fingerprint: mathematical_equation-rules:v1:8a43d6d439350970
- Novelty score: 0.2708

#### 5. chain

- A = 4
- A + B = 19
- Seed: equation-taxonomy-audit-12
- Hidden solution: {"A":4,"B":15}
- Target: B
- Relationships: direct_value, sum
- Visible constants: 4, 19
- Mental arithmetic cost: 1
- Calculated difficulty: easy
- Structural fingerprint: mathematical_equation-rules:v1:fea45c5578e1fb61
- Novelty score: 0.5104

#### 6. reverse_chain

- B ÷ 2 = A
- A + B = 21
- Seed: equation-taxonomy-audit-15
- Hidden solution: {"A":7,"B":14}
- Target: A
- Relationships: divide_by_constant, sum
- Visible constants: 2, 21
- Mental arithmetic cost: 2.6
- Calculated difficulty: easy
- Structural fingerprint: mathematical_equation-rules:v1:35017419036a81b5
- Novelty score: 0.4167

#### 7. direct

- B = 10
- 2 × B + A = 30
- Seed: equation-taxonomy-audit-18
- Hidden solution: {"A":10,"B":10}
- Target: A
- Relationships: direct_value, weighted_sum
- Visible constants: 10, 2, 30
- Mental arithmetic cost: 3.3
- Calculated difficulty: easy
- Structural fingerprint: mathematical_equation-rules:v1:f8924025fdf8faf9
- Novelty score: 0.4514

#### 8. reverse_chain

- A − 1 = B
- 2 × B + A = 31
- Seed: equation-taxonomy-audit-21
- Hidden solution: {"A":11,"B":10}
- Target: B
- Relationships: offset_subtract, weighted_sum
- Visible constants: 1, 2, 31
- Mental arithmetic cost: 4.3
- Calculated difficulty: easy
- Structural fingerprint: mathematical_equation-rules:v1:71d9957fc81d788b
- Novelty score: 0.4792

#### 9. direct

- A = 19
- 26 − A = B
- Seed: equation-taxonomy-audit-24
- Hidden solution: {"A":19,"B":7}
- Target: B
- Relationships: direct_value, complement
- Visible constants: 19, 26
- Mental arithmetic cost: 1.5
- Calculated difficulty: easy
- Structural fingerprint: mathematical_equation-rules:v1:67e542b70c9edfeb
- Novelty score: 0.4479

#### 10. chain

- A = 15
- A − 7 = B
- Seed: equation-taxonomy-audit-27
- Hidden solution: {"A":15,"B":8}
- Target: A
- Relationships: direct_value, offset_subtract
- Visible constants: 15, 7
- Mental arithmetic cost: 1
- Calculated difficulty: easy
- Structural fingerprint: mathematical_equation-rules:v1:8bbd9e1b4fc3062f
- Novelty score: 0.3958

### medium

#### 1. branch

- 13 − C = A
- C + 12 = B
- 37 = 2 × C + A + B
- Seed: equation-taxonomy-audit-1
- Hidden solution: {"A":7,"B":18,"C":6}
- Target: A
- Relationships: complement, offset_add, weighted_sum
- Visible constants: 13, 12, 37, 2
- Mental arithmetic cost: 6.3
- Calculated difficulty: medium
- Structural fingerprint: mathematical_equation-rules:v1:8a7f22711b89dccd
- Novelty score: 0.6042

#### 2. chain

- C + 7 = B
- B − 2 = A
- C = 5
- Seed: equation-taxonomy-audit-4
- Hidden solution: {"A":10,"B":12,"C":5}
- Target: A
- Relationships: offset_add, offset_subtract, direct_value
- Visible constants: 7, 2, 5
- Mental arithmetic cost: 2
- Calculated difficulty: medium
- Structural fingerprint: mathematical_equation-rules:v1:a39b2d33492ca557
- Novelty score: 0.2222

#### 3. merged

- A = 8
- 5 = B
- C + B − A = 14
- Seed: equation-taxonomy-audit-7
- Hidden solution: {"A":8,"B":5,"C":17}
- Target: C
- Relationships: direct_value, direct_value, multi_variable_balance
- Visible constants: 8, 5, 14
- Mental arithmetic cost: 3.1
- Calculated difficulty: medium
- Structural fingerprint: mathematical_equation-rules:v1:f31ac0c60fbd78a2
- Novelty score: 0.5667

#### 4. reverse_chain

- B + 12 = A
- 28 = B + A + C
- A + C = 21
- Seed: equation-taxonomy-audit-10
- Hidden solution: {"A":19,"B":7,"C":2}
- Target: C
- Relationships: offset_add, multi_variable_sum, sum
- Visible constants: 12, 28, 21
- Mental arithmetic cost: 5.8
- Calculated difficulty: medium
- Structural fingerprint: mathematical_equation-rules:v1:5d68e6d476589b50
- Novelty score: 0.4306

#### 5. chain

- B = A − 2
- 11 = A
- C − B = 4
- Seed: equation-taxonomy-audit-13
- Hidden solution: {"A":11,"B":9,"C":13}
- Target: C
- Relationships: offset_subtract, direct_value, difference
- Visible constants: 2, 11, 4
- Mental arithmetic cost: 2
- Calculated difficulty: medium
- Structural fingerprint: mathematical_equation-rules:v1:95b0a2267570d4aa
- Novelty score: 0.3785

#### 6. branch

- 22 − B = C
- A = B − 3
- B + A + C = 27
- Seed: equation-taxonomy-audit-16
- Hidden solution: {"A":5,"B":8,"C":14}
- Target: A
- Relationships: complement, offset_subtract, multi_variable_sum
- Visible constants: 22, 3, 27
- Mental arithmetic cost: 5.8
- Calculated difficulty: medium
- Structural fingerprint: mathematical_equation-rules:v1:7dc10ec1603ffcbd
- Novelty score: 0.5347

#### 7. chain

- 5 × B = A
- C ÷ 2 = B
- C = 8
- Seed: equation-taxonomy-audit-19
- Hidden solution: {"A":20,"B":4,"C":8}
- Target: A
- Relationships: scale, divide_by_constant, direct_value
- Visible constants: 5, 2, 8
- Mental arithmetic cost: 2.35
- Calculated difficulty: medium
- Structural fingerprint: mathematical_equation-rules:v1:23a3326c2be53d48
- Novelty score: 0.5035

#### 8. chain

- C = 11 − A
- B = 19
- B + 2 × A = 25
- Seed: equation-taxonomy-audit-22
- Hidden solution: {"A":3,"B":19,"C":8}
- Target: C
- Relationships: complement, direct_value, weighted_sum
- Visible constants: 11, 19, 2, 25
- Mental arithmetic cost: 3.6
- Calculated difficulty: medium
- Structural fingerprint: mathematical_equation-rules:v1:73f2aee06fa5a04c
- Novelty score: 0.2694

#### 9. triangle

- 6 − A = B
- 12 = C − A − B
- A + 2 = B
- Seed: equation-taxonomy-audit-25
- Hidden solution: {"A":2,"B":4,"C":18}
- Target: C
- Relationships: complement, multi_variable_balance, offset_add
- Visible constants: 6, 12, 2
- Mental arithmetic cost: 4
- Calculated difficulty: medium
- Structural fingerprint: mathematical_equation-rules:v1:ffa34a452391f281
- Novelty score: 0.301

#### 10. merged

- B + C − A = 14
- C = 4
- 8 = A
- Seed: equation-taxonomy-audit-28
- Hidden solution: {"A":8,"B":18,"C":4}
- Target: B
- Relationships: multi_variable_balance, direct_value, direct_value
- Visible constants: 14, 4, 8
- Mental arithmetic cost: 3.1
- Calculated difficulty: medium
- Structural fingerprint: mathematical_equation-rules:v1:f31ac0c60fbd78a2
- Novelty score: 0.5938

### hard

#### 1. branch

- D = A ÷ 2
- A + B − D − C = 13
- 34 = A + 2 × B
- D − 5 = C
- Seed: equation-taxonomy-audit-2
- Hidden solution: {"A":18,"B":8,"C":4,"D":9}
- Target: C
- Relationships: divide_by_constant, multi_variable_balance, weighted_sum, offset_subtract
- Visible constants: 2, 13, 34, 2, 5
- Mental arithmetic cost: 9.4
- Calculated difficulty: hard
- Structural fingerprint: mathematical_equation-rules:v1:d7af97bb9d05cccf
- Novelty score: 0.3878

#### 2. mixed

- 15 = C + B
- C + 9 = A
- B = C + 3
- D + A − B = 20
- Seed: equation-taxonomy-audit-5
- Hidden solution: {"A":15,"B":9,"C":6,"D":14}
- Target: D
- Relationships: sum, offset_add, offset_add, multi_variable_balance
- Visible constants: 15, 9, 3, 20
- Mental arithmetic cost: 6.8
- Calculated difficulty: hard
- Structural fingerprint: mathematical_equation-rules:v1:244c5eae238e9212
- Novelty score: 0.4834

#### 3. mixed

- A − 5 = D
- 27 = B + C + D
- A ÷ 2 = C
- A + 4 × C = 30
- Seed: equation-taxonomy-audit-8
- Hidden solution: {"A":10,"B":17,"C":5,"D":5}
- Target: B
- Relationships: offset_subtract, multi_variable_sum, divide_by_constant, weighted_sum
- Visible constants: 5, 27, 2, 4, 30
- Mental arithmetic cost: 8.95
- Calculated difficulty: hard
- Structural fingerprint: mathematical_equation-rules:v1:67056d3653fd0d72
- Novelty score: 0.2872

#### 4. merged

- B = 2
- A = 3
- C + A + B = 24
- D = C + 1
- Seed: equation-taxonomy-audit-11
- Hidden solution: {"A":3,"B":2,"C":19,"D":20}
- Target: D
- Relationships: direct_value, direct_value, multi_variable_sum, offset_add
- Visible constants: 2, 3, 24, 1
- Mental arithmetic cost: 4.2
- Calculated difficulty: hard
- Structural fingerprint: mathematical_equation-rules:v1:e4ed4699df791e3d
- Novelty score: 0.5365

#### 5. cascade

- B = C − 10
- 17 = C + B − D − A
- A = 13 − D
- D = B ÷ 2
- Seed: equation-taxonomy-audit-14
- Hidden solution: {"A":8,"B":10,"C":20,"D":5}
- Target: A
- Relationships: offset_subtract, multi_variable_balance, complement, divide_by_constant
- Visible constants: 10, 17, 13, 2
- Mental arithmetic cost: 8.8
- Calculated difficulty: hard
- Structural fingerprint: mathematical_equation-rules:v1:f3858b2ba3a09f57
- Novelty score: 0.6042

#### 6. merged

- D = 10
- 32 = 3 × B + A + D
- 14 = C − B
- 19 = A
- Seed: equation-taxonomy-audit-17
- Hidden solution: {"A":19,"B":1,"C":15,"D":10}
- Target: C
- Relationships: direct_value, weighted_sum, difference, direct_value
- Visible constants: 10, 32, 3, 14, 19
- Mental arithmetic cost: 6.15
- Calculated difficulty: hard
- Structural fingerprint: mathematical_equation-rules:v1:8d91c8340b05bb28
- Novelty score: 0.6577

#### 7. mixed

- C = 20 − D
- 9 = B − D
- C = 4 × D
- A + C + B = 38
- Seed: equation-taxonomy-audit-20
- Hidden solution: {"A":9,"B":13,"C":16,"D":4}
- Target: A
- Relationships: complement, difference, scale, multi_variable_sum
- Visible constants: 20, 9, 4, 38
- Mental arithmetic cost: 7.85
- Calculated difficulty: hard
- Structural fingerprint: mathematical_equation-rules:v1:53b483cc5a422ac0
- Novelty score: 0.6076

#### 8. mixed

- 12 = C + D
- 3 × C + A = 15
- D − C = 8
- 20 = B + D − A
- Seed: equation-taxonomy-audit-23
- Hidden solution: {"A":9,"B":19,"C":2,"D":10}
- Target: B
- Relationships: sum, weighted_sum, difference, multi_variable_balance
- Visible constants: 12, 3, 15, 8, 20
- Mental arithmetic cost: 8.05
- Calculated difficulty: hard
- Structural fingerprint: mathematical_equation-rules:v1:e673f2df79994ee3
- Novelty score: 0.2569

#### 9. star

- 29 = B + C
- 21 = B + A
- B + 4 × D = 17
- B + A − C − D = 4
- Seed: equation-taxonomy-audit-26
- Hidden solution: {"A":8,"B":13,"C":16,"D":1}
- Target: D
- Relationships: sum, sum, weighted_sum, multi_variable_balance
- Visible constants: 29, 21, 4, 17, 4
- Mental arithmetic cost: 10.45
- Calculated difficulty: hard
- Structural fingerprint: mathematical_equation-rules:v1:d047eeba403001e6
- Novelty score: 0.4854

#### 10. cascade

- B + C − A − D = 15
- A + 7 = C
- 19 = B + A
- C ÷ 5 = D
- Seed: equation-taxonomy-audit-29
- Hidden solution: {"A":8,"B":11,"C":15,"D":3}
- Target: D
- Relationships: multi_variable_balance, offset_add, sum, divide_by_constant
- Visible constants: 15, 7, 19, 5
- Mental arithmetic cost: 8.15
- Calculated difficulty: hard
- Structural fingerprint: mathematical_equation-rules:v1:130262297563d3c5
- Novelty score: 0.4236
