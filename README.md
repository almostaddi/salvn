# Task File Structure

This document explains how to create task files for the Snakes and Ladders game.

## Task File Location

Tasks are organized by set and toy:
```
js/tasks/
├── dressup/
│   ├── pegs_standard.js
│   ├── pegs_add.js
│   ├── pegs_remove.js
│   └── ...
├── apple/
├── digging/
├── teaseanddenial/
├── snakeandladders/
│   ├── snake_conditional.js
│   └── ladder_fallback.js
├── finaltasks/
│   ├── stroking.js
│   ├── vibe.js
│   └── anal.js
└── shared/
    └── general_fallback.js
```

## Basic Task Structure

```javascript
export default {
    // Required metadata
    id: 'unique_task_id',
    setId: 'dressup',  // Which instruction set
    toyId: 'pegs',     // Which toy
    type: 'standard',  // Task type (see below)
    
    // Optional properties
    baseWeight: 1,              // Selection weight (default 1)
    excludeFromNormalPool: false, // If true, only via alwaysSelect
    onlyOnce: false,            // Only trigger once per game
    
    // Optional: Condition check
    canSelect: (conditions) => {
        return true; // Return true if available
    },
    
    // Optional: Force selection
    alwaysSelect: (conditions) => {
        return false; // Return true to force this task
    },
    
    // Optional: Execute on display
    execute: function() {
        // Modify game state here
        return true;
    },
    
    // Required: Generate HTML
    getDifficulty: (difficulty, conditions, difficultyMap, extraContext) => {
        return '<strong>Task Title</strong><p>Task description.</p>';
    }
};
```

## Task Types

### 1. Standard Tasks
Regular gameplay tasks with difficulty scaling.

**Example:** `task_example_standard.js`

```javascript
export default {
    id: 'pegs_standard_1',
    setId: 'dressup',
    toyId: 'pegs',
    type: 'standard',
    
    getDifficulty: (difficulty, conditions, difficultyMap) => {
        const pegCount = difficulty === 'easy' ? 3 : 
                        difficulty === 'hard' ? 8 : 5;
        return `<strong>Task</strong><p>Apply ${pegCount} clothespegs.</p>`;
    }
};
```

### 2. Add Tasks
Place toys on body parts.

**Example:** `task_example_add.js`

```javascript
export default {
    id: 'pegs_add_ba',
    setId: 'dressup',
    toyId: 'pegs',
    type: 'add',
    bodyPart: 'Ba',
    
    quantity: (difficulty) => {
        return difficulty === 'easy' ? 3 : 
               difficulty === 'hard' ? 8 : 5;
    },
    
    execute: function() {
        const quantity = this.quantity(/* difficulty */);
        for (let i = 0; i < quantity; i++) {
            if (!window.addToyToBodyPart(this.bodyPart, this.toyId)) {
                return false;
            }
        }
        return true;
    },
    
    getHTML: function() {
        return `<strong>📥 Pick Up</strong><p>Place pegs on Ba.</p>`;
    }
};
```

### 3. Remove Tasks
Take toys off body parts.

**Example:** `task_example_remove.js`

```javascript
export default {
    id: 'pegs_remove_ba',
    setId: 'dressup',
    toyId: 'pegs',
    type: 'remove',
    bodyPart: 'Ba',
    
    quantity: (difficulty) => {
        return difficulty === 'easy' ? 3 : 
               difficulty === 'hard' ? 8 : 5;
    },
    
    execute: function() {
        const quantity = this.quantity(/* difficulty */);
        for (let i = 0; i < quantity; i++) {
            if (!window.removeToyFromBodyPart(this.bodyPart, this.toyId)) {
                return false;
            }
        }
        return true;
    },
    
    getHTML: function() {
        return `<strong>📤 Put Down</strong><p>Remove pegs from Ba.</p>`;
    }
};
```

### 4. Always Tasks
Forced when conditions are met.

**Example:** `task_example_always.js`

```javascript
export default {
    id: 'cage_always',
    setId: 'teaseanddenial',
    toyId: 'cage',
    type: 'standard',
    
    alwaysSelect: (conditions) => {
        // Force this task when specific condition is met
        return conditions.getTurnCountForToy('teaseanddenial_hand') >= 2;
    },
    
    excludeFromNormalPool: true,  // Don't randomly select
    onlyOnce: true,                // Only trigger once
    
    execute: function() {
        return window.addToyToBodyPart('Pe', 'cage');
    },
    
    getDifficulty: (difficulty, conditions) => {
        return '<strong>🔒 Special!</strong><p>Put on the cage!</p>';
    }
};
```

