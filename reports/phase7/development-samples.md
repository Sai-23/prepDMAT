# Phase 7 explanation development samples

Five deterministic samples per difficulty for each Core module (45 total).

## figure_sequence · easy · phase7-figure_sequence-easy-0

- Classification: single_object_transformation
- Correct answer: `["slot-1-correct","slot-2-correct"]`
- Sample student answer: `["slot-1-distractor-1","slot-2-distractor-2"]`
- Feedback: Recheck position — In missing matrix 1, your option differs from the simulated result in position.
- Quick explanation: Track the object, then apply every verified rule to both missing frames.
- Takeaway: Confirm a rule across the whole sequence before using it to predict the missing frames.

### Steps

1. **Track the pink square:** Pink Square: move 1 step clockwise around the border. Check the same change across every simulated transition.
2. **Predict missing matrix 1:** Apply every discovered rule once to the last visible frame. The simulated result matches Option B.
3. **Predict missing matrix 2:** Apply the same rules one more time. The simulated result matches Option B.

<details><summary>Internal metadata used</summary>

```json
{
  "rules": [
    {
      "symbolId": "alpha",
      "movement": {
        "kind": "border",
        "direction": "clockwise",
        "steps": 1,
        "progression": "fixed"
      }
    }
  ],
  "generatorVersion": "figure-sequences@4.0.0"
}
```

</details>

## figure_sequence · medium · phase7-figure_sequence-medium-1

- Classification: independent_object_streams
- Correct answer: `["slot-1-correct","slot-2-correct"]`
- Sample student answer: `["slot-1-distractor-2","slot-2-distractor-2"]`
- Feedback: Recheck colour — In missing matrix 1, your option differs from the simulated result in colour.
- Quick explanation: Track each object separately, then apply every verified rule to both missing frames.
- Takeaway: Keep one rule stream per object; combine the streams only after each one is clear.

### Steps

1. **Track the green triangle:** Green Triangle: follow right → up → left → down; reverse any move that reaches an edge; rotate 90° clockwise; cycle colour Green → Black. Check the same change across every simulated transition.
2. **Track the orange circle:** Orange Circle: move 1 cell left; reverse direction when the edge is reached; increase the move by one each frame. Check the same change across every simulated transition.
3. **Predict missing matrix 1:** Apply every discovered rule once to the last visible frame. The simulated result matches Option A.
4. **Predict missing matrix 2:** Apply the same rules one more time. The simulated result matches Option A.

<details><summary>Internal metadata used</summary>

```json
{
  "rules": [
    {
      "symbolId": "alpha",
      "movement": {
        "kind": "direction_cycle",
        "directions": [
          "right",
          "up",
          "left",
          "down"
        ],
        "steps": 1,
        "progression": "fixed",
        "boundary": "bounce"
      },
      "rotation": {
        "direction": "clockwise",
        "quarterTurns": 1,
        "progression": "fixed"
      },
      "colour": {
        "cycle": [
          "green",
          "black"
        ],
        "steps": 1,
        "progression": "fixed"
      }
    },
    {
      "symbolId": "beta",
      "movement": {
        "kind": "linear",
        "direction": "left",
        "steps": 1,
        "progression": "incrementing",
        "boundary": "bounce"
      }
    }
  ],
  "generatorVersion": "figure-sequences@4.0.0"
}
```

</details>

## figure_sequence · hard · phase7-figure_sequence-hard-2

- Classification: independent_object_streams
- Correct answer: `["slot-1-correct","slot-2-correct"]`
- Sample student answer: `["slot-1-distractor-2","slot-2-distractor-2"]`
- Feedback: Recheck position and orientation and colour — In missing matrix 1, your option differs from the simulated result in position and orientation and colour.
- Quick explanation: Track each object separately, then apply every verified rule to both missing frames.
- Takeaway: Keep one rule stream per object; combine the streams only after each one is clear.

### Steps

1. **Track the yellow triangle:** Yellow Triangle: move 1 cell left; reverse direction when the edge is reached; rotate 90° clockwise. Check the same change across every simulated transition.
2. **Track the blue square:** Blue Square: move 1 step clockwise around the border; rotate 90° clockwise; cycle colour Black → Green → Blue → Yellow. Check the same change across every simulated transition.
3. **Track the pink arrow:** Pink Arrow: move 2 cells up; reverse direction when the edge is reached; rotate 90° counter-clockwise; increase the rotation each frame. Check the same change across every simulated transition.
4. **Track the black circle:** Black Circle: move 2 cells down; reverse direction when the edge is reached. Check the same change across every simulated transition.
5. **Predict missing matrix 1:** Apply every discovered rule once to the last visible frame. The simulated result matches Option B.
6. **Predict missing matrix 2:** Apply the same rules one more time. The simulated result matches Option C.

<details><summary>Internal metadata used</summary>

```json
{
  "rules": [
    {
      "symbolId": "alpha",
      "movement": {
        "kind": "linear",
        "direction": "left",
        "steps": 1,
        "progression": "fixed",
        "boundary": "bounce"
      },
      "rotation": {
        "direction": "clockwise",
        "quarterTurns": 1,
        "progression": "fixed"
      }
    },
    {
      "symbolId": "beta",
      "movement": {
        "kind": "border",
        "direction": "clockwise",
        "steps": 1,
        "progression": "fixed"
      },
      "rotation": {
        "direction": "clockwise",
        "quarterTurns": 1,
        "progression": "fixed"
      },
      "colour": {
        "cycle": [
          "black",
          "green",
          "blue",
          "yellow"
        ],
        "steps": 1,
        "progression": "fixed"
      }
    },
    {
      "symbolId": "gamma",
      "movement": {
        "kind": "linear",
        "direction": "up",
        "steps": 2,
        "progression": "fixed",
        "boundary": "bounce"
      },
      "rotation": {
        "direction": "counter_clockwise",
        "quarterTurns": 1,
        "progression": "incrementing"
      }
    },
    {
      "symbolId": "delta",
      "movement": {
        "kind": "linear",
        "direction": "down",
        "steps": 2,
        "progression": "fixed",
        "boundary": "bounce"
      }
    }
  ],
  "generatorVersion": "figure-sequences@4.0.0"
}
```

</details>

## figure_sequence · easy · phase7-figure_sequence-easy-3

- Classification: single_object_transformation
- Correct answer: `["slot-1-correct","slot-2-correct"]`
- Sample student answer: `["slot-1-distractor-2","slot-2-distractor-1"]`
- Feedback: Recheck position — In missing matrix 1, your option differs from the simulated result in position.
- Quick explanation: Track the object, then apply every verified rule to both missing frames.
- Takeaway: Confirm a rule across the whole sequence before using it to predict the missing frames.

### Steps

1. **Track the green square:** Green Square: move 1 cell down; reverse direction when the edge is reached. Check the same change across every simulated transition.
2. **Predict missing matrix 1:** Apply every discovered rule once to the last visible frame. The simulated result matches Option B.
3. **Predict missing matrix 2:** Apply the same rules one more time. The simulated result matches Option B.

<details><summary>Internal metadata used</summary>

```json
{
  "rules": [
    {
      "symbolId": "alpha",
      "movement": {
        "kind": "linear",
        "direction": "down",
        "steps": 1,
        "progression": "fixed",
        "boundary": "bounce"
      }
    }
  ],
  "generatorVersion": "figure-sequences@4.0.0"
}
```

</details>

## figure_sequence · medium · phase7-figure_sequence-medium-4

- Classification: single_object_transformation
- Correct answer: `["slot-1-correct","slot-2-correct"]`
- Sample student answer: `["slot-1-distractor-2","slot-2-distractor-1"]`
- Feedback: Recheck orientation — In missing matrix 1, your option differs from the simulated result in orientation.
- Quick explanation: Track the object, then apply every verified rule to both missing frames.
- Takeaway: Confirm a rule across the whole sequence before using it to predict the missing frames.

### Steps

1. **Track the orange arrow:** Orange Arrow: move 1 cell up; reverse direction when the edge is reached; rotate 90° counter-clockwise; cycle colour Orange → Pink → Green. Check the same change across every simulated transition.
2. **Predict missing matrix 1:** Apply every discovered rule once to the last visible frame. The simulated result matches Option B.
3. **Predict missing matrix 2:** Apply the same rules one more time. The simulated result matches Option C.

<details><summary>Internal metadata used</summary>

```json
{
  "rules": [
    {
      "symbolId": "alpha",
      "movement": {
        "kind": "linear",
        "direction": "up",
        "steps": 1,
        "progression": "fixed",
        "boundary": "bounce"
      },
      "rotation": {
        "direction": "counter_clockwise",
        "quarterTurns": 1,
        "progression": "fixed"
      },
      "colour": {
        "cycle": [
          "orange",
          "pink",
          "green"
        ],
        "steps": 1,
        "progression": "fixed"
      }
    }
  ],
  "generatorVersion": "figure-sequences@4.0.0"
}
```

</details>

## figure_sequence · hard · phase7-figure_sequence-hard-5

- Classification: independent_object_streams
- Correct answer: `["slot-1-correct","slot-2-correct"]`
- Sample student answer: `["slot-1-distractor-2","slot-2-distractor-2"]`
- Feedback: Recheck orientation — In missing matrix 1, your option differs from the simulated result in orientation.
- Quick explanation: Track each object separately, then apply every verified rule to both missing frames.
- Takeaway: Keep one rule stream per object; combine the streams only after each one is clear.

### Steps

1. **Track the pink triangle:** Pink Triangle: move 1 step counter-clockwise around the border. Check the same change across every simulated transition.
2. **Track the green diamond:** Green Diamond: follow right → down → left → up; reverse any move that reaches an edge; rotate 90° counter-clockwise. Check the same change across every simulated transition.
3. **Track the black square:** Black Square: move 2 cells up right; reverse direction when the edge is reached; rotate 90° counter-clockwise. Check the same change across every simulated transition.
4. **Track the orange circle:** Orange Circle: move 1 step clockwise around the border; increase the move by one each frame; cycle colour Green → Orange → Blue. Check the same change across every simulated transition.
5. **Predict missing matrix 1:** Apply every discovered rule once to the last visible frame. The simulated result matches Option B.
6. **Predict missing matrix 2:** Apply the same rules one more time. The simulated result matches Option A.

<details><summary>Internal metadata used</summary>

```json
{
  "rules": [
    {
      "symbolId": "alpha",
      "movement": {
        "kind": "border",
        "direction": "counter_clockwise",
        "steps": 1,
        "progression": "fixed"
      }
    },
    {
      "symbolId": "beta",
      "movement": {
        "kind": "direction_cycle",
        "directions": [
          "right",
          "down",
          "left",
          "up"
        ],
        "steps": 1,
        "progression": "fixed",
        "boundary": "bounce"
      },
      "rotation": {
        "direction": "counter_clockwise",
        "quarterTurns": 1,
        "progression": "fixed"
      }
    },
    {
      "symbolId": "gamma",
      "movement": {
        "kind": "linear",
        "direction": "up_right",
        "steps": 2,
        "progression": "fixed",
        "boundary": "bounce"
      },
      "rotation": {
        "direction": "counter_clockwise",
        "quarterTurns": 1,
        "progression": "fixed"
      }
    },
    {
      "symbolId": "delta",
      "movement": {
        "kind": "border",
        "direction": "clockwise",
        "steps": 1,
        "progression": "incrementing"
      },
      "colour": {
        "cycle": [
          "green",
          "orange",
          "blue"
        ],
        "steps": 1,
        "progression": "fixed"
      }
    }
  ],
  "generatorVersion": "figure-sequences@4.0.0"
}
```

</details>

## figure_sequence · easy · phase7-figure_sequence-easy-6

- Classification: single_object_transformation
- Correct answer: `["slot-1-correct","slot-2-correct"]`
- Sample student answer: `["slot-1-distractor-1","slot-2-distractor-1"]`
- Feedback: Recheck position — In missing matrix 1, your option differs from the simulated result in position.
- Quick explanation: Track the object, then apply every verified rule to both missing frames.
- Takeaway: Confirm a rule across the whole sequence before using it to predict the missing frames.

### Steps

1. **Track the blue square:** Blue Square: move 1 cell left; reverse direction when the edge is reached; cycle colour Blue → Pink. Check the same change across every simulated transition.
2. **Predict missing matrix 1:** Apply every discovered rule once to the last visible frame. The simulated result matches Option C.
3. **Predict missing matrix 2:** Apply the same rules one more time. The simulated result matches Option B.

<details><summary>Internal metadata used</summary>

```json
{
  "rules": [
    {
      "symbolId": "alpha",
      "movement": {
        "kind": "linear",
        "direction": "left",
        "steps": 1,
        "progression": "fixed",
        "boundary": "bounce"
      },
      "colour": {
        "cycle": [
          "blue",
          "pink"
        ],
        "steps": 1,
        "progression": "fixed"
      }
    }
  ],
  "generatorVersion": "figure-sequences@4.0.0"
}
```

</details>

## figure_sequence · medium · phase7-figure_sequence-medium-7

- Classification: independent_object_streams
- Correct answer: `["slot-1-correct","slot-2-correct"]`
- Sample student answer: `["slot-1-distractor-1","slot-2-distractor-2"]`
- Feedback: Recheck position — In missing matrix 1, your option differs from the simulated result in position.
- Quick explanation: Track each object separately, then apply every verified rule to both missing frames.
- Takeaway: Keep one rule stream per object; combine the streams only after each one is clear.

### Steps

1. **Track the orange arrow:** Orange Arrow: move 2 cells up; reverse direction when the edge is reached; cycle colour Orange → Yellow. Check the same change across every simulated transition.
2. **Track the yellow square:** Yellow Square: follow right → down → left → up; reverse any move that reaches an edge; cycle colour Blue → Pink → Yellow. Check the same change across every simulated transition.
3. **Predict missing matrix 1:** Apply every discovered rule once to the last visible frame. The simulated result matches Option B.
4. **Predict missing matrix 2:** Apply the same rules one more time. The simulated result matches Option A.

<details><summary>Internal metadata used</summary>

```json
{
  "rules": [
    {
      "symbolId": "alpha",
      "movement": {
        "kind": "linear",
        "direction": "up",
        "steps": 2,
        "progression": "fixed",
        "boundary": "bounce"
      },
      "colour": {
        "cycle": [
          "orange",
          "yellow"
        ],
        "steps": 1,
        "progression": "fixed"
      }
    },
    {
      "symbolId": "beta",
      "movement": {
        "kind": "direction_cycle",
        "directions": [
          "right",
          "down",
          "left",
          "up"
        ],
        "steps": 1,
        "progression": "fixed",
        "boundary": "bounce"
      },
      "colour": {
        "cycle": [
          "blue",
          "pink",
          "yellow"
        ],
        "steps": 1,
        "progression": "fixed"
      }
    }
  ],
  "generatorVersion": "figure-sequences@4.0.0"
}
```

</details>

## figure_sequence · hard · phase7-figure_sequence-hard-8

- Classification: independent_object_streams
- Correct answer: `["slot-1-correct","slot-2-correct"]`
- Sample student answer: `["slot-1-distractor-2","slot-2-distractor-1"]`
- Feedback: Recheck position — In missing matrix 1, your option differs from the simulated result in position.
- Quick explanation: Track each object separately, then apply every verified rule to both missing frames.
- Takeaway: Keep one rule stream per object; combine the streams only after each one is clear.

### Steps

1. **Track the orange square:** Orange Square: follow right → down → left → up; reverse any move that reaches an edge; rotate 90° clockwise; increase the rotation each frame; cycle colour Black → Orange → Green → Pink. Check the same change across every simulated transition.
2. **Track the orange diamond:** Orange Diamond: move 2 cells right; reverse direction when the edge is reached; rotate 90° counter-clockwise; cycle colour Green → Black → Yellow → Orange. Check the same change across every simulated transition.
3. **Track the green circle:** Green Circle: move 1 step counter-clockwise around the border; increase the move by one each frame; cycle colour Orange → Green → Blue. Check the same change across every simulated transition.
4. **Track the yellow arrow:** Yellow Arrow: move 1 step clockwise around the border; increase the move by one each frame. Check the same change across every simulated transition.
5. **Predict missing matrix 1:** Apply every discovered rule once to the last visible frame. The simulated result matches Option C.
6. **Predict missing matrix 2:** Apply the same rules one more time. The simulated result matches Option C.

<details><summary>Internal metadata used</summary>

```json
{
  "rules": [
    {
      "symbolId": "alpha",
      "movement": {
        "kind": "direction_cycle",
        "directions": [
          "right",
          "down",
          "left",
          "up"
        ],
        "steps": 1,
        "progression": "fixed",
        "boundary": "bounce"
      },
      "rotation": {
        "direction": "clockwise",
        "quarterTurns": 1,
        "progression": "incrementing"
      },
      "colour": {
        "cycle": [
          "black",
          "orange",
          "green",
          "pink"
        ],
        "steps": 1,
        "progression": "fixed"
      }
    },
    {
      "symbolId": "beta",
      "movement": {
        "kind": "linear",
        "direction": "right",
        "steps": 2,
        "progression": "fixed",
        "boundary": "bounce"
      },
      "rotation": {
        "direction": "counter_clockwise",
        "quarterTurns": 1,
        "progression": "fixed"
      },
      "colour": {
        "cycle": [
          "green",
          "black",
          "yellow",
          "orange"
        ],
        "steps": 1,
        "progression": "fixed"
      }
    },
    {
      "symbolId": "gamma",
      "movement": {
        "kind": "border",
        "direction": "counter_clockwise",
        "steps": 1,
        "progression": "incrementing"
      },
      "colour": {
        "cycle": [
          "orange",
          "green",
          "blue"
        ],
        "steps": 1,
        "progression": "fixed"
      }
    },
    {
      "symbolId": "delta",
      "movement": {
        "kind": "border",
        "direction": "clockwise",
        "steps": 1,
        "progression": "incrementing"
      }
    }
  ],
  "generatorVersion": "figure-sequences@4.0.0"
}
```

</details>

## figure_sequence · easy · phase7-figure_sequence-easy-9

- Classification: independent_object_streams
- Correct answer: `["slot-1-correct","slot-2-correct"]`
- Sample student answer: `["slot-1-distractor-2","slot-2-distractor-1"]`
- Feedback: Recheck position — In missing matrix 1, your option differs from the simulated result in position.
- Quick explanation: Track each object separately, then apply every verified rule to both missing frames.
- Takeaway: Keep one rule stream per object; combine the streams only after each one is clear.

