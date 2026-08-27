# Latin Squares reasoning-taxonomy audit

Accepted: 5000; attempts: 5987; diversity score: 92.2045.

## Core metrics

```json
{
  "rejectionRates": {
    "construction": 0,
    "uniqueness": 0,
    "difficulty": 0.0167,
    "novelty": 0.0299,
    "pedagogical": 0.1183,
    "otherValidation": 0
  },
  "exactDuplicateRate": 0,
  "uniqueStructuralFingerprints": 3962,
  "structuralDuplicateRate": 0.2076,
  "largestStructuralCluster": {
    "fingerprint": "latin_square-rules:v1:f460e14a2fbb8a46",
    "count": 17,
    "percentage": 0.34
  },
  "averageQuestionsPerStructure": 1.262,
  "recentNearCloneRateAt090": 0,
  "diversityScore": 92.2045
}
```

## Old vs new

```json
{
  "oldSampleSize": 2000,
  "oldUniqueStructures": 1913,
  "oldStructuralDuplicateRate": 0.0435,
  "oldLargestClusterPercentage": 0.2,
  "oldDiversityScore": 96.9917,
  "oldValidationFailureRate": 0.9062,
  "newSampleSize": 2000,
  "newUniqueStructures": 1767,
  "newStructuralDuplicateRate": 0.1165,
  "newLargestClusterPercentage": 0.3,
  "newDiversityScore": 95.6561,
  "newValidationFailureRate": 0.135,
  "interpretation": "V2 deliberately merges symbol, row, column, and transpose variants and preserves target deduction topology; raw uniqueness is therefore stricter and not directly equivalent to the clue-mask-heavy V1 count."
}
```

## Deduction distribution

```json
{
  "easy": {
    "DIRECT_ROW_ELIMINATION": {
      "count": 661,
      "percentage": 39.6521
    },
    "DIRECT_COLUMN_ELIMINATION": {
      "count": 679,
      "percentage": 40.7319
    },
    "ROW_COLUMN_INTERSECTION": {
      "count": 327,
      "percentage": 19.6161
    },
    "SINGLE_INTERMEDIATE": {
      "count": 0,
      "percentage": 0
    },
    "CHAINED_INTERMEDIATE": {
      "count": 0,
      "percentage": 0
    },
    "MULTI_STAGE_DEDUCTION": {
      "count": 0,
      "percentage": 0
    }
  },
  "medium": {
    "DIRECT_ROW_ELIMINATION": {
      "count": 0,
      "percentage": 0
    },
    "DIRECT_COLUMN_ELIMINATION": {
      "count": 0,
      "percentage": 0
    },
    "ROW_COLUMN_INTERSECTION": {
      "count": 0,
      "percentage": 0
    },
    "SINGLE_INTERMEDIATE": {
      "count": 670,
      "percentage": 40.192
    },
    "CHAINED_INTERMEDIATE": {
      "count": 997,
      "percentage": 59.808
    },
    "MULTI_STAGE_DEDUCTION": {
      "count": 0,
      "percentage": 0
    }
  },
  "hard": {
    "DIRECT_ROW_ELIMINATION": {
      "count": 0,
      "percentage": 0
    },
    "DIRECT_COLUMN_ELIMINATION": {
      "count": 0,
      "percentage": 0
    },
    "ROW_COLUMN_INTERSECTION": {
      "count": 0,
      "percentage": 0
    },
    "SINGLE_INTERMEDIATE": {
      "count": 0,
      "percentage": 0
    },
    "CHAINED_INTERMEDIATE": {
      "count": 1094,
      "percentage": 65.6663
    },
    "MULTI_STAGE_DEDUCTION": {
      "count": 572,
      "percentage": 34.3337
    }
  }
}
```

## Difficulty and clue quality

```json
{
  "easy": {
    "averageTargetDepth": 1,
    "averageIntermediateCells": 0,
    "averageMaximumDeductionDepth": 1,
    "averageCandidateEliminations": 4,
    "averageRowColumnAlternations": 0,
    "averageEssentialClues": 4,
    "averageRedundantClues": 6.919,
    "averageRedundancyRatio": 0.6307,
    "averageBlanks": 14.081,
    "averageVisibleClues": 10.919,
    "highestRedundancyRatio": 0.6923,
    "lowestRedundancyRatio": 0.6
  },
  "medium": {
    "averageTargetDepth": 2.0042,
    "averageIntermediateCells": 2.6335,
    "averageMaximumDeductionDepth": 2.0042,
    "averageCandidateEliminations": 14.5339,
    "averageRowColumnAlternations": 0.003,
    "averageEssentialClues": 7.1566,
    "averageRedundantClues": 4.2322,
    "averageRedundancyRatio": 0.3703,
    "averageBlanks": 13.6113,
    "averageVisibleClues": 11.3887,
    "highestRedundancyRatio": 0.75,
    "lowestRedundancyRatio": 0
  },
  "hard": {
    "averageTargetDepth": 2.3764,
    "averageIntermediateCells": 6.3103,
    "averageMaximumDeductionDepth": 2.3764,
    "averageCandidateEliminations": 29.2413,
    "averageRowColumnAlternations": 0.5726,
    "averageEssentialClues": 11.3926,
    "averageRedundantClues": 0.8619,
    "averageRedundancyRatio": 0.0678,
    "averageBlanks": 12.7455,
    "averageVisibleClues": 12.2545,
    "highestRedundancyRatio": 0.3636,
    "lowestRedundancyRatio": 0
  }
}
```

## Uniqueness

```json
{
  "targetCandidateCountDistribution": {
    "1": 5000
  },
  "fullGridSolutionCountDistribution": {
    "1": 4235,
    "2+": 765
  },
  "targetUniqueButGridNonUnique": 765,
  "fullyUnique": 4235,
  "note": "2+ means enumeration stopped after proving at least two full-grid completions; production continues to require target uniqueness, matching prior behavior."
}
```

## Reference similarity

```json
{
  "available": false,
  "profileCount": 0,
  "reason": "The repository contains Latin rule provenance and reasoning classifications but no normalized structures derived from actual official Latin examples; no profiles were fabricated."
}
```

## Development samples (diagnostic only)