### 5. Snake/Ladder Tasks
Special tasks for snakes and ladders.

**Example:** `task_example_snake.js`

```javascript
export default {
    id: 'snake_vibe',
    type: 'snake',
    
    canSelect: (conditions) => {
        return conditions.hasSet('teaseanddenial') && 
               !conditions.isHolding('vibe');
    },
    
    getDifficulty: (difficulty, conditions, difficultyMap, snakeLadderInfo) => {
        const distance = Math.abs(snakeLadderInfo.distance);
        return `<strong>Snake! 🐍</strong><p>You fell ${distance} spaces!</p>`;
    }
};
```

### 6. Final Challenge Tasks
End-game challenges with prizes.

**Example:** `task_example_final.js`

```javascript
export default {
    id: 'stroking',
    type: 'final',
    
    getDifficulty: (difficulty, conditions, difficultyMap, prizeType) => {
        // prizeType is 'full', 'ruin', or 'none'
        return `
            <strong>🏆 Final Challenge!</strong>
            <p>Complete the challenge.</p>
            <button onclick="revealFinalPrize('stroking', '${prizeType}')">
                Complete
            </button>
        `;
    }
};
```

## Conditions Object

The `conditions` parameter provides access to game state:

```javascript
// Player info
conditions.name              // Player name
conditions.playerPosition    // Current board position
conditions.turnCount         // Total turns

// Turn tracking
conditions.getTurnCountForSet('dressup')           // Turns for set
conditions.getTurnCountForToy('dressup_pegs')      // Turns for toy
conditions.getLastSelectedSet('pegs')              // Last set used

// Set/toy checks
conditions.hasSet('dressup')                       // Is set selected?
conditions.toyChecked('pegs')                      // Is toy checked?
conditions.toySetEnabled('dressup_pegs')           // Is set-toy enabled?
conditions.toyQuantity('dressup_pegs')             // Toy quantity

// Body part checks
conditions.isHolding('pegs')                       // Holding toy?
conditions.getBodyPartsHolding('pegs')             // Which body parts?
conditions.countToy('pegs')                        // Total count
conditions.countToyInBodyPart('pegs', 'Ba')        // Count in part
conditions.bodyPartEmpty('Ba')                     // Is empty?
conditions.bodyPartHas('Ba', 'pegs')               // Has toy?
conditions.canBodyPartHold('Ba', 'pegs')           // Can hold?

// Utility
conditions.randomChance(50)                        // 50% chance
conditions.getFlag('custom_flag')                  // Custom flag
```

## Difficulty Map

The `difficultyMap` parameter contains all toy difficulties:

```javascript
{
    'pegs': 'easy',
    'silly_shirt': 'medium',
    'stick_a': 'hard',
    // ... all other toys
}
```

## Helper Function

Use `window.getDifficultyValue()` for easy value selection:

```javascript
const count = window.getDifficultyValue(
    difficulty,
    3,  // easy
    5,  // medium
    8   // hard
);
```

## Manifest File

Tasks must be registered in `tasks/manifest.json`:

```json
{
    "dressup": [
        "tasks/dressup/pegs_standard.js",
        "tasks/dressup/pegs_add.js",
        "tasks/dressup/pegs_remove.js"
    ],
    "apple": [
        "tasks/apple/stick_a.js"
    ],
    "snakeandladders": [
        "tasks/snakeandladders/snake_conditional.js",
        "tasks/snakeandladders/ladder_fallback.js"
    ],
    "final": [
        "tasks/finaltasks/stroking.js",
        "tasks/finaltasks/vibe.js",
        "tasks/finaltasks/anal.js"
    ],
    "_shared": [
        "tasks/shared/general_fallback.js"
    ]
}
```

## Best Practices

1. **Always provide testing notes** in task HTML for debugging
2. **Use semantic HTML** for better styling
3. **Check conditions thoroughly** to avoid impossible tasks
4. **Provide fallback tasks** for each snake/ladder type
5. **Test difficulty scaling** at all three levels
6. **Use images** with consistent placeholder patterns
7. **Document complex conditions** in comments

## Example Task Files

- `task_example_standard.js` - Basic task
- `task_example_add.js` - Add task
- `task_example_remove.js` - Remove task
- `task_example_always.js` - Forced task
- `task_example_snake.js` - Snake task
- `task_example_final.js` - Final challenge