### Steps

1. **Track the black arrow:** Black Arrow: move 1 cell right; reverse direction when the edge is reached. Check the same change across every simulated transition.
2. **Track the green circle:** Green Circle: move 1 step counter-clockwise around the border. Check the same change across every simulated transition.
3. **Predict missing matrix 1:** Apply every discovered rule once to the last visible frame. The simulated result matches Option B.
4. **Predict missing matrix 2:** Apply the same rules one more time. The simulated result matches Option A.

<details><summary>Internal metadata used</summary>

```json
{
  "rules": [
    {
      "symbolId": "alpha",
      "movement": {
        "kind": "linear",
        "direction": "right",
        "steps": 1,
        "progression": "fixed",
        "boundary": "bounce"
      }
    },
    {
      "symbolId": "beta",
      "movement": {
        "kind": "border",
        "direction": "counter_clockwise",
        "steps": 1,
        "progression": "fixed"
      }
    }
  ],
  "generatorVersion": "figure-sequences@4.0.0"
}
```

</details>

## figure_sequence · medium · phase7-figure_sequence-medium-10

- Classification: independent_object_streams
- Correct answer: `["slot-1-correct","slot-2-correct"]`
- Sample student answer: `["slot-1-distractor-1","slot-2-distractor-1"]`
- Feedback: Recheck position — In missing matrix 1, your option differs from the simulated result in position.
- Quick explanation: Track each object separately, then apply every verified rule to both missing frames.
- Takeaway: Keep one rule stream per object; combine the streams only after each one is clear.

### Steps

1. **Track the blue triangle:** Blue Triangle: move 2 steps counter-clockwise around the border; rotate 90° clockwise. Check the same change across every simulated transition.
2. **Track the orange arrow:** Orange Arrow: move 1 cell down; reverse direction when the edge is reached; rotate 90° counter-clockwise. Check the same change across every simulated transition.
3. **Track the yellow circle:** Yellow Circle: move 1 cell up; reverse direction when the edge is reached. Check the same change across every simulated transition.
4. **Predict missing matrix 1:** Apply every discovered rule once to the last visible frame. The simulated result matches Option C.
5. **Predict missing matrix 2:** Apply the same rules one more time. The simulated result matches Option B.

<details><summary>Internal metadata used</summary>

```json
{
  "rules": [
    {
      "symbolId": "alpha",
      "movement": {
        "kind": "border",
        "direction": "counter_clockwise",
        "steps": 2,
        "progression": "fixed"
      },
      "rotation": {
        "direction": "clockwise",
        "quarterTurns": 1,
        "progression": "fixed"
      }
    },
    {
      "symbolId": "beta",
      "movement": {
        "kind": "linear",
        "direction": "down",
        "steps": 1,
        "progression": "fixed",
        "boundary": "bounce"
      },
      "rotation": {
        "direction": "counter_clockwise",
        "quarterTurns": 1,
        "progression": "fixed"
      }
    },
    {
      "symbolId": "gamma",
      "movement": {
        "kind": "linear",
        "direction": "up",
        "steps": 1,
        "progression": "fixed",
        "boundary": "bounce"
      }
    }
  ],
  "generatorVersion": "figure-sequences@4.0.0"
}
```

</details>

## figure_sequence · hard · phase7-figure_sequence-hard-11

- Classification: independent_object_streams
- Correct answer: `["slot-1-correct","slot-2-correct"]`
- Sample student answer: `["slot-1-distractor-1","slot-2-distractor-1"]`
- Feedback: Recheck position — In missing matrix 1, your option differs from the simulated result in position.
- Quick explanation: Track each object separately, then apply every verified rule to both missing frames.
- Takeaway: Keep one rule stream per object; combine the streams only after each one is clear.

### Steps

1. **Track the pink square:** Pink Square: move 2 steps clockwise around the border; rotate 90° clockwise; cycle colour Pink → Black → Green → Blue. Check the same change across every simulated transition.
2. **Track the pink circle:** Pink Circle: move 1 cell down left; reverse direction when the edge is reached; increase the move by one each frame; cycle colour Pink → Black. Check the same change across every simulated transition.
3. **Track the pink arrow:** Pink Arrow: move 1 step counter-clockwise around the border; cycle colour Pink → Black → Orange → Green. Check the same change across every simulated transition.
4. **Track the pink triangle:** Pink Triangle: move 1 step counter-clockwise around the border; rotate 90° clockwise; cycle colour Green → Pink → Black. Check the same change across every simulated transition.
5. **Predict missing matrix 1:** Apply every discovered rule once to the last visible frame. The simulated result matches Option B.
6. **Predict missing matrix 2:** Apply the same rules one more time. The simulated result matches Option B.

<details><summary>Internal metadata used</summary>

```json
{
  "rules": [
    {
      "symbolId": "alpha",
      "movement": {
        "kind": "border",
        "direction": "clockwise",
        "steps": 2,
        "progression": "fixed"
      },
      "rotation": {
        "direction": "clockwise",
        "quarterTurns": 1,
        "progression": "fixed"
      },
      "colour": {
        "cycle": [
          "pink",
          "black",
          "green",
          "blue"
        ],
        "steps": 1,
        "progression": "fixed"
      }
    },
    {
      "symbolId": "beta",
      "movement": {
        "kind": "linear",
        "direction": "down_left",
        "steps": 1,
        "progression": "incrementing",
        "boundary": "bounce"
      },
      "colour": {
        "cycle": [
          "pink",
          "black"
        ],
        "steps": 1,
        "progression": "fixed"
      }
    },
    {
      "symbolId": "gamma",
      "movement": {
        "kind": "border",
        "direction": "counter_clockwise",
        "steps": 1,
        "progression": "fixed"
      },
      "colour": {
        "cycle": [
          "pink",
          "black",
          "orange",
          "green"
        ],
        "steps": 1,
        "progression": "incrementing"
      }
    },
    {
      "symbolId": "delta",
      "movement": {
        "kind": "border",
        "direction": "counter_clockwise",
        "steps": 1,
        "progression": "fixed"
      },
      "rotation": {
        "direction": "clockwise",
        "quarterTurns": 1,
        "progression": "fixed"
      },
      "colour": {
        "cycle": [
          "green",
          "pink",
          "black"
        ],
        "steps": 1,
        "progression": "fixed"
      }
    }
  ],
  "generatorVersion": "figure-sequences@4.0.0"
}
```

</details>

## figure_sequence · easy · phase7-figure_sequence-easy-12

- Classification: single_object_transformation
- Correct answer: `["slot-1-correct","slot-2-correct"]`
- Sample student answer: `["slot-1-distractor-1","slot-2-distractor-1"]`
- Feedback: Recheck position — In missing matrix 1, your option differs from the simulated result in position.
- Quick explanation: Track the object, then apply every verified rule to both missing frames.
- Takeaway: Confirm a rule across the whole sequence before using it to predict the missing frames.

### Steps

1. **Track the yellow diamond:** Yellow Diamond: move 1 cell up; reverse direction when the edge is reached. Check the same change across every simulated transition.
2. **Predict missing matrix 1:** Apply every discovered rule once to the last visible frame. The simulated result matches Option A.
3. **Predict missing matrix 2:** Apply the same rules one more time. The simulated result matches Option B.

<details><summary>Internal metadata used</summary>

```json
{
  "rules": [
    {
      "symbolId": "alpha",
      "movement": {
        "kind": "linear",
        "direction": "up",
        "steps": 1,
        "progression": "fixed",
        "boundary": "bounce"
      }
    }
  ],
  "generatorVersion": "figure-sequences@4.0.0"
}
```

</details>

## figure_sequence · medium · phase7-figure_sequence-medium-13

- Classification: independent_object_streams
- Correct answer: `["slot-1-correct","slot-2-correct"]`
- Sample student answer: `["slot-1-distractor-1","slot-2-distractor-1"]`
- Feedback: Recheck position — In missing matrix 1, your option differs from the simulated result in position.
- Quick explanation: Track each object separately, then apply every verified rule to both missing frames.
- Takeaway: Keep one rule stream per object; combine the streams only after each one is clear.

### Steps

1. **Track the orange square:** Orange Square: move 1 step clockwise around the border. Check the same change across every simulated transition.
2. **Track the green diamond:** Green Diamond: move 1 step counter-clockwise around the border; rotate 90° clockwise. Check the same change across every simulated transition.
3. **Track the yellow arrow:** Yellow Arrow: move 1 step counter-clockwise around the border. Check the same change across every simulated transition.
4. **Predict missing matrix 1:** Apply every discovered rule once to the last visible frame. The simulated result matches Option B.
5. **Predict missing matrix 2:** Apply the same rules one more time. The simulated result matches Option B.

<details><summary>Internal metadata used</summary>

```json
{
  "rules": [
    {
      "symbolId": "alpha",
      "movement": {
        "kind": "border",
        "direction": "clockwise",
        "steps": 1,
        "progression": "fixed"
      }
    },
    {
      "symbolId": "beta",
      "movement": {
        "kind": "border",
        "direction": "counter_clockwise",
        "steps": 1,
        "progression": "fixed"
      },
      "rotation": {
        "direction": "clockwise",
        "quarterTurns": 1,
        "progression": "fixed"
      }
    },
    {
      "symbolId": "gamma",
      "movement": {
        "kind": "border",
        "direction": "counter_clockwise",
        "steps": 1,
        "progression": "fixed"
      }
    }
  ],
  "generatorVersion": "figure-sequences@4.0.0"
}
```

</details>

## figure_sequence · hard · phase7-figure_sequence-hard-14

- Classification: independent_object_streams
- Correct answer: `["slot-1-correct","slot-2-correct"]`
- Sample student answer: `["slot-1-distractor-1","slot-2-distractor-2"]`
- Feedback: Recheck position — In missing matrix 1, your option differs from the simulated result in position.
- Quick explanation: Track each object separately, then apply every verified rule to both missing frames.
- Takeaway: Keep one rule stream per object; combine the streams only after each one is clear.

### Steps

1. **Track the pink diamond:** Pink Diamond: move 1 step clockwise around the border; increase the move by one each frame; cycle colour Pink → Yellow. Check the same change across every simulated transition.
2. **Track the blue triangle:** Blue Triangle: follow right → down → left → up; reverse any move that reaches an edge; rotate 90° clockwise; increase the rotation each frame; cycle colour Blue → Pink → Yellow. Check the same change across every simulated transition.
3. **Track the pink arrow:** Pink Arrow: follow left → down → right → up; reverse any move that reaches an edge; rotate 90° counter-clockwise. Check the same change across every simulated transition.
4. **Predict missing matrix 1:** Apply every discovered rule once to the last visible frame. The simulated result matches Option A.
5. **Predict missing matrix 2:** Apply the same rules one more time. The simulated result matches Option C.

<details><summary>Internal metadata used</summary>

```json
{
  "rules": [
    {
      "symbolId": "alpha",
      "movement": {
        "kind": "border",
        "direction": "clockwise",
        "steps": 1,
        "progression": "incrementing"
      },
      "colour": {
        "cycle": [
          "pink",
          "yellow"
        ],
        "steps": 1,
        "progression": "fixed"
      }
    },
    {
      "symbolId": "beta",
      "movement": {
        "kind": "direction_cycle",
        "directions": [
          "right",
          "down",
          "left",
          "up"
        ],
        "steps": 2,
        "progression": "fixed",
        "boundary": "bounce"
      },
      "rotation": {
        "direction": "clockwise",
        "quarterTurns": 1,
        "progression": "incrementing"
      },
      "colour": {
        "cycle": [
          "blue",
          "pink",
          "yellow"
        ],
        "steps": 1,
        "progression": "fixed"
      }
    },
    {
      "symbolId": "gamma",
      "movement": {
        "kind": "direction_cycle",
        "directions": [
          "left",
          "down",
          "right",
          "up"
        ],
        "steps": 1,
        "progression": "fixed",
        "boundary": "bounce"
      },
      "rotation": {
        "direction": "counter_clockwise",
        "quarterTurns": 1,
        "progression": "fixed"
      }
    }
  ],
  "generatorVersion": "figure-sequences@4.0.0"
}
```

</details>

## mathematical_equation · easy · phase7-mathematical_equation-easy-0

- Classification: dependency_order_substitution
- Correct answer: `{"A":4,"B":16}`
- Sample student answer: `{"A":5,"B":16}`
- Feedback: Recheck A first — This is the earliest value in the verified solve order that differs. Rework Equation 2 before carrying values forward.
- Quick explanation: Start with A, then use each solved value to unlock the next relationship.
- Takeaway: Choose the relationship with the fewest unknowns first, then substitute solved values forward.

### Steps

1. **Find A:** Start here because only one letter is unknown. Rewrite A = 4 as A = 4; this gives A = 4.
2. **Find B:** Use A = 4 here. Rewrite 20 − A = B as 16 = B; this gives B = 16.

<details><summary>Internal metadata used</summary>

```json
{
  "solutionPath": [
    {
      "equationIndex": 1,
      "targetSymbol": "A",
      "knownSymbols": [],
      "dependencySymbols": [],
      "reasoning": "solve_variable"
    },
    {
      "equationIndex": 0,
      "targetSymbol": "B",
      "knownSymbols": [
        "A"
      ],
      "dependencySymbols": [
        "A"
      ],
      "reasoning": "substitute"
    }
  ],
  "dependencyModel": {
    "family": "chain",
    "solveOrder": [
      "A",
      "B"
    ],
    "edges": [
      {
        "source": "A",
        "target": "B"
      }
    ],
    "hiddenGroupingCount": 0,
    "relationshipReversalCount": 0,
    "meaningfulReasoningSteps": 2,
    "relationshipPrimitives": [
      "complement",
      "direct_value"
    ],
    "evidenceLevel": "official_composition",
    "rootStrategy": "direct",
    "targetSymbol": "A"
  },
  "fastestMethod": "Start from the cleanest direct constraint, then substitute through the composed relationships in dependency order.",
  "generatorVersion": "mathematical-equations@7.0.0"
}
```

</details>

## mathematical_equation · medium · phase7-mathematical_equation-medium-1

- Classification: combine_then_substitute
- Correct answer: `{"A":2,"B":10,"C":8}`
- Sample student answer: `{"A":3,"B":10,"C":8}`
- Feedback: Recheck A first — This is the earliest value in the verified solve order that differs. Rework Equation 1 and Equation 3 and Equation 2 before carrying values forward.
- Quick explanation: Start with A, then use each solved value to unlock the next relationship.
- Takeaway: When no relationship starts cleanly, combine the smallest useful set; after that, substitute forward.

### Steps

1. **Find A:** Use equations 1 and 3 and 2 together to eliminate the other unknown. Rewrite Eq. 1: 3 × A + C + B = 24  •  Eq. 3: C = 4 × A  •  Eq. 2: B = 5 × A as Eq. 1: 3 × A + C + B = 24  •  Eq. 3: C = 4 × A  •  Eq. 2: B = 5 × A; this gives A = 2.
2. **Find C:** Use A = 2 here. Rewrite C = 4 × A as C = 8; this gives C = 8.
3. **Find B:** Use A = 2 and C = 8 here. Rewrite B = 5 × A as B = 10; this gives B = 10.

<details><summary>Internal metadata used</summary>

```json
{
  "solutionPath": [
    {
      "equationIndex": 0,
      "supportingEquationIndices": [
        2,
        1
      ],
      "targetSymbol": "A",
      "knownSymbols": [],
      "dependencySymbols": [],
      "reasoning": "combine_equations"
    },
    {
      "equationIndex": 2,
      "targetSymbol": "C",
      "knownSymbols": [
        "A"
      ],
      "dependencySymbols": [
        "A"
      ],
      "reasoning": "substitute"
    },
    {
      "equationIndex": 1,
      "targetSymbol": "B",
      "knownSymbols": [
        "A",
        "C"
      ],
      "dependencySymbols": [
        "A"
      ],
      "reasoning": "substitute"
    }
  ],
  "dependencyModel": {
    "family": "branch",
    "solveOrder": [
      "A",
      "C",
      "B"
    ],
    "edges": [
      {
        "source": "A",
        "target": "C"
      },
      {
        "source": "A",
        "target": "B"
      }
    ],
    "hiddenGroupingCount": 2,
    "relationshipReversalCount": 2,
    "meaningfulReasoningSteps": 5,
    "relationshipPrimitives": [
      "weighted_sum",
      "scale",
      "scale"
    ],
    "evidenceLevel": "official_composition",
    "rootStrategy": "global_balance",
    "targetSymbol": "C"
  },
  "fastestMethod": "Express the dependent letters through the anchor, use the balance constraint once, then substitute forward through the graph.",
  "generatorVersion": "mathematical-equations@7.0.0"
}
```

</details>

## mathematical_equation · hard · phase7-mathematical_equation-hard-2

- Classification: combine_then_substitute
- Correct answer: `{"A":6,"B":8,"C":1,"D":11}`
- Sample student answer: `{"A":7,"B":8,"C":1,"D":11}`
- Feedback: Recheck A first — This is the earliest value in the verified solve order that differs. Rework Equation 4 before carrying values forward.
- Quick explanation: Start with B, then use each solved value to unlock the next relationship.
- Takeaway: When no relationship starts cleanly, combine the smallest useful set; after that, substitute forward.

### Steps

1. **Find B:** Use equations 3 and 4 and 2 and 1 together to eliminate the other unknown. Rewrite Eq. 3: B + A + D + C = 26  •  Eq. 4: 14 − B = A  •  Eq. 2: 19 − B = D  •  Eq. 1: 20 = 3 × C + A + D as Eq. 3: B + A + D + C = 26  •  Eq. 4: 14 − B = A  •  Eq. 2: 19 − B = D  •  Eq. 1: 20 = 3 × C + A + D; this gives B = 8.
2. **Find A:** Use B = 8 here. Rewrite 14 − B = A as 6 = A; this gives A = 6.
3. **Find D:** Use B = 8 and A = 6 here. Rewrite 19 − B = D as 11 = D; this gives D = 11.
4. **Find C:** Use B = 8 and A = 6 and D = 11 here. Rewrite 20 = 3 × C + A + D as 20 = 3 × C + 6 + 11; this gives C = 1.

<details><summary>Internal metadata used</summary>