```json
{
  "easy": [
    {
      "seed": "latin-taxonomy-v2-0",
      "puzzleGrid": [
        [
          "C",
          ".",
          ".",
          ".",
          "A"
        ],
        [
          "A",
          "C",
          "?",
          "B",
          "E"
        ],
        [
          ".",
          ".",
          ".",
          ".",
          "."
        ],
        [
          ".",
          "A",
          ".",
          "C",
          "D"
        ],
        [
          ".",
          "E",
          ".",
          "A",
          "."
        ]
      ],
      "targetCoordinate": {
        "row": 2,
        "column": 3
      },
      "correctTarget": "D",
      "reasoningClassification": "DIRECT_ROW_ELIMINATION",
      "targetDepth": 1,
      "requiredIntermediateCells": 0,
      "deductionPathSummary": [
        {
          "cell": "2:3",
          "symbol": "D",
          "reason": "single_candidate",
          "dependencies": []
        }
      ],
      "candidateEliminationProfile": {
        "targetInitialCandidates": 1,
        "totalEliminations": 4,
        "rowColumnAlternations": 0
      },
      "essentialClueCount": 4,
      "redundantClueCount": 7,
      "difficultyScore": 10.85,
      "structuralFingerprint": "latin_square-rules:v1:95a37baa706ab986",
      "noveltyScore": 1
    },
    {
      "seed": "latin-taxonomy-v2-3",
      "puzzleGrid": [
        [
          ".",
          ".",
          "D",
          ".",
          "."
        ],
        [
          "A",
          ".",
          "E",
          "B",
          "."
        ],
        [
          "C",
          "E",
          "B",
          "A",
          "?"
        ],
        [
          ".",
          ".",
          ".",
          "C",
          "."
        ],
        [
          ".",
          ".",
          ".",
          "D",
          "."
        ]
      ],
      "targetCoordinate": {
        "row": 3,
        "column": 5
      },
      "correctTarget": "D",
      "reasoningClassification": "DIRECT_ROW_ELIMINATION",
      "targetDepth": 1,
      "requiredIntermediateCells": 0,
      "deductionPathSummary": [
        {
          "cell": "3:5",
          "symbol": "D",
          "reason": "single_candidate",
          "dependencies": []
        }
      ],
      "candidateEliminationProfile": {
        "targetInitialCandidates": 1,
        "totalEliminations": 4,
        "rowColumnAlternations": 0
      },
      "essentialClueCount": 4,
      "redundantClueCount": 6,
      "difficultyScore": 10.7,
      "structuralFingerprint": "latin_square-rules:v1:f0002895cb028cb9",
      "noveltyScore": 0.16
    },
    {
      "seed": "latin-taxonomy-v2-6",
      "puzzleGrid": [
        [
          ".",
          "D",
          ".",
          "C",
          "A"
        ],
        [
          ".",
          "A",
          "E",
          ".",
          "."
        ],
        [
          ".",
          "C",
          "D",
          "E",
          "."
        ],
        [
          ".",
          "?",
          ".",
          ".",
          "."
        ],
        [
          "B",
          "E",
          ".",
          "A",
          "."
        ]
      ],
      "targetCoordinate": {
        "row": 4,
        "column": 2
      },
      "correctTarget": "B",
      "reasoningClassification": "DIRECT_COLUMN_ELIMINATION",
      "targetDepth": 1,
      "requiredIntermediateCells": 0,
      "deductionPathSummary": [
        {
          "cell": "4:2",
          "symbol": "B",
          "reason": "single_candidate",
          "dependencies": []
        }
      ],
      "candidateEliminationProfile": {
        "targetInitialCandidates": 1,
        "totalEliminations": 4,
        "rowColumnAlternations": 0
      },
      "essentialClueCount": 4,
      "redundantClueCount": 7,
      "difficultyScore": 10.85,
      "structuralFingerprint": "latin_square-rules:v1:7164e80cd7e85338",
      "noveltyScore": 0.1335
    },
    {
      "seed": "latin-taxonomy-v2-9",
      "puzzleGrid": [
        [
          ".",
          "E",
          "C",
          ".",
          "B"
        ],
        [
          "C",
          ".",
          "E",
          "D",
          "."
        ],
        [
          ".",
          "A",
          "B",
          "C",
          "."
        ],
        [
          ".",
          "D",
          "A",
          "E",
          "."
        ],
        [
          ".",
          ".",
          "?",
          ".",
          "."
        ]
      ],
      "targetCoordinate": {
        "row": 5,
        "column": 3
      },
      "correctTarget": "D",
      "reasoningClassification": "DIRECT_COLUMN_ELIMINATION",
      "targetDepth": 1,
      "requiredIntermediateCells": 0,
      "deductionPathSummary": [
        {
          "cell": "5:3",
          "symbol": "D",
          "reason": "single_candidate",
          "dependencies": []
        }
      ],
      "candidateEliminationProfile": {
        "targetInitialCandidates": 1,
        "totalEliminations": 4,
        "rowColumnAlternations": 0
      },
      "essentialClueCount": 4,
      "redundantClueCount": 8,
      "difficultyScore": 11,
      "structuralFingerprint": "latin_square-rules:v1:b953fcbdd1a6ecf9",
      "noveltyScore": 0.1321
    },
    {
      "seed": "latin-taxonomy-v2-12",
      "puzzleGrid": [
        [
          ".",
          "B",
          ".",
          "A",
          "D"
        ],
        [
          ".",
          "?",
          ".",
          ".",
          "."
        ],
        [
          ".",
          "D",
          ".",
          ".",
          "C"
        ],
        [
          ".",
          "C",
          "B",
          ".",
          "E"
        ],
        [
          ".",
          "A",
          "C",
          "E",
          "B"
        ]
      ],
      "targetCoordinate": {
        "row": 2,
        "column": 2
      },
      "correctTarget": "E",
      "reasoningClassification": "DIRECT_COLUMN_ELIMINATION",
      "targetDepth": 1,
      "requiredIntermediateCells": 0,
      "deductionPathSummary": [
        {
          "cell": "2:2",
          "symbol": "E",
          "reason": "single_candidate",
          "dependencies": []
        }
      ],
      "candidateEliminationProfile": {
        "targetInitialCandidates": 1,
        "totalEliminations": 4,
        "rowColumnAlternations": 0
      },
      "essentialClueCount": 4,
      "redundantClueCount": 8,
      "difficultyScore": 11,
      "structuralFingerprint": "latin_square-rules:v1:67b38feef6772bfa",
      "noveltyScore": 0.1289
    },
    {
      "seed": "latin-taxonomy-v2-15",
      "puzzleGrid": [
        [
          "E",
          ".",
          ".",
          ".",
          "."
        ],
        [
          "D",
          "E",
          "A",
          "?",
          "B"
        ],
        [
          "A",
          "B",
          ".",
          ".",
          "D"
        ],
        [
          ".",
          ".",
          ".",
          ".",
          "."
        ],
        [
          "B",
          ".",
          "D",
          ".",
          "."
        ]
      ],
      "targetCoordinate": {
        "row": 2,
        "column": 4
      },
      "correctTarget": "C",
      "reasoningClassification": "DIRECT_ROW_ELIMINATION",
      "targetDepth": 1,
      "requiredIntermediateCells": 0,
      "deductionPathSummary": [
        {
          "cell": "2:4",
          "symbol": "C",
          "reason": "single_candidate",
          "dependencies": []
        }
      ],
      "candidateEliminationProfile": {
        "targetInitialCandidates": 1,
        "totalEliminations": 4,
        "rowColumnAlternations": 0
      },
      "essentialClueCount": 4,
      "redundantClueCount": 6,
      "difficultyScore": 10.7,
      "structuralFingerprint": "latin_square-rules:v1:dff63d78ff7618d4",
      "noveltyScore": 0.1431
    },
    {
      "seed": "latin-taxonomy-v2-18",
      "puzzleGrid": [
        [
          "C",
          ".",
          "B",
          ".",
          "D"
        ],
        [
          "A",
          ".",
          "E",
          ".",
          "C"
        ],
        [
          ".",
          ".",
          "?",
          ".",
          "."
        ],
        [
          "B",
          ".",
          "D",
          ".",
          "A"
        ],
        [
          ".",
          "A",
          "C",
          ".",
          "B"
        ]
      ],
      "targetCoordinate": {
        "row": 3,
        "column": 3
      },
      "correctTarget": "A",
      "reasoningClassification": "DIRECT_COLUMN_ELIMINATION",
      "targetDepth": 1,
      "requiredIntermediateCells": 0,
      "deductionPathSummary": [
        {
          "cell": "3:3",
          "symbol": "A",
          "reason": "single_candidate",
          "dependencies": []
        }
      ],
      "candidateEliminationProfile": {
        "targetInitialCandidates": 1,
        "totalEliminations": 4,
        "rowColumnAlternations": 0
      },
      "essentialClueCount": 4,
      "redundantClueCount": 8,
      "difficultyScore": 11,
      "structuralFingerprint": "latin_square-rules:v1:6a8e0da053699c3c",
      "noveltyScore": 0.1431
    },
    {
      "seed": "latin-taxonomy-v2-21",
      "puzzleGrid": [
        [
          "E",
          "C",
          "A",
          "D",
          "."
        ],
        [
          ".",
          "E",
          "D",
          ".",
          "."
        ],
        [
          ".",
          "?",
          ".",
          ".",
          "."
        ],
        [
          ".",
          "A",
          "E",
          "B",
          "C"
        ],
        [
          "C",
          "D",
          ".",
          "A",
          "."
        ]
      ],
      "targetCoordinate": {
        "row": 3,
        "column": 2
      },
      "correctTarget": "B",
      "reasoningClassification": "DIRECT_COLUMN_ELIMINATION",
      "targetDepth": 1,
      "requiredIntermediateCells": 0,
      "deductionPathSummary": [
        {
          "cell": "3:2",
          "symbol": "B",
          "reason": "single_candidate",
          "dependencies": []
        }
      ],
      "candidateEliminationProfile": {
        "targetInitialCandidates": 1,
        "totalEliminations": 4,
        "rowColumnAlternations": 0
      },
      "essentialClueCount": 4,
      "redundantClueCount": 9,
      "difficultyScore": 11.15,
      "structuralFingerprint": "latin_square-rules:v1:890b9526e858064a",
      "noveltyScore": 0.1279
    },
    {
      "seed": "latin-taxonomy-v2-24",
      "puzzleGrid": [
        [
          ".",
          ".",
          "A",
          "D",
          "E"
        ],
        [
          ".",
          ".",
          "D",
          "E",
          "."
        ],
        [
          "?",
          "C",
          "B",
          "A",
          "D"
        ],
        [
          ".",
          "D",
          ".",
          ".",
          "."
        ],
        [
          ".",
          "E",
          ".",
          ".",
          "A"
        ]
      ],
      "targetCoordinate": {
        "row": 3,
        "column": 1
      },
      "correctTarget": "E",
      "reasoningClassification": "DIRECT_ROW_ELIMINATION",
      "targetDepth": 1,
      "requiredIntermediateCells": 0,
      "deductionPathSummary": [
        {
          "cell": "3:1",
          "symbol": "E",
          "reason": "single_candidate",
          "dependencies": []
        }
      ],
      "candidateEliminationProfile": {
        "targetInitialCandidates": 1,
        "totalEliminations": 4,
        "rowColumnAlternations": 0
      },
      "essentialClueCount": 4,
      "redundantClueCount": 8,
      "difficultyScore": 11,
      "structuralFingerprint": "latin_square-rules:v1:1e92c9a655b7fd8a",
      "noveltyScore": 0.1304
    },
    {
      "seed": "latin-taxonomy-v2-27",
      "puzzleGrid": [
        [
          ".",
          ".",
          ".",
          "C",
          "A"
        ],
        [
          ".",
          "A",
          "D",
          ".",
          "B"
        ],
        [
          "?",
          "B",
          "C",
          "A",
          "D"
        ],
        [
          ".",
          "D",
          ".",
          "B",
          "."
        ],
        [
          ".",
          ".",
          ".",
          ".",
          "."
        ]
      ],
      "targetCoordinate": {
        "row": 3,
        "column": 1
      },
      "correctTarget": "E",
      "reasoningClassification": "DIRECT_ROW_ELIMINATION",
      "targetDepth": 1,
      "requiredIntermediateCells": 0,
      "deductionPathSummary": [
        {
          "cell": "3:1",
          "symbol": "E",
          "reason": "single_candidate",
          "dependencies": []
        }
      ],
      "candidateEliminationProfile": {
        "targetInitialCandidates": 1,
        "totalEliminations": 4,
        "rowColumnAlternations": 0
      },
      "essentialClueCount": 4,
      "redundantClueCount": 7,
      "difficultyScore": 10.85,
      "structuralFingerprint": "latin_square-rules:v1:129a3298e692a20c",
      "noveltyScore": 0.1005
    }
  ],
  "medium": [
    {
      "seed": "latin-taxonomy-v2-1",
      "puzzleGrid": [
        [
          "A",
          "C",
          "D",
          ".",
          "."
        ],
        [
          "C",
          ".",
          "E",
          ".",
          "B"
        ],
        [
          ".",
          ".",
          ".",
          "?",
          "A"
        ],
        [
          "E",
          ".",
          ".",
          ".",
          "."
        ],
        [
          "B",
          ".",
          ".",
          "E",
          "D"
        ]
      ],
      "targetCoordinate": {
        "row": 3,
        "column": 4
      },
      "correctTarget": "C",
      "reasoningClassification": "CHAINED_INTERMEDIATE",
      "targetDepth": 2,
      "requiredIntermediateCells": 3,
      "deductionPathSummary": [
        {
          "cell": "1:4",
          "symbol": "B",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "3:1",
          "symbol": "D",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "3:2",
          "symbol": "E",
          "reason": "only_position_in_row",
          "dependencies": []
        },
        {
          "cell": "3:4",
          "symbol": "C",
          "reason": "single_candidate",
          "dependencies": [
            "1:4",
            "3:1",
            "3:2"
          ]
        }
      ],
      "candidateEliminationProfile": {
        "targetInitialCandidates": 3,
        "totalEliminations": 16,
        "rowColumnAlternations": 0
      },
      "essentialClueCount": 9,
      "redundantClueCount": 2,
      "difficultyScore": 38.6,
      "structuralFingerprint": "latin_square-rules:v1:880ef7412b7a7e85",
      "noveltyScore": 0.6926
    },
    {
      "seed": "latin-taxonomy-v2-4",
      "puzzleGrid": [
        [
          ".",
          ".",
          "B",
          "D",
          "."
        ],
        [
          "D",
          ".",
          ".",
          ".",
          "A"
        ],
        [
          "B",
          ".",
          ".",
          ".",
          "."
        ],
        [
          "A",
          "E",
          ".",
          "C",
          "."
        ],
        [
          "E",
          "B",
          ".",
          ".",
          "?"
        ]
      ],
      "targetCoordinate": {
        "row": 5,
        "column": 5
      },
      "correctTarget": "D",
      "reasoningClassification": "SINGLE_INTERMEDIATE",
      "targetDepth": 2,
      "requiredIntermediateCells": 1,
      "deductionPathSummary": [
        {
          "cell": "4:3",
          "symbol": "D",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "5:5",
          "symbol": "D",
          "reason": "only_position_in_row",
          "dependencies": [
            "4:3"
          ]
        }
      ],
      "candidateEliminationProfile": {
        "targetInitialCandidates": 2,
        "totalEliminations": 8,
        "rowColumnAlternations": 0
      },
      "essentialClueCount": 4,
      "redundantClueCount": 6,
      "difficultyScore": 26.1,
      "structuralFingerprint": "latin_square-rules:v1:10560dbb140be0af",
      "noveltyScore": 0.5861
    },
    {
      "seed": "latin-taxonomy-v2-7",
      "puzzleGrid": [
        [
          ".",
          "?",
          "C",
          "B",
          "."
        ],
        [
          "C",
          ".",
          ".",
          "E",
          "."
        ],
        [
          "D",
          ".",
          "B",
          ".",
          "C"
        ],
        [
          ".",
          "A",
          ".",
          ".",
          "."
        ],
        [
          "E",
          ".",
          ".",
          "D",
          "B"
        ]
      ],
      "targetCoordinate": {
        "row": 1,
        "column": 2
      },
      "correctTarget": "D",
      "reasoningClassification": "CHAINED_INTERMEDIATE",
      "targetDepth": 2,
      "requiredIntermediateCells": 4,
      "deductionPathSummary": [
        {
          "cell": "1:1",
          "symbol": "A",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "2:2",
          "symbol": "B",
          "reason": "only_position_in_row",
          "dependencies": []
        },
        {
          "cell": "3:2",
          "symbol": "E",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "5:2",
          "symbol": "C",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "1:2",
          "symbol": "D",
          "reason": "single_candidate",
          "dependencies": [
            "1:1",
            "2:2",
            "5:2",
            "3:2"
          ]
        }
      ],
      "candidateEliminationProfile": {
        "targetInitialCandidates": 2,
        "totalEliminations": 20,
        "rowColumnAlternations": 0
      },
      "essentialClueCount": 9,
      "redundantClueCount": 2,
      "difficultyScore": 43.5,
      "structuralFingerprint": "latin_square-rules:v1:32623e58a9cee41c",
      "noveltyScore": 0.2759
    },
    {
      "seed": "latin-taxonomy-v2-10",
      "puzzleGrid": [
        [
          "D",
          "A",
          ".",
          ".",
          "?"
        ],
        [
          ".",
          ".",
          ".",
          "A",
          "."
        ],
        [
          "B",
          "D",
          "A",
          "C",
          "."
        ],
        [
          ".",
          "E",
          ".",
          "D",
          "B"
        ],
        [
          "C",
          "B",
          "D",
          "E",
          "."
        ]
      ],
      "targetCoordinate": {
        "row": 1,
        "column": 5
      },
      "correctTarget": "C",
      "reasoningClassification": "CHAINED_INTERMEDIATE",
      "targetDepth": 2,
      "requiredIntermediateCells": 4,
      "deductionPathSummary": [
        {
          "cell": "1:4",
          "symbol": "B",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "2:5",
          "symbol": "D",
          "reason": "only_position_in_row",
          "dependencies": []
        },
        {
          "cell": "3:5",
          "symbol": "E",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "5:5",
          "symbol": "A",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "1:5",
          "symbol": "C",
          "reason": "single_candidate",
          "dependencies": [
            "5:5",
            "1:4",
            "2:5",
            "3:5"
          ]
        }
      ],
      "candidateEliminationProfile": {
        "targetInitialCandidates": 2,
        "totalEliminations": 20,
        "rowColumnAlternations": 0
      },
      "essentialClueCount": 10,
      "redundantClueCount": 4,
      "difficultyScore": 43.5,
      "structuralFingerprint": "latin_square-rules:v1:a4cd30da1a0b7516",
      "noveltyScore": 0.1729
    },
    {
      "seed": "latin-taxonomy-v2-13",
      "puzzleGrid": [
        [
          "B",
          ".",
          "C",
          "D",
          "A"
        ],
        [
          ".",
          "D",
          ".",
          ".",
          "."
        ],
        [
          "E",
          "?",
          ".",
          "B",
          "."
        ],
        [
          "C",
          ".",
          "D",
          "E",
          "."
        ],
        [
          ".",
          ".",
          "E",
          ".",
          "."
        ]
      ],
      "targetCoordinate": {
        "row": 3,
        "column": 2
      },
      "correctTarget": "C",
      "reasoningClassification": "CHAINED_INTERMEDIATE",
      "targetDepth": 2,
      "requiredIntermediateCells": 4,
      "deductionPathSummary": [
        {
          "cell": "1:2",
          "symbol": "E",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "3:3",
          "symbol": "A",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "3:5",
          "symbol": "D",
          "reason": "only_position_in_row",
          "dependencies": []
        },
        {
          "cell": "4:2",
          "symbol": "A",
          "reason": "only_position_in_row",
          "dependencies": []
        },
        {
          "cell": "3:2",
          "symbol": "C",
          "reason": "single_candidate",
          "dependencies": [
            "3:3",
            "4:2",
            "3:5",
            "1:2"
          ]
        }
      ],
      "candidateEliminationProfile": {
        "targetInitialCandidates": 2,
        "totalEliminations": 20,
        "rowColumnAlternations": 0
      },
      "essentialClueCount": 7,
      "redundantClueCount": 4,
      "difficultyScore": 43.5,
      "structuralFingerprint": "latin_square-rules:v1:284a391a8e9edb46",
      "noveltyScore": 0.2792
    },
    {
      "seed": "latin-taxonomy-v2-16",
      "puzzleGrid": [
        [
          "C",
          ".",
          ".",
          ".",
          "."
        ],
        [
          ".",
          "B",
          ".",
          "D",
          "A"
        ],
        [
          "D",
          ".",
          "E",
          ".",
          "."
        ],
        [
          ".",
          "E",
          ".",
          "B",
          "C"
        ],
        [
          "B",
          ".",
          "?",
          ".",
          "."
        ]
      ],
      "targetCoordinate": {
        "row": 5,
        "column": 3
      },
      "correctTarget": "A",
      "reasoningClassification": "CHAINED_INTERMEDIATE",
      "targetDepth": 2,
      "requiredIntermediateCells": 3,
      "deductionPathSummary": [
        {
          "cell": "1:3",
          "symbol": "B",
          "reason": "only_position_in_column",
          "dependencies": []
        },
        {
          "cell": "2:3",
          "symbol": "C",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "4:3",
          "symbol": "D",
          "reason": "only_position_in_row",
          "dependencies": []
        },
        {
          "cell": "5:3",
          "symbol": "A",
          "reason": "single_candidate",
          "dependencies": [
            "1:3",
            "2:3",
            "4:3"
          ]
        }
      ],
      "candidateEliminationProfile": {
        "targetInitialCandidates": 3,
        "totalEliminations": 16,
        "rowColumnAlternations": 0
      },
      "essentialClueCount": 6,
      "redundantClueCount": 4,
      "difficultyScore": 38.6,
      "structuralFingerprint": "latin_square-rules:v1:b27f7235b7c091f1",
      "noveltyScore": 0.3105
    },
    {
      "seed": "latin-taxonomy-v2-19",
      "puzzleGrid": [
        [
          ".",
          ".",
          "D",
          "E",
          "."
        ],
        [
          "D",
          "E",
          "C",
          ".",
          "."
        ],
        [
          ".",
          ".",
          ".",
          ".",
          "E"
        ],
        [
          "E",
          "C",
          "B",
          "A",
          "."
        ],
        [
          "A",
          "D",
          ".",
          ".",
          "?"
        ]
      ],
      "targetCoordinate": {
        "row": 5,
        "column": 5
      },
      "correctTarget": "B",
      "reasoningClassification": "SINGLE_INTERMEDIATE",
      "targetDepth": 2,
      "requiredIntermediateCells": 1,
      "deductionPathSummary": [
        {
          "cell": "2:4",
          "symbol": "B",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "5:5",
          "symbol": "B",
          "reason": "only_position_in_row",
          "dependencies": [
            "2:4"
          ]
        }
      ],
      "candidateEliminationProfile": {
        "targetInitialCandidates": 2,
        "totalEliminations": 8,
        "rowColumnAlternations": 0
      },
      "essentialClueCount": 3,
      "redundantClueCount": 9,
      "difficultyScore": 26.7,
      "structuralFingerprint": "latin_square-rules:v1:e41288ded6134d02",
      "noveltyScore": 0.5632
    },
    {
      "seed": "latin-taxonomy-v2-22",
      "puzzleGrid": [
        [
          ".",
          "B",
          ".",
          ".",
          "."
        ],
        [
          "E",
          ".",
          ".",
          ".",
          "B"
        ],
        [
          ".",
          "C",
          ".",
          "B",
          "."
        ],
        [
          "B",
          ".",
          "A",
          "D",
          "."
        ],
        [
          "D",
          ".",
          ".",
          "C",
          "?"
        ]
      ],
      "targetCoordinate": {
        "row": 5,
        "column": 5
      },
      "correctTarget": "E",
      "reasoningClassification": "SINGLE_INTERMEDIATE",
      "targetDepth": 2,
      "requiredIntermediateCells": 1,
      "deductionPathSummary": [
        {
          "cell": "4:2",
          "symbol": "E",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "5:5",
          "symbol": "E",
          "reason": "only_position_in_row",
          "dependencies": [
            "4:2"
          ]
        }
      ],
      "candidateEliminationProfile": {
        "targetInitialCandidates": 2,
        "totalEliminations": 8,
        "rowColumnAlternations": 0
      },
      "essentialClueCount": 4,
      "redundantClueCount": 6,
      "difficultyScore": 26.1,
      "structuralFingerprint": "latin_square-rules:v1:7e8e180b96573cff",
      "noveltyScore": 0.303
    },
    {
      "seed": "latin-taxonomy-v2-25",
      "puzzleGrid": [
        [
          "D",
          "A",
          "E",
          ".",
          "C"
        ],
        [
          ".",
          "D",
          "B",
          ".",
          "E"
        ],
        [
          "A",
          ".",
          ".",
          "E",
          "D"
        ],
        [
          "B",
          ".",
          ".",
          ".",
          "."
        ],
        [
          ".",
          "C",
          ".",
          "?",
          "."
        ]
      ],
      "targetCoordinate": {
        "row": 5,
        "column": 4
      },
      "correctTarget": "D",
      "reasoningClassification": "CHAINED_INTERMEDIATE",
      "targetDepth": 2,
      "requiredIntermediateCells": 4,
      "deductionPathSummary": [
        {
          "cell": "1:4",
          "symbol": "B",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "2:4",
          "symbol": "A",
          "reason": "only_position_in_row",
          "dependencies": []
        },
        {
          "cell": "5:1",
          "symbol": "E",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "5:5",
          "symbol": "B",
          "reason": "only_position_in_column",
          "dependencies": []
        },
        {
          "cell": "5:4",
          "symbol": "D",
          "reason": "single_candidate",
          "dependencies": [
            "2:4",
            "5:5",
            "1:4",
            "5:1"
          ]
        }
      ],
      "candidateEliminationProfile": {
        "targetInitialCandidates": 3,
        "totalEliminations": 20,
        "rowColumnAlternations": 0
      },
      "essentialClueCount": 7,
      "redundantClueCount": 5,
      "difficultyScore": 44.5,
      "structuralFingerprint": "latin_square-rules:v1:12298e487a709944",
      "noveltyScore": 0.3107
    },
    {
      "seed": "latin-taxonomy-v2-28",
      "puzzleGrid": [
        [
          ".",
          ".",
          "E",
          ".",
          "D"
        ],
        [
          "B",
          ".",
          "A",
          ".",
          "E"
        ],
        [
          ".",
          "D",
          "B",
          "A",
          "."
        ],
        [
          "?",
          ".",
          ".",
          "C",
          "."
        ],
        [
          ".",
          ".",
          "C",
          ".",
          "A"
        ]
      ],
      "targetCoordinate": {
        "row": 4,
        "column": 1
      },
      "correctTarget": "A",
      "reasoningClassification": "CHAINED_INTERMEDIATE",
      "targetDepth": 2,
      "requiredIntermediateCells": 3,
      "deductionPathSummary": [
        {
          "cell": "3:1",
          "symbol": "E",
          "reason": "only_position_in_row",
          "dependencies": []
        },
        {
          "cell": "4:3",
          "symbol": "D",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "4:5",
          "symbol": "B",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "4:1",
          "symbol": "A",
          "reason": "single_candidate",
          "dependencies": [
            "4:5",
            "4:3",
            "3:1"
          ]
        }
      ],
      "candidateEliminationProfile": {
        "targetInitialCandidates": 3,
        "totalEliminations": 16,
        "rowColumnAlternations": 0
      },
      "essentialClueCount": 7,
      "redundantClueCount": 4,
      "difficultyScore": 38.6,
      "structuralFingerprint": "latin_square-rules:v1:aa8b2ec7b602158b",
      "noveltyScore": 0.2716
    }
  ],
  "hard": [
    {
      "seed": "latin-taxonomy-v2-2",
      "puzzleGrid": [
        [
          "C",
          "D",
          "E",
          ".",
          "B"
        ],
        [
          ".",
          ".",
          "A",
          "B",
          "C"
        ],
        [
          ".",
          ".",
          ".",
          "C",
          "D"
        ],
        [
          "A",
          "?",
          ".",
          ".",
          "."
        ],
        [
          "B",
          ".",
          "D",
          "E",
          "A"
        ]
      ],
      "targetCoordinate": {
        "row": 4,
        "column": 2
      },
      "correctTarget": "B",
      "reasoningClassification": "CHAINED_INTERMEDIATE",
      "targetDepth": 2,
      "requiredIntermediateCells": 6,
      "deductionPathSummary": [
        {
          "cell": "2:2",
          "symbol": "E",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "3:2",
          "symbol": "A",
          "reason": "only_position_in_row",
          "dependencies": []
        },
        {
          "cell": "4:3",
          "symbol": "C",
          "reason": "only_position_in_column",
          "dependencies": []
        },
        {
          "cell": "4:4",
          "symbol": "D",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "4:5",
          "symbol": "E",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "5:2",
          "symbol": "C",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "4:2",
          "symbol": "B",
          "reason": "single_candidate",
          "dependencies": [
            "3:2",
            "4:3",
            "5:2",
            "4:4",
            "4:5",
            "2:2"
          ]
        }
      ],
      "candidateEliminationProfile": {
        "targetInitialCandidates": 3,
        "totalEliminations": 28,
        "rowColumnAlternations": 0
      },
      "essentialClueCount": 12,
      "redundantClueCount": 2,
      "difficultyScore": 56.3,
      "structuralFingerprint": "latin_square-rules:v1:9531a6b9c52791f5",
      "noveltyScore": 0.3358
    },
    {
      "seed": "latin-taxonomy-v2-5",
      "puzzleGrid": [
        [
          ".",
          ".",
          "C",
          "B",
          "A"
        ],
        [
          "B",
          ".",
          ".",
          ".",
          "D"
        ],
        [
          "E",
          "B",
          "D",
          ".",
          "C"
        ],
        [
          ".",
          "D",
          ".",
          "?",
          "."
        ],
        [
          "A",
          "C",
          "B",
          ".",
          "E"
        ]
      ],
      "targetCoordinate": {
        "row": 4,
        "column": 4
      },
      "correctTarget": "E",
      "reasoningClassification": "CHAINED_INTERMEDIATE",
      "targetDepth": 2,
      "requiredIntermediateCells": 5,
      "deductionPathSummary": [
        {
          "cell": "2:4",
          "symbol": "C",
          "reason": "only_position_in_row",
          "dependencies": []
        },
        {
          "cell": "3:4",
          "symbol": "A",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "4:1",
          "symbol": "C",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "4:5",
          "symbol": "B",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "5:4",
          "symbol": "D",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "4:4",
          "symbol": "E",
          "reason": "single_candidate",
          "dependencies": [
            "3:4",
            "4:5",
            "4:1",
            "2:4",
            "5:4"
          ]
        }
      ],
      "candidateEliminationProfile": {
        "targetInitialCandidates": 3,
        "totalEliminations": 24,
        "rowColumnAlternations": 0
      },
      "essentialClueCount": 12,
      "redundantClueCount": 2,
      "difficultyScore": 50.4,
      "structuralFingerprint": "latin_square-rules:v1:fdcb3c94b97b5458",
      "noveltyScore": 0.184
    },
    {
      "seed": "latin-taxonomy-v2-8",
      "puzzleGrid": [
        [
          ".",
          ".",
          "B",
          "A",
          "C"
        ],
        [
          "C",
          ".",
          ".",
          "E",
          "."
        ],
        [
          ".",
          "E",
          "A",
          ".",
          "D"
        ],
        [
          "A",
          "?",
          ".",
          ".",
          "."
        ],
        [
          "D",
          ".",
          ".",
          "B",
          "A"
        ]
      ],
      "targetCoordinate": {
        "row": 4,
        "column": 2
      },
      "correctTarget": "B",
      "reasoningClassification": "CHAINED_INTERMEDIATE",
      "targetDepth": 2,
      "requiredIntermediateCells": 5,
      "deductionPathSummary": [
        {
          "cell": "1:2",
          "symbol": "D",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "2:2",
          "symbol": "A",
          "reason": "only_position_in_row",
          "dependencies": []
        },
        {
          "cell": "4:4",
          "symbol": "D",
          "reason": "only_position_in_column",
          "dependencies": []
        },
        {
          "cell": "4:5",
          "symbol": "E",
          "reason": "only_position_in_column",
          "dependencies": []
        },
        {
          "cell": "5:2",
          "symbol": "C",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "4:2",
          "symbol": "B",
          "reason": "single_candidate",
          "dependencies": [
            "2:2",
            "5:2",
            "4:4",
            "1:2",
            "4:5"
          ]
        }
      ],
      "candidateEliminationProfile": {
        "targetInitialCandidates": 3,
        "totalEliminations": 24,
        "rowColumnAlternations": 0
      },
      "essentialClueCount": 11,
      "redundantClueCount": 1,
      "difficultyScore": 50.4,
      "structuralFingerprint": "latin_square-rules:v1:547b7d06324c4492",
      "noveltyScore": 0.1934
    },
    {
      "seed": "latin-taxonomy-v2-11",
      "puzzleGrid": [
        [
          ".",
          "D",
          "C",
          "E",
          "A"
        ],
        [
          "C",
          ".",
          "A",
          "B",
          "D"
        ],
        [
          ".",
          ".",
          "D",
          "C",
          "E"
        ],
        [
          "D",
          ".",
          ".",
          "A",
          "B"
        ],
        [
          ".",
          "?",
          "B",
          ".",
          "."
        ]
      ],
      "targetCoordinate": {
        "row": 5,
        "column": 2
      },
      "correctTarget": "A",
      "reasoningClassification": "CHAINED_INTERMEDIATE",
      "targetDepth": 2,
      "requiredIntermediateCells": 6,
      "deductionPathSummary": [
        {
          "cell": "2:2",
          "symbol": "E",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "3:2",
          "symbol": "B",
          "reason": "only_position_in_column",
          "dependencies": []
        },
        {
          "cell": "4:2",
          "symbol": "C",
          "reason": "only_position_in_row",
          "dependencies": []
        },
        {
          "cell": "5:1",
          "symbol": "E",
          "reason": "only_position_in_column",
          "dependencies": []
        },
        {
          "cell": "5:4",
          "symbol": "D",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "5:5",
          "symbol": "C",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "5:2",
          "symbol": "A",
          "reason": "single_candidate",
          "dependencies": [
            "3:2",
            "5:5",
            "4:2",
            "5:4",
            "5:1",
            "2:2"
          ]
        }
      ],
      "candidateEliminationProfile": {
        "targetInitialCandidates": 3,
        "totalEliminations": 28,
        "rowColumnAlternations": 0
      },
      "essentialClueCount": 13,
      "redundantClueCount": 2,
      "difficultyScore": 56.3,
      "structuralFingerprint": "latin_square-rules:v1:5bb42bc18254ed15",
      "noveltyScore": 0.2777
    },
    {
      "seed": "latin-taxonomy-v2-14",
      "puzzleGrid": [
        [
          ".",
          ".",
          ".",
          "D",
          "."
        ],
        [
          "B",
          ".",
          "C",
          "A",
          "D"
        ],
        [
          ".",
          "?",
          "B",
          ".",
          "."
        ],
        [
          "A",
          ".",
          ".",
          "E",
          "B"
        ],
        [
          ".",
          "A",
          ".",
          ".",
          "."
        ]
      ],
      "targetCoordinate": {
        "row": 3,
        "column": 2
      },
      "correctTarget": "D",
      "reasoningClassification": "CHAINED_INTERMEDIATE",
      "targetDepth": 2,
      "requiredIntermediateCells": 5,
      "deductionPathSummary": [
        {
          "cell": "1:2",
          "symbol": "B",
          "reason": "only_position_in_row",
          "dependencies": []
        },
        {
          "cell": "2:2",
          "symbol": "E",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "3:4",
          "symbol": "C",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "3:5",
          "symbol": "A",
          "reason": "only_position_in_row",
          "dependencies": []
        },
        {
          "cell": "4:2",
          "symbol": "C",
          "reason": "only_position_in_row",
          "dependencies": []
        },
        {
          "cell": "3:2",
          "symbol": "D",
          "reason": "single_candidate",
          "dependencies": [
            "3:5",
            "1:2",
            "3:4",
            "4:2",
            "2:2"
          ]
        }
      ],
      "candidateEliminationProfile": {
        "targetInitialCandidates": 3,
        "totalEliminations": 24,
        "rowColumnAlternations": 0
      },
      "essentialClueCount": 10,
      "redundantClueCount": 0,
      "difficultyScore": 50.4,
      "structuralFingerprint": "latin_square-rules:v1:50f2eae88dba8d34",
      "noveltyScore": 0.3374
    },
    {
      "seed": "latin-taxonomy-v2-17",
      "puzzleGrid": [
        [
          "E",
          "B",
          "C",
          "A",
          "."
        ],
        [
          "D",
          "E",
          "B",
          "C",
          "."
        ],
        [
          "C",
          "A",
          ".",
          ".",
          "."
        ],
        [
          "A",
          "D",
          "E",
          "B",
          "."
        ],
        [
          ".",
          ".",
          "A",
          ".",
          "?"
        ]
      ],
      "targetCoordinate": {
        "row": 5,
        "column": 5
      },
      "correctTarget": "E",
      "reasoningClassification": "CHAINED_INTERMEDIATE",
      "targetDepth": 2,
      "requiredIntermediateCells": 6,
      "deductionPathSummary": [
        {
          "cell": "1:5",
          "symbol": "D",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "2:5",
          "symbol": "A",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "3:5",
          "symbol": "B",
          "reason": "only_position_in_row",
          "dependencies": []
        },
        {
          "cell": "4:5",
          "symbol": "C",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "5:1",
          "symbol": "B",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "5:2",
          "symbol": "C",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "5:5",
          "symbol": "E",
          "reason": "single_candidate",
          "dependencies": [
            "2:5",
            "5:1",
            "3:5",
            "5:2",
            "4:5",
            "1:5"
          ]
        }
      ],
      "candidateEliminationProfile": {
        "targetInitialCandidates": 4,
        "totalEliminations": 28,
        "rowColumnAlternations": 0
      },
      "essentialClueCount": 15,
      "redundantClueCount": 0,
      "difficultyScore": 57.3,
      "structuralFingerprint": "latin_square-rules:v1:c7902f472fca3bdb",
      "noveltyScore": 0.3151
    },
    {
      "seed": "latin-taxonomy-v2-20",
      "puzzleGrid": [
        [
          ".",
          ".",
          "?",
          "D",
          "."
        ],
        [
          ".",
          "A",
          ".",
          "C",
          "B"
        ],
        [
          "B",
          "C",
          ".",
          "E",
          "D"
        ],
        [
          ".",
          "D",
          ".",
          ".",
          "E"
        ],
        [
          "D",
          "E",
          ".",
          ".",
          "A"
        ]
      ],
      "targetCoordinate": {
        "row": 1,
        "column": 3
      },
      "correctTarget": "E",
      "reasoningClassification": "CHAINED_INTERMEDIATE",
      "targetDepth": 2,
      "requiredIntermediateCells": 5,
      "deductionPathSummary": [
        {
          "cell": "1:2",
          "symbol": "B",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "1:5",
          "symbol": "C",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "2:3",
          "symbol": "D",
          "reason": "only_position_in_row",
          "dependencies": []
        },
        {
          "cell": "3:3",
          "symbol": "A",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "5:3",
          "symbol": "C",
          "reason": "only_position_in_row",
          "dependencies": []
        },
        {
          "cell": "1:3",
          "symbol": "E",
          "reason": "single_candidate",
          "dependencies": [
            "3:3",
            "1:2",
            "1:5",
            "5:3",
            "2:3"
          ]
        }
      ],
      "candidateEliminationProfile": {
        "targetInitialCandidates": 4,
        "totalEliminations": 24,
        "rowColumnAlternations": 0
      },
      "essentialClueCount": 12,
      "redundantClueCount": 1,
      "difficultyScore": 51.4,
      "structuralFingerprint": "latin_square-rules:v1:9217f1c9d50462f5",
      "noveltyScore": 0.2502
    },
    {
      "seed": "latin-taxonomy-v2-23",
      "puzzleGrid": [
        [
          "C",
          "D",
          "A",
          ".",
          "."
        ],
        [
          ".",
          ".",
          ".",
          "A",
          "."
        ],
        [
          "A",
          "E",
          ".",
          "D",
          "C"
        ],
        [
          ".",
          ".",
          "?",
          ".",
          "B"
        ],
        [
          "B",
          "C",
          ".",
          "E",
          "."
        ]
      ],
      "targetCoordinate": {
        "row": 4,
        "column": 3
      },
      "correctTarget": "E",
      "reasoningClassification": "CHAINED_INTERMEDIATE",
      "targetDepth": 2,
      "requiredIntermediateCells": 5,
      "deductionPathSummary": [
        {
          "cell": "2:3",
          "symbol": "C",
          "reason": "only_position_in_row",
          "dependencies": []
        },
        {
          "cell": "3:3",
          "symbol": "B",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "4:2",
          "symbol": "A",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "4:4",
          "symbol": "C",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "5:3",
          "symbol": "D",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "4:3",
          "symbol": "E",
          "reason": "single_candidate",
          "dependencies": [
            "4:2",
            "3:3",
            "4:4",
            "2:3",
            "5:3"
          ]
        }
      ],
      "candidateEliminationProfile": {
        "targetInitialCandidates": 3,
        "totalEliminations": 24,
        "rowColumnAlternations": 0
      },
      "essentialClueCount": 11,
      "redundantClueCount": 1,
      "difficultyScore": 50.4,
      "structuralFingerprint": "latin_square-rules:v1:8789c208bb1aebb4",
      "noveltyScore": 0.2574
    },
    {
      "seed": "latin-taxonomy-v2-26",
      "puzzleGrid": [
        [
          ".",
          "?",
          "E",
          ".",
          "."
        ],
        [
          "E",
          ".",
          ".",
          "A",
          "C"
        ],
        [
          "C",
          "D",
          ".",
          ".",
          "B"
        ],
        [
          "D",
          ".",
          "C",
          "B",
          "."
        ],
        [
          "A",
          ".",
          ".",
          "D",
          "E"
        ]
      ],
      "targetCoordinate": {
        "row": 1,
        "column": 2
      },
      "correctTarget": "A",
      "reasoningClassification": "CHAINED_INTERMEDIATE",
      "targetDepth": 2,
      "requiredIntermediateCells": 6,
      "deductionPathSummary": [
        {
          "cell": "1:1",
          "symbol": "B",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "1:4",
          "symbol": "C",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "1:5",
          "symbol": "D",
          "reason": "only_position_in_row",
          "dependencies": []
        },
        {
          "cell": "2:2",
          "symbol": "B",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "4:2",
          "symbol": "E",
          "reason": "only_position_in_row",
          "dependencies": []
        },
        {
          "cell": "5:2",
          "symbol": "C",
          "reason": "only_position_in_row",
          "dependencies": []
        },
        {
          "cell": "1:2",
          "symbol": "A",
          "reason": "single_candidate",
          "dependencies": [
            "1:1",
            "2:2",
            "1:4",
            "5:2",
            "1:5",
            "4:2"
          ]
        }
      ],
      "candidateEliminationProfile": {
        "targetInitialCandidates": 3,
        "totalEliminations": 28,
        "rowColumnAlternations": 0
      },
      "essentialClueCount": 12,
      "redundantClueCount": 1,
      "difficultyScore": 56.3,
      "structuralFingerprint": "latin_square-rules:v1:3bb7229a81950756",
      "noveltyScore": 0.2308
    },
    {
      "seed": "latin-taxonomy-v2-29",
      "puzzleGrid": [
        [
          "D",
          ".",
          ".",
          "A",
          "E"
        ],
        [
          ".",
          "?",
          ".",
          ".",
          "D"
        ],
        [
          "E",
          ".",
          ".",
          "C",
          "A"
        ],
        [
          "C",
          ".",
          ".",
          ".",
          "."
        ],
        [
          ".",
          ".",
          "D",
          "B",
          "C"
        ]
      ],
      "targetCoordinate": {
        "row": 2,
        "column": 2
      },
      "correctTarget": "C",
      "reasoningClassification": "MULTI_STAGE_DEDUCTION",
      "targetDepth": 3,
      "requiredIntermediateCells": 9,
      "deductionPathSummary": [
        {
          "cell": "2:1",
          "symbol": "B",
          "reason": "only_position_in_column",
          "dependencies": []
        },
        {
          "cell": "2:4",
          "symbol": "E",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "3:2",
          "symbol": "D",
          "reason": "only_position_in_row",
          "dependencies": []
        },
        {
          "cell": "3:3",
          "symbol": "B",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "4:4",
          "symbol": "D",
          "reason": "only_position_in_column",
          "dependencies": []
        },
        {
          "cell": "4:5",
          "symbol": "B",
          "reason": "single_candidate",
          "dependencies": []
        },
        {
          "cell": "5:2",
          "symbol": "E",
          "reason": "only_position_in_row",
          "dependencies": []
        },
        {
          "cell": "1:2",
          "symbol": "B",
          "reason": "only_position_in_row",
          "dependencies": [
            "3:3"
          ]
        },
        {
          "cell": "4:2",
          "symbol": "A",
          "reason": "single_candidate",
          "dependencies": [
            "4:5",
            "4:4",
            "3:2",
            "5:2"
          ]
        },
        {
          "cell": "2:2",
          "symbol": "C",
          "reason": "single_candidate",
          "dependencies": [
            "4:2",
            "2:1",
            "1:2",
            "3:2",
            "2:4",
            "5:2"
          ]
        }
      ],
      "candidateEliminationProfile": {
        "targetInitialCandidates": 4,
        "totalEliminations": 40,
        "rowColumnAlternations": 2
      },
      "essentialClueCount": 10,
      "redundantClueCount": 1,
      "difficultyScore": 89.333,
      "structuralFingerprint": "latin_square-rules:v1:a2b2f75911b7280d",
      "noveltyScore": 0.5546
    }
  ]
}
```