```json
{
  "solutionPath": [
    {
      "equationIndex": 2,
      "supportingEquationIndices": [
        3,
        1,
        0
      ],
      "targetSymbol": "B",
      "knownSymbols": [],
      "dependencySymbols": [],
      "reasoning": "combine_equations"
    },
    {
      "equationIndex": 3,
      "targetSymbol": "A",
      "knownSymbols": [
        "B"
      ],
      "dependencySymbols": [
        "B"
      ],
      "reasoning": "substitute"
    },
    {
      "equationIndex": 1,
      "targetSymbol": "D",
      "knownSymbols": [
        "B",
        "A"
      ],
      "dependencySymbols": [
        "B"
      ],
      "reasoning": "substitute"
    },
    {
      "equationIndex": 0,
      "targetSymbol": "C",
      "knownSymbols": [
        "B",
        "A",
        "D"
      ],
      "dependencySymbols": [
        "A",
        "D"
      ],
      "reasoning": "substitute"
    }
  ],
  "dependencyModel": {
    "family": "branch_recombine",
    "solveOrder": [
      "B",
      "A",
      "D",
      "C"
    ],
    "edges": [
      {
        "source": "B",
        "target": "A"
      },
      {
        "source": "B",
        "target": "D"
      },
      {
        "source": "A",
        "target": "C"
      },
      {
        "source": "D",
        "target": "C"
      }
    ],
    "hiddenGroupingCount": 3,
    "relationshipReversalCount": 1,
    "meaningfulReasoningSteps": 7,
    "relationshipPrimitives": [
      "weighted_sum",
      "complement",
      "multi_variable_sum",
      "complement"
    ],
    "evidenceLevel": "official_composition",
    "rootStrategy": "global_balance",
    "targetSymbol": "C"
  },
  "fastestMethod": "Express the dependent letters through the anchor, use the balance constraint once, then substitute forward through the graph.",
  "generatorVersion": "mathematical-equations@7.0.0"
}
```

</details>

## mathematical_equation · easy · phase7-mathematical_equation-easy-3

- Classification: combine_then_substitute
- Correct answer: `{"A":12,"B":3}`
- Sample student answer: `{"A":13,"B":3}`
- Feedback: Recheck A first — This is the earliest value in the verified solve order that differs. Rework Equation 1 and Equation 2 before carrying values forward.
- Quick explanation: Start with A, then use each solved value to unlock the next relationship.
- Takeaway: When no relationship starts cleanly, combine the smallest useful set; after that, substitute forward.

### Steps

1. **Find A:** Use equations 1 and 2 together to eliminate the other unknown. Rewrite Eq. 1: A ÷ 4 = B  •  Eq. 2: 27 = A + 5 × B as Eq. 1: A ÷ 4 = B  •  Eq. 2: 27 = A + 5 × B; this gives A = 12.
2. **Find B:** Use A = 12 here. Rewrite A ÷ 4 = B as 3 = B; this gives B = 3.

<details><summary>Internal metadata used</summary>

```json
{
  "solutionPath": [
    {
      "equationIndex": 0,
      "supportingEquationIndices": [
        1
      ],
      "targetSymbol": "A",
      "knownSymbols": [],
      "dependencySymbols": [],
      "reasoning": "combine_equations"
    },
    {
      "equationIndex": 0,
      "targetSymbol": "B",
      "knownSymbols": [
        "A"
      ],
      "dependencySymbols": [
        "A"
      ],
      "reasoning": "substitute"
    }
  ],
  "dependencyModel": {
    "family": "direct",
    "solveOrder": [
      "A",
      "B"
    ],
    "edges": [
      {
        "source": "A",
        "target": "B"
      }
    ],
    "hiddenGroupingCount": 0,
    "relationshipReversalCount": 1,
    "meaningfulReasoningSteps": 3,
    "relationshipPrimitives": [
      "divide_by_constant",
      "weighted_sum"
    ],
    "evidenceLevel": "official",
    "rootStrategy": "coupled",
    "targetSymbol": "B"
  },
  "fastestMethod": "Combine the independent entry constraints, then substitute each solved value through the remaining dependency graph.",
  "generatorVersion": "mathematical-equations@7.0.0"
}
```

</details>

## mathematical_equation · medium · phase7-mathematical_equation-medium-4

- Classification: combine_then_substitute
- Correct answer: `{"A":20,"B":15,"C":3}`
- Sample student answer: `{"A":21,"B":15,"C":3}`
- Feedback: Recheck A first — This is the earliest value in the verified solve order that differs. Rework Equation 3 before carrying values forward.
- Quick explanation: Start with B, then use each solved value to unlock the next relationship.
- Takeaway: When no relationship starts cleanly, combine the smallest useful set; after that, substitute forward.

### Steps

1. **Find B:** Use equations 2 and 1 together to eliminate the other unknown. Rewrite Eq. 2: C = 18 − B  •  Eq. 1: B ÷ 5 = C as Eq. 2: C = 18 − B  •  Eq. 1: B ÷ 5 = C; this gives B = 15.
2. **Find C:** Use B = 15 here. Rewrite C = 18 − B as C = 3; this gives C = 3.
3. **Find A:** Use B = 15 and C = 3 here. Rewrite A + C − B = 8 as A + 3 − 15 = 8; this gives A = 20.

<details><summary>Internal metadata used</summary>

```json
{
  "solutionPath": [
    {
      "equationIndex": 1,
      "supportingEquationIndices": [
        0
      ],
      "targetSymbol": "B",
      "knownSymbols": [],
      "dependencySymbols": [],
      "reasoning": "combine_equations"
    },
    {
      "equationIndex": 1,
      "targetSymbol": "C",
      "knownSymbols": [
        "B"
      ],
      "dependencySymbols": [
        "B"
      ],
      "reasoning": "substitute"
    },
    {
      "equationIndex": 2,
      "targetSymbol": "A",
      "knownSymbols": [
        "B",
        "C"
      ],
      "dependencySymbols": [
        "B",
        "C"
      ],
      "reasoning": "substitute"
    }
  ],
  "dependencyModel": {
    "family": "triangle",
    "solveOrder": [
      "B",
      "C",
      "A"
    ],
    "edges": [
      {
        "source": "B",
        "target": "C"
      },
      {
        "source": "B",
        "target": "A"
      },
      {
        "source": "C",
        "target": "A"
      }
    ],
    "hiddenGroupingCount": 1,
    "relationshipReversalCount": 1,
    "meaningfulReasoningSteps": 4,
    "relationshipPrimitives": [
      "divide_by_constant",
      "complement",
      "multi_variable_balance"
    ],
    "evidenceLevel": "third_party_supported",
    "rootStrategy": "coupled",
    "targetSymbol": "A"
  },
  "fastestMethod": "Combine the independent entry constraints, then substitute each solved value through the remaining dependency graph.",
  "generatorVersion": "mathematical-equations@7.0.0"
}
```

</details>

## mathematical_equation · hard · phase7-mathematical_equation-hard-5

- Classification: combine_then_substitute
- Correct answer: `{"A":9,"B":2,"C":8,"D":9}`
- Sample student answer: `{"A":10,"B":2,"C":8,"D":9}`
- Feedback: Recheck A first — This is the earliest value in the verified solve order that differs. Rework Equation 1 before carrying values forward.
- Quick explanation: Start with C, then use each solved value to unlock the next relationship.
- Takeaway: When no relationship starts cleanly, combine the smallest useful set; after that, substitute forward.

### Steps

1. **Find C:** Use equations 3 and 2 and 1 and 4 together to eliminate the other unknown. Rewrite Eq. 3: 6 = C + A − D − B  •  Eq. 2: 17 = C + D  •  Eq. 1: 25 = 2 × C + A  •  Eq. 4: A − 7 = B as Eq. 3: 6 = C + A − D − B  •  Eq. 2: 17 = C + D  •  Eq. 1: 25 = 2 × C + A  •  Eq. 4: A − 7 = B; this gives C = 8.
2. **Find D:** Use C = 8 here. Rewrite 17 = C + D as 17 = 8 + D; this gives D = 9.
3. **Find A:** Use C = 8 and D = 9 here. Rewrite 25 = 2 × C + A as 25 = 16 + A; this gives A = 9.
4. **Find B:** Use C = 8 and D = 9 and A = 9 here. Rewrite A − 7 = B as 2 = B; this gives B = 2.

<details><summary>Internal metadata used</summary>

```json
{
  "solutionPath": [
    {
      "equationIndex": 2,
      "supportingEquationIndices": [
        1,
        0,
        3
      ],
      "targetSymbol": "C",
      "knownSymbols": [],
      "dependencySymbols": [],
      "reasoning": "combine_equations"
    },
    {
      "equationIndex": 1,
      "targetSymbol": "D",
      "knownSymbols": [
        "C"
      ],
      "dependencySymbols": [
        "C"
      ],
      "reasoning": "substitute"
    },
    {
      "equationIndex": 0,
      "targetSymbol": "A",
      "knownSymbols": [
        "C",
        "D"
      ],
      "dependencySymbols": [
        "C"
      ],
      "reasoning": "substitute"
    },
    {
      "equationIndex": 3,
      "targetSymbol": "B",
      "knownSymbols": [
        "C",
        "D",
        "A"
      ],
      "dependencySymbols": [
        "A"
      ],
      "reasoning": "substitute"
    }
  ],
  "dependencyModel": {
    "family": "branch",
    "solveOrder": [
      "C",
      "D",
      "A",
      "B"
    ],
    "edges": [
      {
        "source": "C",
        "target": "D"
      },
      {
        "source": "C",
        "target": "A"
      },
      {
        "source": "A",
        "target": "B"
      }
    ],
    "hiddenGroupingCount": 2,
    "relationshipReversalCount": 3,
    "meaningfulReasoningSteps": 7,
    "relationshipPrimitives": [
      "weighted_sum",
      "sum",
      "multi_variable_balance",
      "offset_subtract"
    ],
    "evidenceLevel": "official_composition",
    "rootStrategy": "global_balance",
    "targetSymbol": "B"
  },
  "fastestMethod": "Express the dependent letters through the anchor, use the balance constraint once, then substitute forward through the graph.",
  "generatorVersion": "mathematical-equations@7.0.0"
}
```

</details>

## mathematical_equation · easy · phase7-mathematical_equation-easy-6

- Classification: combine_then_substitute
- Correct answer: `{"A":20,"B":1}`
- Sample student answer: `{"A":21,"B":1}`
- Feedback: Recheck A first — This is the earliest value in the verified solve order that differs. Rework Equation 2 before carrying values forward.
- Quick explanation: Start with B, then use each solved value to unlock the next relationship.
- Takeaway: When no relationship starts cleanly, combine the smallest useful set; after that, substitute forward.

### Steps

1. **Find B:** Use equations 1 and 2 together to eliminate the other unknown. Rewrite Eq. 1: B = A − 19  •  Eq. 2: 2 × B + A = 22 as Eq. 1: B = A − 19  •  Eq. 2: 2 × B + A = 22; this gives B = 1.
2. **Find A:** Use B = 1 here. Rewrite 2 × B + A = 22 as 2 + A = 22; this gives A = 20.

<details><summary>Internal metadata used</summary>

```json
{
  "solutionPath": [
    {
      "equationIndex": 0,
      "supportingEquationIndices": [
        1
      ],
      "targetSymbol": "B",
      "knownSymbols": [],
      "dependencySymbols": [],
      "reasoning": "combine_equations"
    },
    {
      "equationIndex": 1,
      "targetSymbol": "A",
      "knownSymbols": [
        "B"
      ],
      "dependencySymbols": [
        "B"
      ],
      "reasoning": "substitute"
    }
  ],
  "dependencyModel": {
    "family": "reverse_chain",
    "solveOrder": [
      "B",
      "A"
    ],
    "edges": [
      {
        "source": "B",
        "target": "A"
      }
    ],
    "hiddenGroupingCount": 1,
    "relationshipReversalCount": 1,
    "meaningfulReasoningSteps": 3,
    "relationshipPrimitives": [
      "offset_subtract",
      "weighted_sum"
    ],
    "evidenceLevel": "official_composition",
    "rootStrategy": "global_balance",
    "targetSymbol": "A"
  },
  "fastestMethod": "Express the dependent letters through the anchor, use the balance constraint once, then substitute forward through the graph.",
  "generatorVersion": "mathematical-equations@7.0.0"
}
```

</details>

## mathematical_equation · medium · phase7-mathematical_equation-medium-7

- Classification: combine_then_substitute
- Correct answer: `{"A":7,"B":5,"C":18}`
- Sample student answer: `{"A":8,"B":5,"C":18}`
- Feedback: Recheck A first — This is the earliest value in the verified solve order that differs. Rework Equation 1 and Equation 3 and Equation 2 before carrying values forward.
- Quick explanation: Start with A, then use each solved value to unlock the next relationship.
- Takeaway: When no relationship starts cleanly, combine the smallest useful set; after that, substitute forward.

### Steps

1. **Find A:** Use equations 1 and 3 and 2 together to eliminate the other unknown. Rewrite Eq. 1: A + C + B = 30  •  Eq. 3: 11 = C − A  •  Eq. 2: B = C − 13 as Eq. 1: A + C + B = 30  •  Eq. 3: 11 = C − A  •  Eq. 2: B = C − 13; this gives A = 7.
2. **Find C:** Use A = 7 here. Rewrite 11 = C − A as 11 = C − 7; this gives C = 18.
3. **Find B:** Use A = 7 and C = 18 here. Rewrite B = C − 13 as B = 5; this gives B = 5.

<details><summary>Internal metadata used</summary>

```json
{
  "solutionPath": [
    {
      "equationIndex": 0,
      "supportingEquationIndices": [
        2,
        1
      ],
      "targetSymbol": "A",
      "knownSymbols": [],
      "dependencySymbols": [],
      "reasoning": "combine_equations"
    },
    {
      "equationIndex": 2,
      "targetSymbol": "C",
      "knownSymbols": [
        "A"
      ],
      "dependencySymbols": [
        "A"
      ],
      "reasoning": "substitute"
    },
    {
      "equationIndex": 1,
      "targetSymbol": "B",
      "knownSymbols": [
        "A",
        "C"
      ],
      "dependencySymbols": [
        "C"
      ],
      "reasoning": "substitute"
    }
  ],
  "dependencyModel": {
    "family": "reverse_chain",
    "solveOrder": [
      "A",
      "C",
      "B"
    ],
    "edges": [
      {
        "source": "A",
        "target": "C"
      },
      {
        "source": "C",
        "target": "B"
      }
    ],
    "hiddenGroupingCount": 2,
    "relationshipReversalCount": 2,
    "meaningfulReasoningSteps": 5,
    "relationshipPrimitives": [
      "multi_variable_sum",
      "offset_subtract",
      "difference"
    ],
    "evidenceLevel": "official_composition",
    "rootStrategy": "global_balance",
    "targetSymbol": "B"
  },
  "fastestMethod": "Express the dependent letters through the anchor, use the balance constraint once, then substitute forward through the graph.",
  "generatorVersion": "mathematical-equations@7.0.0"
}
```

</details>

## mathematical_equation · hard · phase7-mathematical_equation-hard-8

- Classification: combine_then_substitute
- Correct answer: `{"A":1,"B":2,"C":5,"D":10}`
- Sample student answer: `{"A":2,"B":2,"C":5,"D":10}`
- Feedback: Recheck A first — This is the earliest value in the verified solve order that differs. Rework Equation 3 before carrying values forward.
- Quick explanation: Start with B, then use each solved value to unlock the next relationship.
- Takeaway: When no relationship starts cleanly, combine the smallest useful set; after that, substitute forward.

### Steps

1. **Find B:** Use equations 2 and 3 and 1 and 4 together to eliminate the other unknown. Rewrite Eq. 2: 4 × B + A + D + C = 24  •  Eq. 3: A = B ÷ 2  •  Eq. 1: 2 × B + D = 14  •  Eq. 4: C = D − 5 as Eq. 2: 4 × B + A + D + C = 24  •  Eq. 3: A = B ÷ 2  •  Eq. 1: 2 × B + D = 14  •  Eq. 4: C = D − 5; this gives B = 2.
2. **Find A:** Use B = 2 here. Rewrite A = B ÷ 2 as A = 1; this gives A = 1.
3. **Find D:** Use B = 2 and A = 1 here. Rewrite 2 × B + D = 14 as 4 + D = 14; this gives D = 10.
4. **Find C:** Use B = 2 and A = 1 and D = 10 here. Rewrite C = D − 5 as C = 5; this gives C = 5.

<details><summary>Internal metadata used</summary>

```json
{
  "solutionPath": [
    {
      "equationIndex": 1,
      "supportingEquationIndices": [
        2,
        0,
        3
      ],
      "targetSymbol": "B",
      "knownSymbols": [],
      "dependencySymbols": [],
      "reasoning": "combine_equations"
    },
    {
      "equationIndex": 2,
      "targetSymbol": "A",
      "knownSymbols": [
        "B"
      ],
      "dependencySymbols": [
        "B"
      ],
      "reasoning": "substitute"
    },
    {
      "equationIndex": 0,
      "targetSymbol": "D",
      "knownSymbols": [
        "B",
        "A"
      ],
      "dependencySymbols": [
        "B"
      ],
      "reasoning": "substitute"
    },
    {
      "equationIndex": 3,
      "targetSymbol": "C",
      "knownSymbols": [
        "B",
        "A",
        "D"
      ],
      "dependencySymbols": [
        "D"
      ],
      "reasoning": "substitute"
    }
  ],
  "dependencyModel": {
    "family": "branch",
    "solveOrder": [
      "B",
      "A",
      "D",
      "C"
    ],
    "edges": [
      {
        "source": "B",
        "target": "A"
      },
      {
        "source": "B",
        "target": "D"
      },
      {
        "source": "D",
        "target": "C"
      }
    ],
    "hiddenGroupingCount": 2,
    "relationshipReversalCount": 2,
    "meaningfulReasoningSteps": 7,
    "relationshipPrimitives": [
      "weighted_sum",
      "weighted_sum",
      "divide_by_constant",
      "offset_subtract"
    ],
    "evidenceLevel": "official_composition",
    "rootStrategy": "global_balance",
    "targetSymbol": "C"
  },
  "fastestMethod": "Express the dependent letters through the anchor, use the balance constraint once, then substitute forward through the graph.",
  "generatorVersion": "mathematical-equations@7.0.0"
}
```

</details>

## mathematical_equation · easy · phase7-mathematical_equation-easy-9

- Classification: dependency_order_substitution
- Correct answer: `{"A":7,"B":14}`
- Sample student answer: `{"A":8,"B":14}`
- Feedback: Recheck A first — This is the earliest value in the verified solve order that differs. Rework Equation 1 before carrying values forward.
- Quick explanation: Start with A, then use each solved value to unlock the next relationship.
- Takeaway: Choose the relationship with the fewest unknowns first, then substitute solved values forward.

### Steps

1. **Find A:** Start here because only one letter is unknown. Rewrite A = 7 as A = 7; this gives A = 7.
2. **Find B:** Use A = 7 here. Rewrite 2 × A = B as 14 = B; this gives B = 14.

<details><summary>Internal metadata used</summary>

```json
{
  "solutionPath": [
    {
      "equationIndex": 0,
      "targetSymbol": "A",
      "knownSymbols": [],
      "dependencySymbols": [],
      "reasoning": "solve_variable"
    },
    {
      "equationIndex": 1,
      "targetSymbol": "B",
      "knownSymbols": [
        "A"
      ],
      "dependencySymbols": [
        "A"
      ],
      "reasoning": "substitute"
    }
  ],
  "dependencyModel": {
    "family": "chain",
    "solveOrder": [
      "A",
      "B"
    ],
    "edges": [
      {
        "source": "A",
        "target": "B"
      }
    ],
    "hiddenGroupingCount": 0,
    "relationshipReversalCount": 0,
    "meaningfulReasoningSteps": 2,
    "relationshipPrimitives": [
      "direct_value",
      "scale"
    ],
    "evidenceLevel": "official_composition",
    "rootStrategy": "direct",
    "targetSymbol": "B"
  },
  "fastestMethod": "Start from the cleanest direct constraint, then substitute through the composed relationships in dependency order.",
  "generatorVersion": "mathematical-equations@7.0.0"
}
```

</details>

## mathematical_equation · medium · phase7-mathematical_equation-medium-10

- Classification: dependency_order_substitution
- Correct answer: `{"A":2,"B":20,"C":19}`
- Sample student answer: `{"A":3,"B":20,"C":19}`
- Feedback: Recheck A first — This is the earliest value in the verified solve order that differs. Rework Equation 2 before carrying values forward.
- Quick explanation: Start with C, then use each solved value to unlock the next relationship.
- Takeaway: Choose the relationship with the fewest unknowns first, then substitute solved values forward.

### Steps

1. **Find C:** Start here because only one letter is unknown. Rewrite C = 19 as C = 19; this gives C = 19.
2. **Find A:** Use C = 19 here. Rewrite C + A = 21 as 19 + A = 21; this gives A = 2.
3. **Find B:** Use C = 19 and A = 2 here. Rewrite 22 − A = B as 20 = B; this gives B = 20.

<details><summary>Internal metadata used</summary>

```json
{
  "solutionPath": [
    {
      "equationIndex": 2,
      "targetSymbol": "C",
      "knownSymbols": [],
      "dependencySymbols": [],
      "reasoning": "solve_variable"
    },
    {
      "equationIndex": 1,
      "targetSymbol": "A",
      "knownSymbols": [
        "C"
      ],
      "dependencySymbols": [
        "C"
      ],
      "reasoning": "substitute"
    },
    {
      "equationIndex": 0,
      "targetSymbol": "B",
      "knownSymbols": [
        "C",
        "A"
      ],
      "dependencySymbols": [
        "A"
      ],
      "reasoning": "substitute"
    }
  ],
  "dependencyModel": {
    "family": "chain",
    "solveOrder": [
      "C",
      "A",
      "B"
    ],
    "edges": [
      {
        "source": "C",
        "target": "A"
      },
      {
        "source": "A",
        "target": "B"
      }
    ],
    "hiddenGroupingCount": 0,
    "relationshipReversalCount": 0,
    "meaningfulReasoningSteps": 3,
    "relationshipPrimitives": [
      "complement",
      "sum",
      "direct_value"
    ],
    "evidenceLevel": "official_composition",
    "rootStrategy": "direct",
    "targetSymbol": "B"
  },
  "fastestMethod": "Start from the cleanest direct constraint, then substitute through the composed relationships in dependency order.",
  "generatorVersion": "mathematical-equations@7.0.0"
}
```

</details>

## mathematical_equation · hard · phase7-mathematical_equation-hard-11

- Classification: combine_then_substitute
- Correct answer: `{"A":19,"B":16,"C":8,"D":7}`
- Sample student answer: `{"A":20,"B":16,"C":8,"D":7}`
- Feedback: Recheck A first — This is the earliest value in the verified solve order that differs. Rework Equation 3 before carrying values forward.
- Quick explanation: Start with C, then use each solved value to unlock the next relationship.
- Takeaway: When no relationship starts cleanly, combine the smallest useful set; after that, substitute forward.

### Steps

1. **Find C:** Use equations 1 and 2 together to eliminate the other unknown. Rewrite Eq. 1: B − C = 8  •  Eq. 2: B = 2 × C as Eq. 1: B − C = 8  •  Eq. 2: B = 2 × C; this gives C = 8.
2. **Find B:** Use C = 8 here. Rewrite B − C = 8 as B − 8 = 8; this gives B = 16.
3. **Find D:** Use C = 8 and B = 16 here. Rewrite C + 2 × D = 22 as 8 + 2 × D = 22; this gives D = 7.
4. **Find A:** Use C = 8 and B = 16 and D = 7 here. Rewrite 10 = A + D − B as 10 = A + 7 − 16; this gives A = 19.

<details><summary>Internal metadata used</summary>

```json
{
  "solutionPath": [
    {
      "equationIndex": 0,
      "supportingEquationIndices": [
        1
      ],
      "targetSymbol": "C",
      "knownSymbols": [],
      "dependencySymbols": [],
      "reasoning": "combine_equations"
    },
    {
      "equationIndex": 0,
      "targetSymbol": "B",
      "knownSymbols": [
        "C"
      ],
      "dependencySymbols": [
        "C"
      ],
      "reasoning": "substitute"
    },
    {
      "equationIndex": 3,
      "targetSymbol": "D",
      "knownSymbols": [
        "C",
        "B"
      ],
      "dependencySymbols": [
        "C"
      ],
      "reasoning": "substitute"
    },
    {
      "equationIndex": 2,
      "targetSymbol": "A",
      "knownSymbols": [
        "C",
        "B",
        "D"
      ],
      "dependencySymbols": [
        "B",
        "D"
      ],
      "reasoning": "substitute"
    }
  ],
  "dependencyModel": {
    "family": "mixed",
    "solveOrder": [
      "C",
      "B",
      "D",
      "A"
    ],
    "edges": [
      {
        "source": "C",
        "target": "B"
      },
      {
        "source": "C",
        "target": "D"
      },
      {
        "source": "B",
        "target": "A"
      },
      {
        "source": "D",
        "target": "A"
      }
    ],
    "hiddenGroupingCount": 1,
    "relationshipReversalCount": 2,
    "meaningfulReasoningSteps": 5,
    "relationshipPrimitives": [
      "difference",
      "scale",
      "multi_variable_balance",
      "weighted_sum"
    ],
    "evidenceLevel": "official_composition",
    "rootStrategy": "coupled",
    "targetSymbol": "A"
  },
  "fastestMethod": "Combine the independent entry constraints, then substitute each solved value through the remaining dependency graph.",
  "generatorVersion": "mathematical-equations@7.0.0"
}
```

</details>

## mathematical_equation · easy · phase7-mathematical_equation-easy-12

- Classification: combine_then_substitute
- Correct answer: `{"A":15,"B":5}`
- Sample student answer: `{"A":16,"B":5}`
- Feedback: Recheck A first — This is the earliest value in the verified solve order that differs. Rework Equation 2 and Equation 1 before carrying values forward.
- Quick explanation: Start with A, then use each solved value to unlock the next relationship.
- Takeaway: When no relationship starts cleanly, combine the smallest useful set; after that, substitute forward.

### Steps

1. **Find A:** Use equations 2 and 1 together to eliminate the other unknown. Rewrite Eq. 2: 3 × B = A  •  Eq. 1: 20 − A = B as Eq. 2: 3 × B = A  •  Eq. 1: 20 − A = B; this gives A = 15.
2. **Find B:** Use A = 15 here. Rewrite 20 − A = B as 5 = B; this gives B = 5.

<details><summary>Internal metadata used</summary>

```json
{
  "solutionPath": [
    {
      "equationIndex": 1,
      "supportingEquationIndices": [
        0
      ],
      "targetSymbol": "A",
      "knownSymbols": [],
      "dependencySymbols": [],
      "reasoning": "combine_equations"
    },
    {
      "equationIndex": 0,
      "targetSymbol": "B",
      "knownSymbols": [
        "A"
      ],
      "dependencySymbols": [
        "A"
      ],
      "reasoning": "substitute"
    }
  ],
  "dependencyModel": {
    "family": "reverse_chain",
    "solveOrder": [
      "A",
      "B"
    ],
    "edges": [
      {
        "source": "A",
        "target": "B"
      }
    ],
    "hiddenGroupingCount": 1,
    "relationshipReversalCount": 0,
    "meaningfulReasoningSteps": 3,
    "relationshipPrimitives": [
      "complement",
      "scale"
    ],
    "evidenceLevel": "official_composition",
    "rootStrategy": "global_balance",
    "targetSymbol": "A"
  },
  "fastestMethod": "Express the dependent letters through the anchor, use the balance constraint once, then substitute forward through the graph.",
  "generatorVersion": "mathematical-equations@7.0.0"
}
```

</details>

## mathematical_equation · medium · phase7-mathematical_equation-medium-13

- Classification: combine_then_substitute
- Correct answer: `{"A":7,"B":6,"C":12}`
- Sample student answer: `{"A":8,"B":6,"C":12}`
- Feedback: Recheck A first — This is the earliest value in the verified solve order that differs. Rework Equation 3 before carrying values forward.
- Quick explanation: Start with C, then use each solved value to unlock the next relationship.
- Takeaway: When no relationship starts cleanly, combine the smallest useful set; after that, substitute forward.

### Steps

1. **Find C:** Use equations 1 and 2 and 3 together to eliminate the other unknown. Rewrite Eq. 1: C + A − B = 13  •  Eq. 2: C + B = 18  •  Eq. 3: B + A = 13 as Eq. 1: C + A − B = 13  •  Eq. 2: C + B = 18  •  Eq. 3: B + A = 13; this gives C = 12.
2. **Find B:** Use C = 12 here. Rewrite C + B = 18 as 12 + B = 18; this gives B = 6.
3. **Find A:** Use C = 12 and B = 6 here. Rewrite B + A = 13 as 6 + A = 13; this gives A = 7.

<details><summary>Internal metadata used</summary>

```json
{
  "solutionPath": [
    {
      "equationIndex": 0,
      "supportingEquationIndices": [
        1,
        2
      ],
      "targetSymbol": "C",
      "knownSymbols": [],
      "dependencySymbols": [],
      "reasoning": "combine_equations"
    },
    {
      "equationIndex": 1,
      "targetSymbol": "B",
      "knownSymbols": [
        "C"
      ],
      "dependencySymbols": [
        "C"
      ],
      "reasoning": "substitute"
    },
    {
      "equationIndex": 2,
      "targetSymbol": "A",
      "knownSymbols": [
        "C",
        "B"
      ],
      "dependencySymbols": [
        "B"
      ],
      "reasoning": "substitute"
    }
  ],
  "dependencyModel": {
    "family": "reverse_chain",
    "solveOrder": [
      "C",
      "B",
      "A"
    ],
    "edges": [
      {
        "source": "C",
        "target": "B"
      },
      {
        "source": "B",
        "target": "A"
      }
    ],
    "hiddenGroupingCount": 2,
    "relationshipReversalCount": 0,
    "meaningfulReasoningSteps": 5,
    "relationshipPrimitives": [
      "multi_variable_balance",
      "sum",
      "sum"
    ],
    "evidenceLevel": "official_composition",
    "rootStrategy": "global_balance",
    "targetSymbol": "A"
  },
  "fastestMethod": "Express the dependent letters through the anchor, use the balance constraint once, then substitute forward through the graph.",
  "generatorVersion": "mathematical-equations@7.0.0"
}
```

</details>

## mathematical_equation · hard · phase7-mathematical_equation-hard-14

- Classification: combine_then_substitute
- Correct answer: `{"A":3,"B":5,"C":15,"D":2}`
- Sample student answer: `{"A":4,"B":5,"C":15,"D":2}`
- Feedback: Recheck A first — This is the earliest value in the verified solve order that differs. Rework Equation 3 before carrying values forward.
- Quick explanation: Start with B, then use each solved value to unlock the next relationship.
- Takeaway: When no relationship starts cleanly, combine the smallest useful set; after that, substitute forward.

### Steps

1. **Find B:** Use equations 2 and 4 and 3 and 1 together to eliminate the other unknown. Rewrite Eq. 2: 3 × B + C + A + D = 35  •  Eq. 4: 3 × B = C  •  Eq. 3: A = C ÷ 5  •  Eq. 1: A − 1 = D as Eq. 2: 3 × B + C + A + D = 35  •  Eq. 4: 3 × B = C  •  Eq. 3: A = C ÷ 5  •  Eq. 1: A − 1 = D; this gives B = 5.
2. **Find C:** Use B = 5 here. Rewrite 3 × B = C as 15 = C; this gives C = 15.
3. **Find A:** Use B = 5 and C = 15 here. Rewrite A = C ÷ 5 as A = 3; this gives A = 3.
4. **Find D:** Use B = 5 and C = 15 and A = 3 here. Rewrite A − 1 = D as 2 = D; this gives D = 2.

<details><summary>Internal metadata used</summary>

```json
{
  "solutionPath": [
    {
      "equationIndex": 1,
      "supportingEquationIndices": [
        3,
        2,
        0
      ],
      "targetSymbol": "B",
      "knownSymbols": [],
      "dependencySymbols": [],
      "reasoning": "combine_equations"
    },
    {
      "equationIndex": 3,
      "targetSymbol": "C",
      "knownSymbols": [
        "B"
      ],
      "dependencySymbols": [
        "B"
      ],
      "reasoning": "substitute"
    },
    {
      "equationIndex": 2,
      "targetSymbol": "A",
      "knownSymbols": [
        "B",
        "C"
      ],
      "dependencySymbols": [
        "C"
      ],
      "reasoning": "substitute"
    },
    {
      "equationIndex": 0,
      "targetSymbol": "D",
      "knownSymbols": [
        "B",
        "C",
        "A"
      ],
      "dependencySymbols": [
        "A"
      ],
      "reasoning": "substitute"
    }
  ],
  "dependencyModel": {
    "family": "cascade",
    "solveOrder": [
      "B",
      "C",
      "A",
      "D"
    ],
    "edges": [
      {
        "source": "B",
        "target": "C"
      },
      {
        "source": "C",
        "target": "A"
      },
      {
        "source": "A",
        "target": "D"
      }
    ],
    "hiddenGroupingCount": 2,
    "relationshipReversalCount": 1,
    "meaningfulReasoningSteps": 7,
    "relationshipPrimitives": [
      "offset_subtract",
      "weighted_sum",
      "divide_by_constant",
      "scale"
    ],
    "evidenceLevel": "official_composition",
    "rootStrategy": "global_balance",
    "targetSymbol": "D"
  },
  "fastestMethod": "Express the dependent letters through the anchor, use the balance constraint once, then substitute forward through the graph.",
  "generatorVersion": "mathematical-equations@7.0.0"
}
```

</details>

## latin_square · easy · phase7-latin_square-easy-0

- Classification: row_column_intersection
- Correct answer: `"E"`
- Sample student answer: `"A"`
- Feedback: The column already contains A — A symbol can appear only once in each row and column, so A is eliminated from the target.
- Quick explanation: Compare the symbols missing from the target row and target column.
- Takeaway: A target value must satisfy both its row and its column at the same time.

### Steps

1. **Look at Row 5:** The target row is missing A, B, C, D, E.
2. **Check Column 1:** The target column is missing E.
3. **Compare Row 5 and Column 1:** Compare both lists: E remain valid in both.
4. **So, the ? cell is E:** Both row and column constraints force E at the target.

<details><summary>Internal metadata used</summary>

```json
{
  "deductionTrace": [
    {
      "coordinate": {
        "row": 0,
        "column": 2
      },
      "symbol": "A",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 0,
          "column": 0
        },
        {
          "row": 1,
          "column": 2
        },
        {
          "row": 2,
          "column": 2
        },
        {
          "row": 3,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "A"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 1,
        "column": 4
      },
      "symbol": "D",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 1,
          "column": 0
        },
        {
          "row": 3,
          "column": 4
        },
        {
          "row": 1,
          "column": 2
        },
        {
          "row": 2,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 2,
        "column": 1
      },
      "symbol": "B",
      "reason": "single_candidate",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 2,
          "column": 3
        },
        {
          "row": 2,
          "column": 0
        },
        {
          "row": 2,
          "column": 2
        },
        {
          "row": 2,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "B"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 3,
        "column": 1
      },
      "symbol": "A",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 2,
          "column": 3
        }
      ],
      "candidatesBefore": [
        "A",
        "C"
      ],
      "eliminatedCandidates": [
        "B",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 3,
        "column": 3
      },
      "symbol": "C",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 2,
          "column": 3
        },
        {
          "row": 3,
          "column": 4
        },
        {
          "row": 3,
          "column": 0
        },
        {
          "row": 3,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "C"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 4,
        "column": 0
      },
      "symbol": "E",
      "reason": "single_candidate",
      "axis": "column",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 1,
          "column": 0
        },
        {
          "row": 0,
          "column": 0
        },
        {
          "row": 2,
          "column": 0
        },
        {
          "row": 3,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "D"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 4,
        "column": 2
      },
      "symbol": "B",
      "reason": "only_position_in_column",
      "axis": "column",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 0,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "A",
        "B"
      ],
      "eliminatedCandidates": [
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 0,
        "column": 4
      },
      "symbol": "C",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 0,
          "column": 2
        },
        {
          "row": 1,
          "column": 4
        }
      ],
      "clueDependencies": [
        {
          "row": 0,
          "column": 0
        },
        {
          "row": 3,
          "column": 4
        },
        {
          "row": 2,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "C"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "D",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 1,
        "column": 1
      },
      "symbol": "E",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 3,
          "column": 1
        },
        {
          "row": 2,
          "column": 1
        },
        {
          "row": 1,
          "column": 4
        }
      ],
      "clueDependencies": [
        {
          "row": 1,
          "column": 0
        },
        {
          "row": 1,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "D"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 1,
        "column": 3
      },
      "symbol": "B",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [
        {
          "row": 2,
          "column": 1
        }
      ],
      "clueDependencies": [],
      "candidatesBefore": [
        "B",
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 4,
        "column": 3
      },
      "symbol": "D",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 4,
          "column": 2
        },
        {
          "row": 3,
          "column": 3
        },
        {
          "row": 4,
          "column": 0
        }
      ],
      "clueDependencies": [
        {
          "row": 2,
          "column": 3
        }
      ],
      "candidatesBefore": [
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 4,
        "column": 4
      },
      "symbol": "A",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [
        {
          "row": 3,
          "column": 1
        }
      ],
      "clueDependencies": [
        {
          "row": 2,
          "column": 3
        }
      ],
      "candidatesBefore": [
        "A",
        "C"
      ],
      "eliminatedCandidates": [
        "B",
        "D",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 0,
        "column": 1
      },
      "symbol": "D",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 0,
          "column": 2
        },
        {
          "row": 3,
          "column": 1
        },
        {
          "row": 2,
          "column": 1
        },
        {
          "row": 0,
          "column": 4
        },
        {
          "row": 1,
          "column": 1
        }
      ],
      "clueDependencies": [
        {
          "row": 0,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "E"
      ],
      "round": 3,
      "depth": 3
    },
    {
      "coordinate": {
        "row": 0,
        "column": 3
      },
      "symbol": "E",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 0,
          "column": 2
        },
        {
          "row": 1,
          "column": 3
        },
        {
          "row": 0,
          "column": 4
        },
        {
          "row": 3,
          "column": 3
        },
        {
          "row": 4,
          "column": 3
        }
      ],
      "clueDependencies": [
        {
          "row": 2,
          "column": 3
        },
        {
          "row": 0,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "D"
      ],
      "round": 3,
      "depth": 3
    },
    {
      "coordinate": {
        "row": 4,
        "column": 1
      },
      "symbol": "C",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 4,
          "column": 4
        },
        {
          "row": 3,
          "column": 1
        },
        {
          "row": 4,
          "column": 2
        },
        {
          "row": 2,
          "column": 1
        },
        {
          "row": 4,
          "column": 3
        },
        {
          "row": 4,
          "column": 0
        },
        {
          "row": 1,
          "column": 1
        }
      ],
      "clueDependencies": [],
      "candidatesBefore": [
        "C"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "D",
        "E"
      ],
      "round": 3,
      "depth": 3
    }
  ],
  "generatorVersion": "latin-squares@4.0.0"
}
```

</details>

## latin_square · medium · phase7-latin_square-medium-1

- Classification: causal_dependency_closure
- Correct answer: `"C"`
- Sample student answer: `"A"`
- Feedback: The row already contains A — A symbol can appear only once in each row and column, so A is eliminated from the target.
- Quick explanation: Resolve 4 required cells, then return to the target.
- Takeaway: If the target is not forced yet, solve only the cells that remove a target candidate.

### Steps

1. **Fill Row 1, Column 1:** At Row 1, Column 1, the verified candidates reduce to C; place it because the target depends on this cell.
2. **Fill Row 2, Column 2:** At Row 2, Column 2, the verified candidates reduce to C; place it because the target depends on this cell.
3. **Fill Row 4, Column 3:** At Row 4, Column 3, the verified candidates reduce to D; place it because the target depends on this cell.
4. **Fill Row 5, Column 4:** At Row 5, Column 4, the verified candidates reduce to E; place it because the target depends on this cell.
5. **Look at Row 5:** The target row is missing B, C.
6. **Check Column 3:** The target column is missing A, B, C.
7. **Compare Row 5 and Column 3:** Compare both lists: B, C remain valid in both.
8. **Find where C fits in Row 5:** The only valid position check forces C into the target.
9. **So, the ? cell is C:** Both row and column constraints force C at the target.

<details><summary>Internal metadata used</summary>

```json
{
  "deductionTrace": [
    {
      "coordinate": {
        "row": 0,
        "column": 0
      },
      "symbol": "C",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 2,
          "column": 0
        },
        {
          "row": 0,
          "column": 4
        },
        {
          "row": 0,
          "column": 3
        },
        {
          "row": 0,
          "column": 1
        },
        {
          "row": 3,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "C"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 0,
        "column": 2
      },
      "symbol": "A",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 2,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "A",
        "C"
      ],
      "eliminatedCandidates": [
        "B",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 1,
        "column": 0
      },
      "symbol": "D",
      "reason": "only_position_in_column",
      "axis": "column",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 0,
          "column": 3
        },
        {
          "row": 4,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "B",
        "C",
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 1,
        "column": 1
      },
      "symbol": "C",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 1,
          "column": 3
        },
        {
          "row": 4,
          "column": 1
        },
        {
          "row": 3,
          "column": 1
        },
        {
          "row": 2,
          "column": 1
        },
        {
          "row": 1,
          "column": 4
        },
        {
          "row": 0,
          "column": 1
        }
      ],
      "candidatesBefore": [
        "C"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 2,
        "column": 3
      },
      "symbol": "B",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 0,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "B",
        "C"
      ],
      "eliminatedCandidates": [
        "A",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 2,
        "column": 4
      },
      "symbol": "C",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 2,
          "column": 0
        },
        {
          "row": 3,
          "column": 4
        },
        {
          "row": 0,
          "column": 4
        },
        {
          "row": 2,
          "column": 1
        },
        {
          "row": 4,
          "column": 4
        },
        {
          "row": 2,
          "column": 2
        },
        {
          "row": 1,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "C"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 3,
        "column": 2
      },
      "symbol": "D",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 0,
          "column": 3
        }
      ],
      "candidatesBefore": [
        "C",
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 3,
        "column": 3
      },
      "symbol": "C",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 3,
          "column": 4
        },
        {
          "row": 1,
          "column": 3
        },
        {
          "row": 3,
          "column": 1
        },
        {
          "row": 0,
          "column": 3
        },
        {
          "row": 3,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "C"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 4,
        "column": 3
      },
      "symbol": "E",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 3,
          "column": 0
        },
        {
          "row": 2,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "B",
        "C",
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "D"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 1,
        "column": 2
      },
      "symbol": "B",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 0,
          "column": 2
        },
        {
          "row": 1,
          "column": 1
        },
        {
          "row": 1,
          "column": 0
        },
        {
          "row": 3,
          "column": 2
        }
      ],
      "clueDependencies": [
        {
          "row": 1,
          "column": 3
        },
        {
          "row": 1,
          "column": 4
        },
        {
          "row": 2,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "B"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 4,
        "column": 0
      },
      "symbol": "B",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 0,
          "column": 0
        },
        {
          "row": 1,
          "column": 0
        },
        {
          "row": 4,
          "column": 3
        }
      ],
      "clueDependencies": [
        {
          "row": 4,
          "column": 1
        },
        {
          "row": 2,
          "column": 0
        },
        {
          "row": 4,
          "column": 4
        },
        {
          "row": 3,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "B"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 4,
        "column": 2
      },
      "symbol": "C",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [
        {
          "row": 0,
          "column": 0
        }
      ],
      "clueDependencies": [],
      "candidatesBefore": [
        "B",
        "C"
      ],
      "eliminatedCandidates": [
        "A",
        "D",
        "E"
      ],
      "round": 2,
      "depth": 2
    }
  ],
  "generatorVersion": "latin-squares@4.0.0"
}
```

</details>

## latin_square · hard · phase7-latin_square-hard-2

- Classification: causal_dependency_closure
- Correct answer: `"A"`
- Sample student answer: `"B"`
- Feedback: B is removed by the deduction path — The target's first row-and-column check is not enough; resolve the highlighted dependency cells, then B is eliminated.
- Quick explanation: Resolve 7 required cells, then return to the target.
- Takeaway: If the target is not forced yet, solve only the cells that remove a target candidate.

### Steps

1. **Fill Row 3, Column 4:** At Row 3, Column 4, the verified candidates reduce to E; place it because the target depends on this cell.
2. **Fill Row 4, Column 4:** At Row 4, Column 4, the verified candidates reduce to D; place it because the target depends on this cell.
3. **Fill Row 2, Column 1:** At Row 2, Column 1, the verified candidates reduce to E; place it because the target depends on this cell.
4. **Fill Row 2, Column 4:** At Row 2, Column 4, the verified candidates reduce to B; place it because the target depends on this cell.
5. **Fill Row 4, Column 1:** At Row 4, Column 1, the verified candidates reduce to B; place it because the target depends on this cell.
6. **Fill Row 1, Column 1:** At Row 1, Column 1, the verified candidates reduce to D; place it because the target depends on this cell.
7. **Fill Row 3, Column 1:** At Row 3, Column 1, the verified candidates reduce to C; place it because the target depends on this cell.
8. **Look at Row 5:** The target row is missing A, B, D, E.
9. **Check Column 1:** The target column is missing A.
10. **Compare Row 5 and Column 1:** Compare both lists: A remain valid in both.
11. **So, the ? cell is A:** Both row and column constraints force A at the target.

<details><summary>Internal metadata used</summary>

```json
{
  "deductionTrace": [
    {
      "coordinate": {
        "row": 2,
        "column": 3
      },
      "symbol": "E",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 0,
          "column": 3
        },
        {
          "row": 2,
          "column": 2
        },
        {
          "row": 4,
          "column": 3
        },
        {
          "row": 2,
          "column": 1
        }
      ],
      "candidatesBefore": [
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "D"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 3,
        "column": 3
      },
      "symbol": "D",
      "reason": "only_position_in_column",
      "axis": "column",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 1,
          "column": 2
        },
        {
          "row": 2,
          "column": 1
        }
      ],
      "candidatesBefore": [
        "B",
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 4,
        "column": 2
      },
      "symbol": "E",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 3,
          "column": 2
        },
        {
          "row": 2,
          "column": 2
        },
        {
          "row": 4,
          "column": 3
        },
        {
          "row": 0,
          "column": 2
        },
        {
          "row": 1,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "D"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 1,
        "column": 0
      },
      "symbol": "E",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [
        {
          "row": 2,
          "column": 3
        }
      ],
      "clueDependencies": [
        {
          "row": 0,
          "column": 1
        },
        {
          "row": 3,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "A",
        "B",
        "C",
        "E"
      ],
      "eliminatedCandidates": [
        "D"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 1,
        "column": 3
      },
      "symbol": "B",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 3,
          "column": 3
        },
        {
          "row": 2,
          "column": 3
        }
      ],
      "clueDependencies": [
        {
          "row": 0,
          "column": 3
        },
        {
          "row": 4,
          "column": 3
        },
        {
          "row": 1,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "B"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 3,
        "column": 0
      },
      "symbol": "B",
      "reason": "single_candidate",
      "axis": "row",
      "dependencies": [
        {
          "row": 3,
          "column": 3
        }
      ],
      "clueDependencies": [
        {
          "row": 3,
          "column": 2
        },
        {
          "row": 3,
          "column": 1
        },
        {
          "row": 3,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "B"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 0,
        "column": 0
      },
      "symbol": "D",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 3,
          "column": 0
        },
        {
          "row": 1,
          "column": 0
        }
      ],
      "clueDependencies": [
        {
          "row": 0,
          "column": 3
        },
        {
          "row": 0,
          "column": 2
        },
        {
          "row": 0,
          "column": 1
        }
      ],
      "candidatesBefore": [
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "E"
      ],
      "round": 3,
      "depth": 3
    },
    {
      "coordinate": {
        "row": 0,
        "column": 4
      },
      "symbol": "B",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [
        {
          "row": 3,
          "column": 0
        }
      ],
      "clueDependencies": [],
      "candidatesBefore": [
        "B",
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "E"
      ],
      "round": 3,
      "depth": 3
    },
    {
      "coordinate": {
        "row": 1,
        "column": 1
      },
      "symbol": "A",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 1,
          "column": 3
        },
        {
          "row": 1,
          "column": 0
        }
      ],
      "clueDependencies": [
        {
          "row": 3,
          "column": 1
        },
        {
          "row": 1,
          "column": 2
        },
        {
          "row": 2,
          "column": 1
        },
        {
          "row": 0,
          "column": 1
        }
      ],
      "candidatesBefore": [
        "A"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "D",
        "E"
      ],
      "round": 3,
      "depth": 3
    },
    {
      "coordinate": {
        "row": 1,
        "column": 4
      },
      "symbol": "C",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 3,
          "column": 1
        }
      ],
      "candidatesBefore": [
        "A",
        "C"
      ],
      "eliminatedCandidates": [
        "B",
        "D",
        "E"
      ],
      "round": 3,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 2,
        "column": 0
      },
      "symbol": "C",
      "reason": "only_position_in_column",
      "axis": "column",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 0,
          "column": 2
        },
        {
          "row": 4,
          "column": 3
        }
      ],
      "candidatesBefore": [
        "A",
        "C"
      ],
      "eliminatedCandidates": [
        "B",
        "D",
        "E"
      ],
      "round": 3,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 4,
        "column": 1
      },
      "symbol": "B",
      "reason": "only_position_in_column",
      "axis": "column",
      "dependencies": [
        {
          "row": 1,
          "column": 3
        }
      ],
      "clueDependencies": [],
      "candidatesBefore": [
        "A",
        "B"
      ],
      "eliminatedCandidates": [
        "C",
        "D",
        "E"
      ],
      "round": 3,
      "depth": 3
    },
    {
      "coordinate": {
        "row": 2,
        "column": 4
      },
      "symbol": "A",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 0,
          "column": 4
        },
        {
          "row": 2,
          "column": 0
        },
        {
          "row": 1,
          "column": 4
        },
        {
          "row": 2,
          "column": 3
        }
      ],
      "clueDependencies": [
        {
          "row": 2,
          "column": 2
        },
        {
          "row": 2,
          "column": 1
        },
        {
          "row": 3,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "A"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "D",
        "E"
      ],
      "round": 4,
      "depth": 4
    },
    {
      "coordinate": {
        "row": 4,
        "column": 0
      },
      "symbol": "A",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 4,
          "column": 1
        },
        {
          "row": 3,
          "column": 0
        },
        {
          "row": 2,
          "column": 0
        },
        {
          "row": 0,
          "column": 0
        },
        {
          "row": 4,
          "column": 2
        },
        {
          "row": 1,
          "column": 0
        }
      ],
      "clueDependencies": [
        {
          "row": 4,
          "column": 3
        }
      ],
      "candidatesBefore": [
        "A"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "D",
        "E"
      ],
      "round": 4,
      "depth": 4
    },
    {
      "coordinate": {
        "row": 4,
        "column": 4
      },
      "symbol": "D",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [
        {
          "row": 0,
          "column": 0
        }
      ],
      "clueDependencies": [],
      "candidatesBefore": [
        "A",
        "D"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "E"
      ],
      "round": 4,
      "depth": 4
    }
  ],
  "generatorVersion": "latin-squares@4.0.0"
}
```

</details>

## latin_square · easy · phase7-latin_square-easy-3

- Classification: row_column_intersection
- Correct answer: `"B"`
- Sample student answer: `"A"`
- Feedback: The row already contains A — A symbol can appear only once in each row and column, so A is eliminated from the target.
- Quick explanation: Compare the symbols missing from the target row and target column.
- Takeaway: A target value must satisfy both its row and its column at the same time.

### Steps

1. **Look at Row 2:** The target row is missing B.
2. **Check Column 5:** The target column is missing A, B, C, D, E.
3. **Compare Row 2 and Column 5:** Compare both lists: B remain valid in both.
4. **So, the ? cell is B:** Both row and column constraints force B at the target.

<details><summary>Internal metadata used</summary>

```json
{
  "deductionTrace": [
    {
      "coordinate": {
        "row": 0,
        "column": 1
      },
      "symbol": "A",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 0,
          "column": 2
        },
        {
          "row": 1,
          "column": 1
        },
        {
          "row": 0,
          "column": 0
        },
        {
          "row": 3,
          "column": 1
        },
        {
          "row": 4,
          "column": 1
        }
      ],
      "candidatesBefore": [
        "A"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 0,
        "column": 4
      },
      "symbol": "E",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 4,
          "column": 1
        },
        {
          "row": 3,
          "column": 3
        }
      ],
      "candidatesBefore": [
        "A",
        "C",
        "E"
      ],
      "eliminatedCandidates": [
        "B",
        "D"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 1,
        "column": 4
      },
      "symbol": "B",
      "reason": "single_candidate",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 1,
          "column": 2
        },
        {
          "row": 1,
          "column": 1
        },
        {
          "row": 1,
          "column": 3
        },
        {
          "row": 1,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "B"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 2,
        "column": 1
      },
      "symbol": "B",
      "reason": "only_position_in_column",
      "axis": "column",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 0,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "A",
        "B"
      ],
      "eliminatedCandidates": [
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 2,
        "column": 4
      },
      "symbol": "D",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 3,
          "column": 1
        },
        {
          "row": 1,
          "column": 3
        }
      ],
      "candidatesBefore": [
        "A",
        "B",
        "D"
      ],
      "eliminatedCandidates": [
        "C",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 3,
        "column": 2
      },
      "symbol": "C",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 1,
          "column": 2
        },
        {
          "row": 3,
          "column": 0
        },
        {
          "row": 0,
          "column": 2
        },
        {
          "row": 3,
          "column": 1
        },
        {
          "row": 3,
          "column": 3
        },
        {
          "row": 2,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "C"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 3,
        "column": 4
      },
      "symbol": "A",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 1,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "A",
        "C"
      ],
      "eliminatedCandidates": [
        "B",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 4,
        "column": 0
      },
      "symbol": "A",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 3,
          "column": 0
        },
        {
          "row": 2,
          "column": 0
        },
        {
          "row": 0,
          "column": 0
        },
        {
          "row": 4,
          "column": 1
        },
        {
          "row": 1,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "A"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 4,
        "column": 2
      },
      "symbol": "D",
      "reason": "only_position_in_column",
      "axis": "column",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 3,
          "column": 1
        }
      ],
      "candidatesBefore": [
        "C",
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 0,
        "column": 3
      },
      "symbol": "C",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 0,
          "column": 1
        },
        {
          "row": 0,
          "column": 4
        }
      ],
      "clueDependencies": [
        {
          "row": 0,
          "column": 2
        },
        {
          "row": 0,
          "column": 0
        },
        {
          "row": 1,
          "column": 3
        },
        {
          "row": 3,
          "column": 3
        }
      ],
      "candidatesBefore": [
        "C"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "D",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 2,
        "column": 3
      },
      "symbol": "A",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 2,
          "column": 1
        },
        {
          "row": 2,
          "column": 4
        }
      ],
      "clueDependencies": [
        {
          "row": 2,
          "column": 0
        },
        {
          "row": 1,
          "column": 3
        },
        {
          "row": 2,
          "column": 2
        },
        {
          "row": 3,
          "column": 3
        }
      ],
      "candidatesBefore": [
        "A"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "D",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 4,
        "column": 3
      },
      "symbol": "B",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [
        {
          "row": 1,
          "column": 4
        }
      ],
      "clueDependencies": [],
      "candidatesBefore": [
        "B",
        "C"
      ],
      "eliminatedCandidates": [
        "A",
        "D",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 4,
        "column": 4
      },
      "symbol": "C",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 4,
          "column": 0
        },
        {
          "row": 3,
          "column": 4
        },
        {
          "row": 1,
          "column": 4
        },
        {
          "row": 4,
          "column": 2
        },
        {
          "row": 2,
          "column": 4
        },
        {
          "row": 0,
          "column": 4
        }
      ],
      "clueDependencies": [
        {
          "row": 4,
          "column": 1
        }
      ],
      "candidatesBefore": [
        "C"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "D",
        "E"
      ],
      "round": 2,
      "depth": 2
    }
  ],
  "generatorVersion": "latin-squares@4.0.0"
}
```

</details>

## latin_square · medium · phase7-latin_square-medium-4

- Classification: causal_dependency_closure
- Correct answer: `"B"`
- Sample student answer: `"A"`
- Feedback: The row already contains A — A symbol can appear only once in each row and column, so A is eliminated from the target.
- Quick explanation: Resolve 5 required cells, then return to the target.
- Takeaway: If the target is not forced yet, solve only the cells that remove a target candidate.

### Steps

1. **Fill Row 1, Column 4:** At Row 1, Column 4, the verified candidates reduce to B; place it because the target depends on this cell.
2. **Fill Row 2, Column 1:** At Row 2, Column 1, the verified candidates reduce to E; place it because the target depends on this cell.
3. **Fill Row 2, Column 5:** At Row 2, Column 5, the verified candidates reduce to C; place it because the target depends on this cell.
4. **Fill Row 3, Column 5:** At Row 3, Column 5, the verified candidates reduce to A; place it because the target depends on this cell.
5. **Fill Row 4, Column 3:** At Row 4, Column 3, the verified candidates reduce to A; place it because the target depends on this cell.
6. **Look at Row 5:** The target row is missing B, D, E.
7. **Check Column 5:** The target column is missing B, D.
8. **Compare Row 5 and Column 5:** Compare both lists: B, D remain valid in both.
9. **Find where B fits in Column 5:** The only valid position check forces B into the target.
10. **So, the ? cell is B:** Both row and column constraints force B at the target.

<details><summary>Internal metadata used</summary>

```json
{
  "deductionTrace": [
    {
      "coordinate": {
        "row": 0,
        "column": 3
      },
      "symbol": "B",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 1,
          "column": 3
        },
        {
          "row": 0,
          "column": 0
        },
        {
          "row": 4,
          "column": 3
        },
        {
          "row": 3,
          "column": 3
        },
        {
          "row": 2,
          "column": 3
        }
      ],
      "candidatesBefore": [
        "B"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 1,
        "column": 0
      },
      "symbol": "E",
      "reason": "only_position_in_column",
      "axis": "column",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 2,
          "column": 3
        }
      ],
      "candidatesBefore": [
        "D",
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 1,
        "column": 4
      },
      "symbol": "C",
      "reason": "only_position_in_column",
      "axis": "column",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 0,
          "column": 0
        },
        {
          "row": 2,
          "column": 2
        },
        {
          "row": 4,
          "column": 3
        }
      ],
      "candidatesBefore": [
        "B",
        "C",
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 2,
        "column": 0
      },
      "symbol": "D",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 4,
          "column": 0
        },
        {
          "row": 2,
          "column": 1
        },
        {
          "row": 3,
          "column": 0
        },
        {
          "row": 2,
          "column": 2
        },
        {
          "row": 0,
          "column": 0
        },
        {
          "row": 2,
          "column": 3
        }
      ],
      "candidatesBefore": [
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 2,
        "column": 4
      },
      "symbol": "A",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 4,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "A",
        "D"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 3,
        "column": 1
      },
      "symbol": "C",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 2,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "A",
        "C"
      ],
      "eliminatedCandidates": [
        "B",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 3,
        "column": 2
      },
      "symbol": "A",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 3,
          "column": 0
        },
        {
          "row": 2,
          "column": 2
        },
        {
          "row": 3,
          "column": 3
        },
        {
          "row": 3,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "A"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 0,
        "column": 1
      },
      "symbol": "A",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [
        {
          "row": 3,
          "column": 2
        },
        {
          "row": 2,
          "column": 4
        }
      ],
      "clueDependencies": [],
      "candidatesBefore": [
        "A",
        "D",
        "E"
      ],
      "eliminatedCandidates": [
        "B",
        "C"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 0,
        "column": 4
      },
      "symbol": "D",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 2,
          "column": 4
        },
        {
          "row": 0,
          "column": 3
        },
        {
          "row": 1,
          "column": 4
        }
      ],
      "clueDependencies": [
        {
          "row": 0,
          "column": 0
        },
        {
          "row": 3,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 1,
        "column": 1
      },
      "symbol": "D",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 1,
          "column": 4
        },
        {
          "row": 3,
          "column": 1
        },
        {
          "row": 1,
          "column": 0
        }
      ],
      "clueDependencies": [
        {
          "row": 1,
          "column": 3
        },
        {
          "row": 2,
          "column": 1
        }
      ],
      "candidatesBefore": [
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 1,
        "column": 2
      },
      "symbol": "B",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 2,
          "column": 1
        }
      ],
      "candidatesBefore": [
        "B",
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "E"
      ],
      "round": 2,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 4,
        "column": 4
      },
      "symbol": "B",
      "reason": "only_position_in_column",
      "axis": "column",
      "dependencies": [
        {
          "row": 0,
          "column": 3
        }
      ],
      "clueDependencies": [],
      "candidatesBefore": [
        "B",
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 0,
        "column": 2
      },
      "symbol": "E",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 0,
          "column": 1
        },
        {
          "row": 3,
          "column": 2
        },
        {
          "row": 0,
          "column": 3
        },
        {
          "row": 1,
          "column": 2
        },
        {
          "row": 0,
          "column": 4
        }
      ],
      "clueDependencies": [
        {
          "row": 0,
          "column": 0
        },
        {
          "row": 2,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "D"
      ],
      "round": 3,
      "depth": 3
    },
    {
      "coordinate": {
        "row": 4,
        "column": 1
      },
      "symbol": "E",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 0,
          "column": 1
        },
        {
          "row": 4,
          "column": 4
        },
        {
          "row": 3,
          "column": 1
        },
        {
          "row": 1,
          "column": 1
        }
      ],
      "clueDependencies": [
        {
          "row": 4,
          "column": 0
        },
        {
          "row": 2,
          "column": 1
        },
        {
          "row": 4,
          "column": 3
        }
      ],
      "candidatesBefore": [
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "D"
      ],
      "round": 3,
      "depth": 3
    },
    {
      "coordinate": {
        "row": 4,
        "column": 2
      },
      "symbol": "D",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [
        {
          "row": 1,
          "column": 1
        }
      ],
      "clueDependencies": [],
      "candidatesBefore": [
        "D",
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C"
      ],
      "round": 3,
      "depth": 3
    }
  ],
  "generatorVersion": "latin-squares@4.0.0"
}
```

</details>

## latin_square · hard · phase7-latin_square-hard-5

- Classification: causal_dependency_closure
- Correct answer: `"B"`
- Sample student answer: `"A"`
- Feedback: A is removed by the deduction path — The target's first row-and-column check is not enough; resolve the highlighted dependency cells, then A is eliminated.
- Quick explanation: Resolve 5 required cells, then return to the target.
- Takeaway: If the target is not forced yet, solve only the cells that remove a target candidate.

### Steps

1. **Fill Row 2, Column 4:** At Row 2, Column 4, the verified candidates reduce to A; place it because the target depends on this cell.
2. **Fill Row 2, Column 5:** At Row 2, Column 5, the verified candidates reduce to C; place it because the target depends on this cell.
3. **Fill Row 5, Column 4:** At Row 5, Column 4, the verified candidates reduce to D; place it because the target depends on this cell.
4. **Fill Row 4, Column 5:** At Row 4, Column 5, the verified candidates reduce to A; place it because the target depends on this cell.
5. **Fill Row 5, Column 5:** At Row 5, Column 5, the verified candidates reduce to E; place it because the target depends on this cell.
6. **Look at Row 1:** The target row is missing A, B, C, E.
7. **Check Column 5:** The target column is missing B, D.
8. **Compare Row 1 and Column 5:** Compare both lists: B remain valid in both.
9. **So, the ? cell is B:** Both row and column constraints force B at the target.

<details><summary>Internal metadata used</summary>

```json
{
  "deductionTrace": [
    {
      "coordinate": {
        "row": 0,
        "column": 0
      },
      "symbol": "A",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 4,
          "column": 0
        },
        {
          "row": 3,
          "column": 0
        },
        {
          "row": 0,
          "column": 1
        },
        {
          "row": 1,
          "column": 0
        },
        {
          "row": 2,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "A"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 0,
        "column": 2
      },
      "symbol": "C",
      "reason": "only_position_in_column",
      "axis": "column",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 4,
          "column": 1
        }
      ],
      "candidatesBefore": [
        "A",
        "C"
      ],
      "eliminatedCandidates": [
        "B",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 1,
        "column": 3
      },
      "symbol": "A",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 1,
          "column": 1
        },
        {
          "row": 2,
          "column": 3
        },
        {
          "row": 1,
          "column": 0
        },
        {
          "row": 1,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "A"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 1,
        "column": 4
      },
      "symbol": "C",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 2,
          "column": 3
        }
      ],
      "candidatesBefore": [
        "A",
        "C"
      ],
      "eliminatedCandidates": [
        "B",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 2,
        "column": 1
      },
      "symbol": "A",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 2,
          "column": 2
        },
        {
          "row": 1,
          "column": 1
        },
        {
          "row": 2,
          "column": 3
        },
        {
          "row": 4,
          "column": 1
        },
        {
          "row": 0,
          "column": 1
        },
        {
          "row": 2,
          "column": 0
        },
        {
          "row": 3,
          "column": 1
        }
      ],
      "candidatesBefore": [
        "A"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 2,
        "column": 4
      },
      "symbol": "D",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 0,
          "column": 1
        }
      ],
      "candidatesBefore": [
        "A",
        "D"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 4,
        "column": 2
      },
      "symbol": "A",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 4,
          "column": 0
        },
        {
          "row": 2,
          "column": 2
        },
        {
          "row": 4,
          "column": 1
        },
        {
          "row": 3,
          "column": 2
        },
        {
          "row": 1,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "A"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 4,
        "column": 3
      },
      "symbol": "D",
      "reason": "only_position_in_column",
      "axis": "column",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 0,
          "column": 1
        },
        {
          "row": 1,
          "column": 0
        },
        {
          "row": 3,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "A",
        "D",
        "E"
      ],
      "eliminatedCandidates": [
        "B",
        "C"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 0,
        "column": 3
      },
      "symbol": "E",
      "reason": "only_position_in_column",
      "axis": "column",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 3,
          "column": 1
        }
      ],
      "candidatesBefore": [
        "B",
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D"
      ],
      "round": 2,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 3,
        "column": 3
      },
      "symbol": "B",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 1,
          "column": 3
        },
        {
          "row": 4,
          "column": 3
        }
      ],
      "clueDependencies": [
        {
          "row": 3,
          "column": 0
        },
        {
          "row": 2,
          "column": 3
        },
        {
          "row": 3,
          "column": 2
        },
        {
          "row": 3,
          "column": 1
        }
      ],
      "candidatesBefore": [
        "B"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 3,
        "column": 4
      },
      "symbol": "A",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [
        {
          "row": 1,
          "column": 3
        }
      ],
      "clueDependencies": [],
      "candidatesBefore": [
        "A",
        "B"
      ],
      "eliminatedCandidates": [
        "C",
        "D",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 4,
        "column": 4
      },
      "symbol": "E",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 4,
          "column": 2
        },
        {
          "row": 1,
          "column": 4
        },
        {
          "row": 4,
          "column": 3
        },
        {
          "row": 2,
          "column": 4
        }
      ],
      "clueDependencies": [
        {
          "row": 4,
          "column": 0
        },
        {
          "row": 4,
          "column": 1
        }
      ],
      "candidatesBefore": [
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "D"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 0,
        "column": 4
      },
      "symbol": "B",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 0,
          "column": 0
        },
        {
          "row": 3,
          "column": 4
        },
        {
          "row": 0,
          "column": 2
        },
        {
          "row": 1,
          "column": 4
        },
        {
          "row": 2,
          "column": 4
        },
        {
          "row": 0,
          "column": 3
        },
        {
          "row": 4,
          "column": 4
        }
      ],
      "clueDependencies": [
        {
          "row": 0,
          "column": 1
        }
      ],
      "candidatesBefore": [
        "B"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D",
        "E"
      ],
      "round": 3,
      "depth": 3
    }
  ],
  "generatorVersion": "latin-squares@4.0.0"
}
```

</details>

## latin_square · easy · phase7-latin_square-easy-6

- Classification: row_column_intersection
- Correct answer: `"E"`
- Sample student answer: `"A"`
- Feedback: The column already contains A — A symbol can appear only once in each row and column, so A is eliminated from the target.
- Quick explanation: Compare the symbols missing from the target row and target column.
- Takeaway: A target value must satisfy both its row and its column at the same time.

### Steps

1. **Look at Row 1:** The target row is missing A, B, C, D, E.
2. **Check Column 4:** The target column is missing E.
3. **Compare Row 1 and Column 4:** Compare both lists: E remain valid in both.
4. **So, the ? cell is E:** Both row and column constraints force E at the target.

<details><summary>Internal metadata used</summary>

```json
{
  "deductionTrace": [
    {
      "coordinate": {
        "row": 0,
        "column": 1
      },
      "symbol": "D",
      "reason": "only_position_in_column",
      "axis": "column",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 1,
          "column": 3
        },
        {
          "row": 2,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "A",
        "D",
        "E"
      ],
      "eliminatedCandidates": [
        "B",
        "C"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 0,
        "column": 2
      },
      "symbol": "B",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 3,
          "column": 0
        },
        {
          "row": 4,
          "column": 1
        },
        {
          "row": 2,
          "column": 3
        },
        {
          "row": 1,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "A",
        "B",
        "C",
        "D"
      ],
      "eliminatedCandidates": [
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 0,
        "column": 3
      },
      "symbol": "E",
      "reason": "single_candidate",
      "axis": "column",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 3,
          "column": 3
        },
        {
          "row": 2,
          "column": 3
        },
        {
          "row": 4,
          "column": 3
        },
        {
          "row": 1,
          "column": 3
        }
      ],
      "candidatesBefore": [
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "D"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 1,
        "column": 0
      },
      "symbol": "C",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 3,
          "column": 1
        }
      ],
      "candidatesBefore": [
        "A",
        "C"
      ],
      "eliminatedCandidates": [
        "B",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 1,
        "column": 1
      },
      "symbol": "A",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 1,
          "column": 4
        },
        {
          "row": 4,
          "column": 1
        },
        {
          "row": 3,
          "column": 1
        },
        {
          "row": 1,
          "column": 3
        },
        {
          "row": 1,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "A"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 3,
        "column": 2
      },
      "symbol": "D",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 3,
          "column": 3
        },
        {
          "row": 3,
          "column": 0
        },
        {
          "row": 3,
          "column": 1
        },
        {
          "row": 1,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 3,
        "column": 4
      },
      "symbol": "E",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 1,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "D",
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 0,
        "column": 0
      },
      "symbol": "A",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 0,
          "column": 2
        },
        {
          "row": 1,
          "column": 0
        },
        {
          "row": 0,
          "column": 1
        },
        {
          "row": 0,
          "column": 3
        }
      ],
      "clueDependencies": [
        {
          "row": 3,
          "column": 0
        },
        {
          "row": 2,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "A"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "D",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 0,
        "column": 4
      },
      "symbol": "C",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [
        {
          "row": 1,
          "column": 0
        }
      ],
      "clueDependencies": [],
      "candidatesBefore": [
        "A",
        "C"
      ],
      "eliminatedCandidates": [
        "B",
        "D",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 2,
        "column": 1
      },
      "symbol": "E",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 1,
          "column": 1
        },
        {
          "row": 0,
          "column": 1
        }
      ],
      "clueDependencies": [
        {
          "row": 2,
          "column": 3
        },
        {
          "row": 4,
          "column": 1
        },
        {
          "row": 3,
          "column": 1
        },
        {
          "row": 2,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "D"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 2,
        "column": 2
      },
      "symbol": "C",
      "reason": "only_position_in_column",
      "axis": "column",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 4,
          "column": 3
        }
      ],
      "candidatesBefore": [
        "A",
        "C"
      ],
      "eliminatedCandidates": [
        "B",
        "D",
        "E"
      ],
      "round": 2,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 4,
        "column": 0
      },
      "symbol": "E",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [
        {
          "row": 3,
          "column": 4
        }
      ],
      "clueDependencies": [
        {
          "row": 1,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "A",
        "E"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "D"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 4,
        "column": 2
      },
      "symbol": "A",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 0,
          "column": 2
        },
        {
          "row": 3,
          "column": 2
        }
      ],
      "clueDependencies": [
        {
          "row": 4,
          "column": 1
        },
        {
          "row": 4,
          "column": 3
        },
        {
          "row": 1,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "A"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "D",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 4,
        "column": 4
      },
      "symbol": "D",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [
        {
          "row": 3,
          "column": 2
        }
      ],
      "clueDependencies": [
        {
          "row": 2,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "A",
        "D"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 2,
        "column": 4
      },
      "symbol": "A",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 2,
          "column": 2
        },
        {
          "row": 0,
          "column": 4
        },
        {
          "row": 4,
          "column": 4
        },
        {
          "row": 2,
          "column": 1
        },
        {
          "row": 3,
          "column": 4
        }
      ],
      "clueDependencies": [
        {
          "row": 2,
          "column": 3
        },
        {
          "row": 1,
          "column": 4
        },
        {
          "row": 2,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "A"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "D",
        "E"
      ],
      "round": 3,
      "depth": 3
    }
  ],
  "generatorVersion": "latin-squares@4.0.0"
}
```

</details>

## latin_square · medium · phase7-latin_square-medium-7

- Classification: causal_dependency_closure
- Correct answer: `"D"`
- Sample student answer: `"A"`
- Feedback: Follow the target's deduction path — Check the target row and column, then resolve only the highlighted dependency cells.
- Quick explanation: Resolve 4 required cells, then return to the target.
- Takeaway: If the target is not forced yet, solve only the cells that remove a target candidate.

### Steps

1. **Fill Row 2, Column 1:** At Row 2, Column 1, the verified candidates reduce to D; place it because the target depends on this cell.
2. **Fill Row 2, Column 4:** At Row 2, Column 4, the verified candidates reduce to E; place it because the target depends on this cell.
3. **Fill Row 5, Column 3:** At Row 5, Column 3, the verified candidates reduce to C; place it because the target depends on this cell.
4. **Fill Row 1, Column 2:** At Row 1, Column 2, the verified candidates reduce to E; place it because the target depends on this cell.
5. **Look at Row 4:** The target row is missing A, B, D.
6. **Check Column 4:** The target column is missing A, C, D.
7. **Compare Row 4 and Column 4:** Compare both lists: A, D remain valid in both.
8. **Find where D fits in Row 4:** The only valid position check forces D into the target.
9. **So, the ? cell is D:** Both row and column constraints force D at the target.

<details><summary>Internal metadata used</summary>

```json
{
  "deductionTrace": [
    {
      "coordinate": {
        "row": 0,
        "column": 3
      },
      "symbol": "C",
      "reason": "only_position_in_column",
      "axis": "column",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 1,
          "column": 4
        },
        {
          "row": 2,
          "column": 0
        },
        {
          "row": 3,
          "column": 1
        }
      ],
      "candidatesBefore": [
        "A",
        "C",
        "E"
      ],
      "eliminatedCandidates": [
        "B",
        "D"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 1,
        "column": 0
      },
      "symbol": "D",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 1,
          "column": 1
        },
        {
          "row": 1,
          "column": 2
        },
        {
          "row": 1,
          "column": 4
        },
        {
          "row": 2,
          "column": 0
        },
        {
          "row": 4,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 1,
        "column": 3
      },
      "symbol": "E",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 4,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "D",
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 2,
        "column": 4
      },
      "symbol": "E",
      "reason": "only_position_in_column",
      "axis": "column",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 3,
          "column": 2
        },
        {
          "row": 4,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "A",
        "B",
        "E"
      ],
      "eliminatedCandidates": [
        "C",
        "D"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 4,
        "column": 1
      },
      "symbol": "D",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 1,
          "column": 1
        },
        {
          "row": 4,
          "column": 3
        },
        {
          "row": 3,
          "column": 1
        },
        {
          "row": 4,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 4,
        "column": 2
      },
      "symbol": "C",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 3,
          "column": 1
        },
        {
          "row": 1,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "A",
        "C"
      ],
      "eliminatedCandidates": [
        "B",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 4,
        "column": 4
      },
      "symbol": "A",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 4,
          "column": 3
        },
        {
          "row": 1,
          "column": 4
        },
        {
          "row": 0,
          "column": 4
        },
        {
          "row": 4,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "A"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 0,
        "column": 1
      },
      "symbol": "E",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 4,
          "column": 0
        },
        {
          "row": 3,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "B",
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D"
      ],
      "round": 2,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 0,
        "column": 2
      },
      "symbol": "A",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 0,
          "column": 3
        },
        {
          "row": 4,
          "column": 2
        }
      ],
      "clueDependencies": [
        {
          "row": 1,
          "column": 2
        },
        {
          "row": 0,
          "column": 4
        },
        {
          "row": 2,
          "column": 2
        },
        {
          "row": 3,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "A"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "D",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 2,
        "column": 1
      },
      "symbol": "B",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 4,
          "column": 1
        },
        {
          "row": 2,
          "column": 4
        }
      ],
      "clueDependencies": [
        {
          "row": 1,
          "column": 1
        },
        {
          "row": 2,
          "column": 0
        },
        {
          "row": 3,
          "column": 1
        },
        {
          "row": 2,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "B"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 2,
        "column": 3
      },
      "symbol": "A",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 0,
          "column": 3
        },
        {
          "row": 2,
          "column": 4
        },
        {
          "row": 1,
          "column": 3
        }
      ],
      "clueDependencies": [
        {
          "row": 4,
          "column": 3
        },
        {
          "row": 2,
          "column": 0
        },
        {
          "row": 2,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "A"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "D",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 3,
        "column": 3
      },
      "symbol": "D",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [
        {
          "row": 1,
          "column": 0
        }
      ],
      "clueDependencies": [
        {
          "row": 0,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "A",
        "D"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 3,
        "column": 4
      },
      "symbol": "B",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 4,
          "column": 4
        },
        {
          "row": 2,
          "column": 4
        }
      ],
      "clueDependencies": [
        {
          "row": 3,
          "column": 1
        },
        {
          "row": 1,
          "column": 4
        },
        {
          "row": 0,
          "column": 4
        },
        {
          "row": 3,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "B"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 0,
        "column": 0
      },
      "symbol": "B",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 0,
          "column": 2
        },
        {
          "row": 0,
          "column": 3
        },
        {
          "row": 1,
          "column": 0
        },
        {
          "row": 0,
          "column": 1
        }
      ],
      "clueDependencies": [
        {
          "row": 2,
          "column": 0
        },
        {
          "row": 0,
          "column": 4
        },
        {
          "row": 4,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "B"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D",
        "E"
      ],
      "round": 3,
      "depth": 3
    },
    {
      "coordinate": {
        "row": 3,
        "column": 0
      },
      "symbol": "A",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 3,
          "column": 4
        },
        {
          "row": 3,
          "column": 3
        },
        {
          "row": 1,
          "column": 0
        }
      ],
      "clueDependencies": [
        {
          "row": 3,
          "column": 1
        },
        {
          "row": 2,
          "column": 0
        },
        {
          "row": 3,
          "column": 2
        },
        {
          "row": 4,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "A"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "D",
        "E"
      ],
      "round": 3,
      "depth": 3
    }
  ],
  "generatorVersion": "latin-squares@4.0.0"
}
```

</details>

## latin_square · hard · phase7-latin_square-hard-8

- Classification: causal_dependency_closure
- Correct answer: `"B"`
- Sample student answer: `"A"`
- Feedback: The row already contains A — A symbol can appear only once in each row and column, so A is eliminated from the target.
- Quick explanation: Resolve 2 required cells, then return to the target.
- Takeaway: If the target is not forced yet, solve only the cells that remove a target candidate.

### Steps

1. **Fill Row 3, Column 4:** At Row 3, Column 4, the verified candidates reduce to D; place it because the target depends on this cell.
2. **Fill Row 4, Column 3:** At Row 4, Column 3, the verified candidates reduce to E; place it because the target depends on this cell.
3. **Look at Row 3:** The target row is missing B, C, E.
4. **Check Column 3:** The target column is missing A, B, D.
5. **Compare Row 3 and Column 3:** Compare both lists: B remain valid in both.
6. **So, the ? cell is B:** Both row and column constraints force B at the target.

<details><summary>Internal metadata used</summary>

```json
{
  "deductionTrace": [
    {
      "coordinate": {
        "row": 0,
        "column": 1
      },
      "symbol": "B",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 0,
          "column": 3
        },
        {
          "row": 1,
          "column": 1
        },
        {
          "row": 0,
          "column": 0
        },
        {
          "row": 3,
          "column": 1
        },
        {
          "row": 4,
          "column": 1
        },
        {
          "row": 0,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "B"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 0,
        "column": 2
      },
      "symbol": "D",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 4,
          "column": 1
        }
      ],
      "candidatesBefore": [
        "B",
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 1,
        "column": 0
      },
      "symbol": "B",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 4,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "B",
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 1,
        "column": 4
      },
      "symbol": "D",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 1,
          "column": 1
        },
        {
          "row": 4,
          "column": 4
        },
        {
          "row": 1,
          "column": 2
        },
        {
          "row": 1,
          "column": 3
        },
        {
          "row": 0,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 2,
        "column": 1
      },
      "symbol": "E",
      "reason": "only_position_in_column",
      "axis": "column",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 0,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "B",
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 2,
        "column": 3
      },
      "symbol": "D",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 2,
          "column": 0
        },
        {
          "row": 0,
          "column": 3
        },
        {
          "row": 3,
          "column": 3
        },
        {
          "row": 4,
          "column": 3
        },
        {
          "row": 1,
          "column": 3
        }
      ],
      "candidatesBefore": [
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 2,
        "column": 4
      },
      "symbol": "C",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 3,
          "column": 1
        },
        {
          "row": 1,
          "column": 2
        },
        {
          "row": 4,
          "column": 3
        }
      ],
      "candidatesBefore": [
        "C",
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 3,
        "column": 0
      },
      "symbol": "D",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 2,
          "column": 0
        },
        {
          "row": 3,
          "column": 3
        },
        {
          "row": 3,
          "column": 1
        },
        {
          "row": 0,
          "column": 0
        },
        {
          "row": 4,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 3,
        "column": 2
      },
      "symbol": "E",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 4,
          "column": 0
        },
        {
          "row": 0,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "A",
        "D",
        "E"
      ],
      "eliminatedCandidates": [
        "B",
        "C"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 3,
        "column": 4
      },
      "symbol": "A",
      "reason": "only_position_in_column",
      "axis": "column",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 1,
          "column": 1
        },
        {
          "row": 2,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "A",
        "D"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 4,
        "column": 2
      },
      "symbol": "A",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 4,
          "column": 4
        },
        {
          "row": 4,
          "column": 3
        },
        {
          "row": 1,
          "column": 2
        },
        {
          "row": 4,
          "column": 1
        },
        {
          "row": 4,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "A"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 2,
        "column": 2
      },
      "symbol": "B",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 4,
          "column": 2
        },
        {
          "row": 2,
          "column": 4
        },
        {
          "row": 2,
          "column": 3
        },
        {
          "row": 0,
          "column": 2
        },
        {
          "row": 2,
          "column": 1
        },
        {
          "row": 3,
          "column": 2
        }
      ],
      "clueDependencies": [
        {
          "row": 2,
          "column": 0
        },
        {
          "row": 1,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "B"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D",
        "E"
      ],
      "round": 2,
      "depth": 2
    }
  ],
  "generatorVersion": "latin-squares@4.0.0"
}
```

</details>

## latin_square · easy · phase7-latin_square-easy-9

- Classification: row_column_intersection
- Correct answer: `"E"`
- Sample student answer: `"A"`
- Feedback: The row already contains A — A symbol can appear only once in each row and column, so A is eliminated from the target.
- Quick explanation: Compare the symbols missing from the target row and target column.
- Takeaway: A target value must satisfy both its row and its column at the same time.

### Steps

1. **Look at Row 1:** The target row is missing E.
2. **Check Column 4:** The target column is missing A, B, C, D, E.
3. **Compare Row 1 and Column 4:** Compare both lists: E remain valid in both.
4. **So, the ? cell is E:** Both row and column constraints force E at the target.

<details><summary>Internal metadata used</summary>

```json
{
  "deductionTrace": [
    {
      "coordinate": {
        "row": 0,
        "column": 3
      },
      "symbol": "E",
      "reason": "single_candidate",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 0,
          "column": 4
        },
        {
          "row": 0,
          "column": 0
        },
        {
          "row": 0,
          "column": 2
        },
        {
          "row": 0,
          "column": 1
        }
      ],
      "candidatesBefore": [
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "D"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 3,
        "column": 2
      },
      "symbol": "E",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 3,
          "column": 1
        },
        {
          "row": 4,
          "column": 2
        },
        {
          "row": 1,
          "column": 2
        },
        {
          "row": 0,
          "column": 2
        },
        {
          "row": 2,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "D"
      ],
      "round": 1,
      "depth": 1
    }
  ],
  "generatorVersion": "latin-squares@4.0.0"
}
```

</details>

## latin_square · medium · phase7-latin_square-medium-10

- Classification: causal_dependency_closure
- Correct answer: `"B"`
- Sample student answer: `"A"`
- Feedback: A is removed by the deduction path — The target's first row-and-column check is not enough; resolve the highlighted dependency cells, then A is eliminated.
- Quick explanation: Resolve 4 required cells, then return to the target.
- Takeaway: If the target is not forced yet, solve only the cells that remove a target candidate.

### Steps

1. **Fill Row 1, Column 3:** At Row 1, Column 3, the verified candidates reduce to B; place it because the target depends on this cell.
2. **Fill Row 3, Column 5:** At Row 3, Column 5, the verified candidates reduce to E; place it because the target depends on this cell.
3. **Fill Row 4, Column 1:** At Row 4, Column 1, the verified candidates reduce to C; place it because the target depends on this cell.
4. **Fill Row 4, Column 2:** At Row 4, Column 2, the verified candidates reduce to A; place it because the target depends on this cell.
5. **Look at Row 4:** The target row is missing B, D.
6. **Check Column 5:** The target column is missing A, B, C.
7. **Compare Row 4 and Column 5:** Compare both lists: B remain valid in both.
8. **So, the ? cell is B:** Both row and column constraints force B at the target.

<details><summary>Internal metadata used</summary>

```json
{
  "deductionTrace": [
    {
      "coordinate": {
        "row": 0,
        "column": 2
      },
      "symbol": "B",
      "reason": "only_position_in_column",
      "axis": "column",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 2,
          "column": 1
        }
      ],
      "candidatesBefore": [
        "B",
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 1,
        "column": 4
      },
      "symbol": "C",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 1,
          "column": 2
        },
        {
          "row": 1,
          "column": 3
        },
        {
          "row": 1,
          "column": 1
        },
        {
          "row": 4,
          "column": 4
        },
        {
          "row": 1,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "C"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 2,
        "column": 2
      },
      "symbol": "D",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 2,
          "column": 0
        },
        {
          "row": 1,
          "column": 2
        },
        {
          "row": 2,
          "column": 1
        },
        {
          "row": 2,
          "column": 3
        },
        {
          "row": 4,
          "column": 2
        },
        {
          "row": 3,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 2,
        "column": 4
      },
      "symbol": "E",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 2,
          "column": 0
        },
        {
          "row": 2,
          "column": 1
        },
        {
          "row": 2,
          "column": 3
        },
        {
          "row": 4,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "D"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 3,
        "column": 0
      },
      "symbol": "C",
      "reason": "only_position_in_column",
      "axis": "column",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 0,
          "column": 1
        },
        {
          "row": 4,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "B",
        "C",
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 3,
        "column": 1
      },
      "symbol": "A",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 2,
          "column": 1
        },
        {
          "row": 0,
          "column": 1
        },
        {
          "row": 1,
          "column": 1
        },
        {
          "row": 3,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "A"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 4,
        "column": 0
      },
      "symbol": "B",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 2,
          "column": 0
        },
        {
          "row": 4,
          "column": 2
        },
        {
          "row": 4,
          "column": 4
        },
        {
          "row": 1,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "B"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 4,
        "column": 1
      },
      "symbol": "E",
      "reason": "only_position_in_column",
      "axis": "column",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 3,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "A",
        "E"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "D"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 0,
        "column": 0
      },
      "symbol": "D",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 0,
          "column": 2
        },
        {
          "row": 4,
          "column": 0
        },
        {
          "row": 3,
          "column": 0
        }
      ],
      "clueDependencies": [
        {
          "row": 2,
          "column": 0
        },
        {
          "row": 0,
          "column": 1
        },
        {
          "row": 1,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 0,
        "column": 3
      },
      "symbol": "E",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [
        {
          "row": 2,
          "column": 4
        }
      ],
      "clueDependencies": [
        {
          "row": 1,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "A",
        "D",
        "E"
      ],
      "eliminatedCandidates": [
        "B",
        "C"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 0,
        "column": 4
      },
      "symbol": "A",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 0,
          "column": 2
        },
        {
          "row": 1,
          "column": 4
        },
        {
          "row": 2,
          "column": 4
        }
      ],
      "clueDependencies": [
        {
          "row": 0,
          "column": 1
        },
        {
          "row": 4,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "A"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "D",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 3,
        "column": 3
      },
      "symbol": "D",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 3,
          "column": 1
        },
        {
          "row": 3,
          "column": 0
        }
      ],
      "clueDependencies": [
        {
          "row": 1,
          "column": 3
        },
        {
          "row": 2,
          "column": 3
        },
        {
          "row": 3,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 3,
        "column": 4
      },
      "symbol": "B",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 3,
          "column": 1
        },
        {
          "row": 3,
          "column": 0
        },
        {
          "row": 1,
          "column": 4
        },
        {
          "row": 2,
          "column": 4
        }
      ],
      "clueDependencies": [
        {
          "row": 4,
          "column": 4
        },
        {
          "row": 3,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "B"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 4,
        "column": 3
      },
      "symbol": "A",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 4,
          "column": 0
        },
        {
          "row": 4,
          "column": 1
        }
      ],
      "clueDependencies": [
        {
          "row": 1,
          "column": 3
        },
        {
          "row": 4,
          "column": 2
        },
        {
          "row": 2,
          "column": 3
        },
        {
          "row": 4,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "A"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "D",
        "E"
      ],
      "round": 2,
      "depth": 2
    }
  ],
  "generatorVersion": "latin-squares@4.0.0"
}
```

</details>

## latin_square · hard · phase7-latin_square-hard-11

- Classification: causal_dependency_closure
- Correct answer: `"C"`
- Sample student answer: `"A"`
- Feedback: A is removed by the deduction path — The target's first row-and-column check is not enough; resolve the highlighted dependency cells, then A is eliminated.
- Quick explanation: Resolve 6 required cells, then return to the target.
- Takeaway: If the target is not forced yet, solve only the cells that remove a target candidate.

### Steps

1. **Fill Row 1, Column 2:** At Row 1, Column 2, the verified candidates reduce to A; place it because the target depends on this cell.
2. **Fill Row 3, Column 1:** At Row 3, Column 1, the verified candidates reduce to B; place it because the target depends on this cell.
3. **Fill Row 4, Column 2:** At Row 4, Column 2, the verified candidates reduce to B; place it because the target depends on this cell.
4. **Fill Row 4, Column 5:** At Row 4, Column 5, the verified candidates reduce to C; place it because the target depends on this cell.
5. **Fill Row 4, Column 1:** At Row 4, Column 1, the verified candidates reduce to E; place it because the target depends on this cell.
6. **Fill Row 5, Column 1:** At Row 5, Column 1, the verified candidates reduce to D; place it because the target depends on this cell.
7. **Look at Row 1:** The target row is missing C, D, E.
8. **Check Column 1:** The target column is missing A, C.
9. **Compare Row 1 and Column 1:** Compare both lists: C remain valid in both.
10. **So, the ? cell is C:** Both row and column constraints force C at the target.

<details><summary>Internal metadata used</summary>

```json
{
  "deductionTrace": [
    {
      "coordinate": {
        "row": 0,
        "column": 1
      },
      "symbol": "A",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 0,
          "column": 4
        },
        {
          "row": 4,
          "column": 1
        },
        {
          "row": 2,
          "column": 1
        },
        {
          "row": 1,
          "column": 1
        }
      ],
      "candidatesBefore": [
        "A"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 0,
        "column": 3
      },
      "symbol": "E",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 4,
          "column": 3
        },
        {
          "row": 0,
          "column": 4
        },
        {
          "row": 2,
          "column": 3
        },
        {
          "row": 3,
          "column": 3
        }
      ],
      "candidatesBefore": [
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "D"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 1,
        "column": 3
      },
      "symbol": "B",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 4,
          "column": 3
        },
        {
          "row": 2,
          "column": 3
        },
        {
          "row": 1,
          "column": 4
        },
        {
          "row": 3,
          "column": 3
        },
        {
          "row": 1,
          "column": 1
        }
      ],
      "candidatesBefore": [
        "B"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 2,
        "column": 0
      },
      "symbol": "B",
      "reason": "single_candidate",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 2,
          "column": 4
        },
        {
          "row": 2,
          "column": 3
        },
        {
          "row": 2,
          "column": 1
        },
        {
          "row": 2,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "B"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 3,
        "column": 1
      },
      "symbol": "B",
      "reason": "only_position_in_column",
      "axis": "column",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 0,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "A",
        "B"
      ],
      "eliminatedCandidates": [
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 3,
        "column": 4
      },
      "symbol": "C",
      "reason": "only_position_in_column",
      "axis": "column",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 4,
          "column": 1
        }
      ],
      "candidatesBefore": [
        "C",
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "D"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 4,
        "column": 4
      },
      "symbol": "E",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 4,
          "column": 3
        },
        {
          "row": 2,
          "column": 4
        },
        {
          "row": 0,
          "column": 4
        },
        {
          "row": 4,
          "column": 1
        },
        {
          "row": 1,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "D"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 3,
        "column": 0
      },
      "symbol": "E",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 2,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "A",
        "E"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "D"
      ],
      "round": 2,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 3,
        "column": 2
      },
      "symbol": "A",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 3,
          "column": 1
        },
        {
          "row": 3,
          "column": 4
        }
      ],
      "clueDependencies": [
        {
          "row": 3,
          "column": 3
        },
        {
          "row": 2,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "A"
      ],
      "eliminatedCandidates": [
        "B",
        "C",
        "D",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 4,
        "column": 0
      },
      "symbol": "D",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 2,
          "column": 0
        },
        {
          "row": 4,
          "column": 4
        }
      ],
      "clueDependencies": [
        {
          "row": 4,
          "column": 3
        },
        {
          "row": 4,
          "column": 1
        }
      ],
      "candidatesBefore": [
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 4,
        "column": 2
      },
      "symbol": "B",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [
        {
          "row": 2,
          "column": 0
        }
      ],
      "clueDependencies": [],
      "candidatesBefore": [
        "B",
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 0,
        "column": 0
      },
      "symbol": "C",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 0,
          "column": 1
        },
        {
          "row": 2,
          "column": 0
        },
        {
          "row": 4,
          "column": 0
        },
        {
          "row": 0,
          "column": 3
        },
        {
          "row": 3,
          "column": 0
        }
      ],
      "clueDependencies": [
        {
          "row": 0,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "C"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "D",
        "E"
      ],
      "round": 3,
      "depth": 3
    },
    {
      "coordinate": {
        "row": 0,
        "column": 2
      },
      "symbol": "D",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [
        {
          "row": 4,
          "column": 0
        }
      ],
      "clueDependencies": [],
      "candidatesBefore": [
        "C",
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "E"
      ],
      "round": 3,
      "depth": 3
    },
    {
      "coordinate": {
        "row": 1,
        "column": 0
      },
      "symbol": "A",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [
        {
          "row": 3,
          "column": 2
        }
      ],
      "clueDependencies": [],
      "candidatesBefore": [
        "A",
        "C"
      ],
      "eliminatedCandidates": [
        "B",
        "D",
        "E"
      ],
      "round": 3,
      "depth": 3
    },
    {
      "coordinate": {
        "row": 1,
        "column": 2
      },
      "symbol": "C",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 3,
          "column": 2
        },
        {
          "row": 1,
          "column": 3
        },
        {
          "row": 4,
          "column": 2
        }
      ],
      "clueDependencies": [
        {
          "row": 1,
          "column": 4
        },
        {
          "row": 1,
          "column": 1
        },
        {
          "row": 2,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "C"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "D",
        "E"
      ],
      "round": 3,
      "depth": 3
    }
  ],
  "generatorVersion": "latin-squares@4.0.0"
}
```

</details>

## latin_square · easy · phase7-latin_square-easy-12

- Classification: row_column_intersection
- Correct answer: `"E"`
- Sample student answer: `"A"`
- Feedback: The row already contains A — A symbol can appear only once in each row and column, so A is eliminated from the target.
- Quick explanation: Compare the symbols missing from the target row and target column.
- Takeaway: A target value must satisfy both its row and its column at the same time.

### Steps

1. **Look at Row 1:** The target row is missing E.
2. **Check Column 2:** The target column is missing A, B, C, D, E.
3. **Compare Row 1 and Column 2:** Compare both lists: E remain valid in both.
4. **So, the ? cell is E:** Both row and column constraints force E at the target.

<details><summary>Internal metadata used</summary>

```json
{
  "deductionTrace": [
    {
      "coordinate": {
        "row": 0,
        "column": 1
      },
      "symbol": "E",
      "reason": "single_candidate",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 0,
          "column": 0
        },
        {
          "row": 0,
          "column": 4
        },
        {
          "row": 0,
          "column": 3
        },
        {
          "row": 0,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "D"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 2,
        "column": 2
      },
      "symbol": "C",
      "reason": "only_position_in_column",
      "axis": "column",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 3,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "B",
        "C"
      ],
      "eliminatedCandidates": [
        "A",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 3,
        "column": 1
      },
      "symbol": "D",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 0,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "B",
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 3,
        "column": 2
      },
      "symbol": "B",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 3,
          "column": 3
        },
        {
          "row": 1,
          "column": 2
        },
        {
          "row": 3,
          "column": 4
        },
        {
          "row": 0,
          "column": 2
        },
        {
          "row": 3,
          "column": 0
        },
        {
          "row": 4,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "B"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    }
  ],
  "generatorVersion": "latin-squares@4.0.0"
}
```

</details>

## latin_square · medium · phase7-latin_square-medium-13

- Classification: causal_dependency_closure
- Correct answer: `"E"`
- Sample student answer: `"A"`
- Feedback: The row already contains A — A symbol can appear only once in each row and column, so A is eliminated from the target.
- Quick explanation: Resolve 2 required cells, then return to the target.
- Takeaway: If the target is not forced yet, solve only the cells that remove a target candidate.

### Steps

1. **Fill Row 1, Column 4:** At Row 1, Column 4, the verified candidates reduce to E; place it because the target depends on this cell.
2. **Fill Row 5, Column 3:** At Row 5, Column 3, the verified candidates reduce to B; place it because the target depends on this cell.
3. **Look at Row 3:** The target row is missing B, D, E.
4. **Check Column 3:** The target column is missing A, C, E.
5. **Compare Row 3 and Column 3:** Compare both lists: E remain valid in both.
6. **So, the ? cell is E:** Both row and column constraints force E at the target.

<details><summary>Internal metadata used</summary>

```json
{
  "deductionTrace": [
    {
      "coordinate": {
        "row": 0,
        "column": 1
      },
      "symbol": "B",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 1,
          "column": 1
        },
        {
          "row": 2,
          "column": 1
        },
        {
          "row": 0,
          "column": 0
        },
        {
          "row": 3,
          "column": 1
        },
        {
          "row": 4,
          "column": 1
        }
      ],
      "candidatesBefore": [
        "B"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 0,
        "column": 2
      },
      "symbol": "A",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 1,
          "column": 1
        },
        {
          "row": 3,
          "column": 3
        },
        {
          "row": 2,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "A",
        "B",
        "C",
        "E"
      ],
      "eliminatedCandidates": [
        "D"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 0,
        "column": 3
      },
      "symbol": "E",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 3,
          "column": 3
        },
        {
          "row": 1,
          "column": 3
        },
        {
          "row": 4,
          "column": 3
        },
        {
          "row": 0,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "D"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 2,
        "column": 0
      },
      "symbol": "B",
      "reason": "only_position_in_column",
      "axis": "column",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 1,
          "column": 3
        },
        {
          "row": 3,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "B",
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 2,
        "column": 3
      },
      "symbol": "D",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 0,
          "column": 0
        },
        {
          "row": 1,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "D",
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 4,
        "column": 2
      },
      "symbol": "B",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 4,
          "column": 0
        },
        {
          "row": 4,
          "column": 3
        },
        {
          "row": 1,
          "column": 2
        },
        {
          "row": 4,
          "column": 1
        }
      ],
      "candidatesBefore": [
        "B"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 4,
        "column": 4
      },
      "symbol": "D",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 4,
          "column": 0
        },
        {
          "row": 2,
          "column": 4
        },
        {
          "row": 3,
          "column": 4
        },
        {
          "row": 4,
          "column": 3
        },
        {
          "row": 4,
          "column": 1
        }
      ],
      "candidatesBefore": [
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 0,
        "column": 4
      },
      "symbol": "C",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 0,
          "column": 2
        },
        {
          "row": 0,
          "column": 1
        },
        {
          "row": 4,
          "column": 4
        },
        {
          "row": 0,
          "column": 3
        }
      ],
      "clueDependencies": [
        {
          "row": 2,
          "column": 4
        },
        {
          "row": 3,
          "column": 4
        },
        {
          "row": 0,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "C"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "D",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 1,
        "column": 4
      },
      "symbol": "E",
      "reason": "only_position_in_column",
      "axis": "column",
      "dependencies": [
        {
          "row": 0,
          "column": 3
        }
      ],
      "clueDependencies": [],
      "candidatesBefore": [
        "C",
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "D"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 2,
        "column": 2
      },
      "symbol": "E",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 0,
          "column": 2
        },
        {
          "row": 2,
          "column": 0
        },
        {
          "row": 4,
          "column": 2
        },
        {
          "row": 2,
          "column": 3
        }
      ],
      "clueDependencies": [
        {
          "row": 2,
          "column": 4
        },
        {
          "row": 2,
          "column": 1
        },
        {
          "row": 1,
          "column": 2
        }
      ],
      "candidatesBefore": [
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "D"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 3,
        "column": 2
      },
      "symbol": "C",
      "reason": "only_position_in_column",
      "axis": "column",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 2,
          "column": 1
        }
      ],
      "candidatesBefore": [
        "C",
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "D"
      ],
      "round": 2,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 1,
        "column": 0
      },
      "symbol": "C",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 2,
          "column": 0
        },
        {
          "row": 1,
          "column": 4
        }
      ],
      "clueDependencies": [
        {
          "row": 1,
          "column": 1
        },
        {
          "row": 4,
          "column": 0
        },
        {
          "row": 1,
          "column": 3
        },
        {
          "row": 1,
          "column": 2
        },
        {
          "row": 0,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "C"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "D",
        "E"
      ],
      "round": 3,
      "depth": 3
    },
    {
      "coordinate": {
        "row": 3,
        "column": 0
      },
      "symbol": "E",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 2,
          "column": 0
        },
        {
          "row": 3,
          "column": 2
        }
      ],
      "clueDependencies": [
        {
          "row": 3,
          "column": 3
        },
        {
          "row": 4,
          "column": 0
        },
        {
          "row": 3,
          "column": 4
        },
        {
          "row": 3,
          "column": 1
        },
        {
          "row": 0,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "C",
        "D"
      ],
      "round": 3,
      "depth": 2
    }
  ],
  "generatorVersion": "latin-squares@4.0.0"
}
```

</details>

## latin_square · hard · phase7-latin_square-hard-14

- Classification: causal_dependency_closure
- Correct answer: `"C"`
- Sample student answer: `"A"`
- Feedback: The column already contains A — A symbol can appear only once in each row and column, so A is eliminated from the target.
- Quick explanation: Resolve 4 required cells, then return to the target.
- Takeaway: If the target is not forced yet, solve only the cells that remove a target candidate.

### Steps

1. **Fill Row 2, Column 1:** At Row 2, Column 1, the verified candidates reduce to C; place it because the target depends on this cell.
2. **Fill Row 5, Column 3:** At Row 5, Column 3, the verified candidates reduce to A; place it because the target depends on this cell.
3. **Fill Row 5, Column 4:** At Row 5, Column 4, the verified candidates reduce to D; place it because the target depends on this cell.
4. **Fill Row 5, Column 1:** At Row 5, Column 1, the verified candidates reduce to B; place it because the target depends on this cell.
5. **Look at Row 5:** The target row is missing C.
6. **Check Column 2:** The target column is missing B, C, D, E.
7. **Compare Row 5 and Column 2:** Compare both lists: C remain valid in both.
8. **So, the ? cell is C:** Both row and column constraints force C at the target.

<details><summary>Internal metadata used</summary>

```json
{
  "deductionTrace": [
    {
      "coordinate": {
        "row": 0,
        "column": 1
      },
      "symbol": "B",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 0,
          "column": 4
        },
        {
          "row": 1,
          "column": 1
        },
        {
          "row": 0,
          "column": 2
        },
        {
          "row": 0,
          "column": 0
        },
        {
          "row": 0,
          "column": 3
        }
      ],
      "candidatesBefore": [
        "B"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 1,
        "column": 0
      },
      "symbol": "C",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 0,
          "column": 2
        },
        {
          "row": 2,
          "column": 3
        }
      ],
      "candidatesBefore": [
        "B",
        "C"
      ],
      "eliminatedCandidates": [
        "A",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 1,
        "column": 2
      },
      "symbol": "E",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 3,
          "column": 0
        },
        {
          "row": 0,
          "column": 3
        }
      ],
      "candidatesBefore": [
        "B",
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 1,
        "column": 3
      },
      "symbol": "B",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 1,
          "column": 1
        },
        {
          "row": 3,
          "column": 3
        },
        {
          "row": 2,
          "column": 3
        },
        {
          "row": 1,
          "column": 4
        },
        {
          "row": 0,
          "column": 3
        }
      ],
      "candidatesBefore": [
        "B"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 2,
        "column": 0
      },
      "symbol": "A",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 1,
          "column": 1
        },
        {
          "row": 0,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "A",
        "B"
      ],
      "eliminatedCandidates": [
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 2,
        "column": 1
      },
      "symbol": "E",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 3,
          "column": 0
        },
        {
          "row": 4,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "B",
        "E"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 2,
        "column": 4
      },
      "symbol": "B",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 0,
          "column": 4
        },
        {
          "row": 2,
          "column": 3
        },
        {
          "row": 2,
          "column": 2
        },
        {
          "row": 1,
          "column": 4
        },
        {
          "row": 4,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "B"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 3,
        "column": 1
      },
      "symbol": "D",
      "reason": "only_position_in_row",
      "axis": "row",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 2,
          "column": 2
        },
        {
          "row": 1,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "B",
        "C",
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 3,
        "column": 2
      },
      "symbol": "B",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 3,
          "column": 3
        },
        {
          "row": 0,
          "column": 2
        },
        {
          "row": 2,
          "column": 2
        },
        {
          "row": 3,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "B"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 3,
        "column": 4
      },
      "symbol": "C",
      "reason": "only_position_in_column",
      "axis": "column",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 2,
          "column": 3
        }
      ],
      "candidatesBefore": [
        "B",
        "C"
      ],
      "eliminatedCandidates": [
        "A",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 4,
        "column": 2
      },
      "symbol": "A",
      "reason": "only_position_in_column",
      "axis": "column",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 1,
          "column": 1
        },
        {
          "row": 3,
          "column": 3
        }
      ],
      "candidatesBefore": [
        "A",
        "B"
      ],
      "eliminatedCandidates": [
        "C",
        "D",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 4,
        "column": 3
      },
      "symbol": "D",
      "reason": "only_position_in_column",
      "axis": "column",
      "dependencies": [],
      "clueDependencies": [
        {
          "row": 1,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "B",
        "D"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "E"
      ],
      "round": 1,
      "depth": 1
    },
    {
      "coordinate": {
        "row": 4,
        "column": 0
      },
      "symbol": "B",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 4,
          "column": 2
        },
        {
          "row": 2,
          "column": 0
        },
        {
          "row": 1,
          "column": 0
        },
        {
          "row": 4,
          "column": 3
        }
      ],
      "clueDependencies": [
        {
          "row": 0,
          "column": 0
        },
        {
          "row": 4,
          "column": 4
        },
        {
          "row": 3,
          "column": 0
        }
      ],
      "candidatesBefore": [
        "B"
      ],
      "eliminatedCandidates": [
        "A",
        "C",
        "D",
        "E"
      ],
      "round": 2,
      "depth": 2
    },
    {
      "coordinate": {
        "row": 4,
        "column": 1
      },
      "symbol": "C",
      "reason": "single_candidate",
      "axis": "both",
      "dependencies": [
        {
          "row": 4,
          "column": 2
        },
        {
          "row": 0,
          "column": 1
        },
        {
          "row": 4,
          "column": 3
        },
        {
          "row": 3,
          "column": 1
        },
        {
          "row": 2,
          "column": 1
        }
      ],
      "clueDependencies": [
        {
          "row": 1,
          "column": 1
        },
        {
          "row": 4,
          "column": 4
        }
      ],
      "candidatesBefore": [
        "C"
      ],
      "eliminatedCandidates": [
        "A",
        "B",
        "D",
        "E"
      ],
      "round": 2,
      "depth": 2
    }
  ],
  "generatorVersion": "latin-squares@4.0.0"
}
```

</details>
