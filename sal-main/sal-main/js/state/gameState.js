// Game state management and persistence

import { getClothesPegMax } from '../data/instructionSets.js';

// Initialize game state
export function initializeState() {
    window.GAME_STATE = {
        gameStarted: false,
        gamePhase: 'awaiting_dice_roll',
        playerPosition: 0,
        turnCount: 0,
        turnCountBySet: {},
        turnCountByToy: {},
        lastSelectedSet: {},
        completedOnlyOnceTasks: {},
        selectedSets: [],
        toyDifficulties: {},
        prizeSettings: { full: 33, ruin: 33, denied: 34 },
        toyQuantities: {},
        toyModifiers: {},
        bodyPartState: {
            Mo: { name: "Mo", items: [] },
            Ba: { name: "Ba", items: [] },
            Bu: { name: "Bu", items: [] },
            As: { name: "As", items: [] },
            Ni: { name: "Ni", items: [] },
            Ha: { name: "Ha", items: [] },
            Bo: { name: "Bo", items: [] },
            Pe: { name: "Pe", items: [] }
        },
        playerName: '',
        toySetEnabled: {},
        toyChecked: {},
        cageLocked: false,
        cageWorn: false,
        finalChallengeSettings: { stroking: 33, vibe: 33, anal: 34 },
        finalChallengeTypes: {
            stroking_icyhot: false,
            stroking_icewater: false,
            stroking_ktb: false,
            stroking_ballsqueeze: false,
            stroking_2finger: false,
            vibe_icyhot: false,
            vibe_icewater: false,
            anal_vibe: false
        },
        finalChallengeModifierChances: {
            stroking_icyhot: 10,
            stroking_icewater: 10,
            stroking_ktb: 10,
            stroking_ballsqueeze: 10,
            stroking_2finger: 10,
            vibe_icyhot: 10,
            vibe_icewater: 10,
            anal_vibe: 10,
            ce: 10,
            pf: 10
        },
        finalChallengeDifficulties: {
            stroking: 'medium',
            vibe: 'medium',
            anal: 'medium'
        },
        finalChallengeModifiers: {
            ce: false,
            pf: false
        },
        totalSquares: 100,
        snakesLaddersMode: 'classic',
        snakesLaddersDifficulty: 'medium',
        customSnakes: {},
        customLadders: {},
        currentInstruction: '',
        diceResultText: 'Dice: -',
        pendingSnakeLadder: null,
        
        // Task selection control
        forceNextTask: null,
        scheduledTasks: [],
        disabledTasks: new Set(),
        taskWeights: {},
        customFlags: {}
    };
    
    // Board configuration (exposed for movement.js)
    window.BOARD_SNAKES = {16:6, 47:26, 49:11, 56:53, 62:19, 64:60, 87:24, 93:73, 95:75, 98:78};
    window.BOARD_LADDERS = {1:38, 4:14, 9:31, 21:42, 28:84, 36:44, 51:67, 71:91, 80:99};
}

// Initialize game functions
export function initializeGameFunctions(onTaskCompleteCallback) {
    window.GAME_FUNCTIONS = {
        saveState: saveGameState,
        completeTask: onTaskCompleteCallback
    };
}

// Save game state to localStorage
export function saveGameState() {
    // Always save the complete current state
    const state = {
        ...window.GAME_STATE,
        disabledTasks: Array.from(window.GAME_STATE.disabledTasks),
        lastSaved: Date.now()
    };
    
    localStorage.setItem('snakesLaddersGameState', JSON.stringify(state));
    console.log('💾 Game state saved:', {
        gameStarted: state.gameStarted,
        playerPosition: state.playerPosition,
        turnCount: state.turnCount,
        diceResultText: state.diceResultText
    });
}

// Load game state from localStorage
export function loadGameState() {
    const saved = localStorage.getItem('snakesLaddersGameState');
    if (!saved) return null;
    
    try {
        const state = JSON.parse(saved);
        
        console.log('📂 Loading saved state:', {
            gameStarted: state.gameStarted,
            playerPosition: state.playerPosition,
            turnCount: state.turnCount,
            diceResultText: state.diceResultText
        });
        
        // Restore game state
        Object.assign(window.GAME_STATE, state);
        window.GAME_STATE.disabledTasks = new Set(state.disabledTasks || []);
        
        // FIX: Ensure CE and PF modifiers are properly restored
        if (!window.GAME_STATE.finalChallengeModifiers) {
            window.GAME_STATE.finalChallengeModifiers = { ce: false, pf: false };
        }
        
        // FIX: Ensure CE and PF modifier chances are properly restored
        if (!window.GAME_STATE.finalChallengeModifierChances) {
            window.GAME_STATE.finalChallengeModifierChances = {
                stroking_icyhot: 10,
                stroking_icewater: 10,
                stroking_ktb: 10,
                stroking_ballsqueeze: 10,
                stroking_2finger: 10,
                vibe_icyhot: 10,
                vibe_icewater: 10,
                anal_vibe: 10,
                ce: 10,
                pf: 10
            };
        } else {
            // Ensure CE and PF are present even if they weren't in the saved state
            if (window.GAME_STATE.finalChallengeModifierChances.ce === undefined) {
                window.GAME_STATE.finalChallengeModifierChances.ce = 10;
            }
            if (window.GAME_STATE.finalChallengeModifierChances.pf === undefined) {
                window.GAME_STATE.finalChallengeModifierChances.pf = 10;
            }
        }
        
        // FIX: Ensure snakesLaddersDifficulty exists
        if (!window.GAME_STATE.snakesLaddersDifficulty) {
            window.GAME_STATE.snakesLaddersDifficulty = 'medium';
        }
        
        return state;
    } catch (e) {
        console.error('Failed to load saved game:', e);
        return null;
    }
}

// Reset game state
export function resetGameState() {
    // Clear localStorage
    localStorage.removeItem('snakesLaddersGameState');
    
    // Reset game state to defaults
    window.GAME_STATE.gameStarted = false;
    window.GAME_STATE.playerPosition = 0;
    window.GAME_STATE.turnCount = 0;
    window.GAME_STATE.turnCountBySet = {};
    window.GAME_STATE.turnCountByToy = {};
    window.GAME_STATE.lastSelectedSet = {};
    window.GAME_STATE.completedOnlyOnceTasks = {};
    window.GAME_STATE.playerName = '';
    window.GAME_STATE.selectedSets = [];
    window.GAME_STATE.toyDifficulties = {};
    window.GAME_STATE.toyQuantities = {};
    window.GAME_STATE.toyModifiers = {};
    window.GAME_STATE.toySetEnabled = {};
    window.GAME_STATE.toyChecked = {};
    window.GAME_STATE.forceNextTask = null;
    window.GAME_STATE.scheduledTasks = [];
    window.GAME_STATE.disabledTasks = new Set();
    window.GAME_STATE.taskWeights = {};
    window.GAME_STATE.customFlags = {};
    window.GAME_STATE.cageLocked = false;
    window.GAME_STATE.cageWorn = false;
    window.GAME_STATE.currentInstruction = '';
    window.GAME_STATE.diceResultText = 'Dice: -';
    window.GAME_STATE.pendingSnakeLadder = null;
    window.GAME_STATE.totalSquares = 100;
    window.GAME_STATE.snakesLaddersMode = 'classic';
    window.GAME_STATE.snakesLaddersDifficulty = 'medium';
    window.GAME_STATE.customSnakes = {};
    window.GAME_STATE.customLadders = {};
    window.GAME_STATE.prizeSettings = { full: 33, ruin: 33, denied: 34 };
    window.GAME_STATE.finalChallengeSettings = { stroking: 33, vibe: 33, anal: 34 };
    window.GAME_STATE.finalChallengeTypes = {
        stroking_icyhot: false,
        stroking_icewater: false,
        stroking_ktb: false,
        stroking_ballsqueeze: false,
        stroking_2finger: false,
        vibe_icyhot: false,
        vibe_icewater: false,
        anal_vibe: false
    };
    window.GAME_STATE.finalChallengeDifficulties = {
        stroking: 'medium',
        vibe: 'medium',
        anal: 'medium'
    };
    window.GAME_STATE.finalChallengeModifierChances = {
        stroking_icyhot: 10,
        stroking_icewater: 10,
        stroking_ktb: 10,
        stroking_ballsqueeze: 10,
        stroking_2finger: 10,
        vibe_icyhot: 10,
        vibe_icewater: 10,
        anal_vibe: 10,
        ce: 10,
        pf: 10
    };
    window.GAME_STATE.finalChallengeModifiers = {
        ce: false,
        pf: false
    };
    
    // Reset body part state
    window.GAME_STATE.bodyPartState = {
        Mo: { name: "Mo", items: [] },
        Ba: { name: "Ba", items: [] },
        Bu: { name: "Bu", items: [] },
        As: { name: "As", items: [] },
        Ni: { name: "Ni", items: [] },
        Ha: { name: "Ha", items: [] },
        Bo: { name: "Bo", items: [] },
        Pe: { name: "Pe", items: [] }
    };
}

// Get condition helpers for tasks
export function getTaskConditions() {
    return {
        // Player info
        name: window.GAME_STATE.playerName || 'Player',
        playerPosition: window.GAME_STATE.playerPosition,
        turnCount: window.GAME_STATE.turnCount,
        
        // Turn count tracking
        getTurnCountForSet: (setId) => window.GAME_STATE.turnCountBySet[setId] || 0,
        getTurnCountForToy: (toyKey) => window.GAME_STATE.turnCountByToy[toyKey] || 0,
        getLastSelectedSet: (toyId) => window.GAME_STATE.lastSelectedSet[toyId] || null,
        
        // Cage state
        cageLocked: window.GAME_STATE.cageLocked,
        
        // Selected sets
        selectedSets: window.GAME_STATE.selectedSets,
        hasSet: (setId) => window.GAME_STATE.selectedSets.includes(setId),
        
        // Toy availability checks
        toyChecked: (toyId) => window.GAME_STATE.toyChecked[toyId] === true,
        toySetEnabled: (toyKey) => window.GAME_STATE.toySetEnabled[toyKey] === true,
        toyQuantity: (toyKey) => window.GAME_STATE.toyQuantities[toyKey] || 0,
        
        // Toy holding checks
        isHolding: (toyId) => {
            for (const part of Object.values(window.GAME_STATE.bodyPartState)) {
                if (part.items.includes(toyId)) return true;
            }
            return false;
        },
        
        // Get all body parts holding a specific toy
        getBodyPartsHolding: (toyId) => {
            const parts = [];
            for (const [partKey, part] of Object.entries(window.GAME_STATE.bodyPartState)) {
                if (part.items.includes(toyId)) {
                    parts.push({ key: partKey, name: part.name });
                }
            }
            return parts;
        },
        
        // Count toys
        countToy: (toyId) => {
            let count = 0;
            for (const part of Object.values(window.GAME_STATE.bodyPartState)) {
                count += part.items.filter(item => item === toyId).length;
            }
            return count;
        },
        
        countToyInBodyPart: (toyId, bodyPart) => {
            return window.GAME_STATE.bodyPartState[bodyPart].items.filter(item => item === toyId).length;
        },
        
        // Body part checks
        getBodyPart: (bodyPartKey) => {
            return window.GAME_STATE.bodyPartState[bodyPartKey];
        },
        
        bodyPartEmpty: (bodyPartKey) => {
            return isBodyPartEmpty(bodyPartKey);
        },
        
        bodyPartHas: (bodyPartKey, toyId) => {
            return window.GAME_STATE.bodyPartState[bodyPartKey].items.includes(toyId);
        },
        
        bodyPartHasRegularToys: (bodyPartKey) => {
            return hasRegularToys(bodyPartKey);
        },
        
        bodyPartHasClothesPegs: (bodyPartKey) => {
            return hasClothesPegs(bodyPartKey);
        },
        
        isBodyPartOccupied: (bodyPartKey) => {
            return window.GAME_STATE.bodyPartState[bodyPartKey] && 
                   !isBodyPartEmpty(bodyPartKey);
        },
        
        canBodyPartHold: (bodyPartKey, toyId) => {
            return canAddToyToBodyPart(bodyPartKey, toyId);
        },
        
        // Multiple toy checks
        hasMultiple: (toyIds) => {
            return toyIds.every(toyId => {
                for (const part of Object.values(window.GAME_STATE.bodyPartState)) {
                    if (part.items.includes(toyId)) return true;
                }
                return false;
            });
        },
        
        hasAny: (toyIds) => {
            return toyIds.some(toyId => {
                for (const part of Object.values(window.GAME_STATE.bodyPartState)) {
                    if (part.items.includes(toyId)) return true;
                }
                return false;
            });
        },
        
        // Get all held items
        getAllHeldItems: () => {
            const items = [];
            for (const part of Object.values(window.GAME_STATE.bodyPartState)) {
                items.push(...part.items);
            }
            return items;
        },
        
        // Get full body part state
        getBodyPartState: () => window.GAME_STATE.bodyPartState,
        
        // Custom flags
        getFlag: (key) => window.GAME_STATE.customFlags[key],
        
        // Utility
        randomChance: (percent) => {
            return Math.random() * 100 < percent;
        }
    };
}

// Body part manipulation functions

// Check if body part is empty
export function isBodyPartEmpty(bodyPart) {
    return window.GAME_STATE.bodyPartState[bodyPart].items.length === 0;
}

// Check if body part has clothes pegs
export function hasClothesPegs(bodyPart) {
    return window.GAME_STATE.bodyPartState[bodyPart].items.some(item => item === 'pegs');
}

// Check if body part has regular toys (non-pegs)
export function hasRegularToys(bodyPart) {
    return window.GAME_STATE.bodyPartState[bodyPart].items.some(item => item !== 'pegs');
}

// Get clothes peg count in body part
export function hasClothesPegCount(bodyPart) {
    return window.GAME_STATE.bodyPartState[bodyPart].items.filter(item => item === 'pegs').length;
}

// Check if toy can be added to body part
export function canAddToyToBodyPart(bodyPart, toyId) {
    if (toyId === 'pegs') {
        // Clothes Pegs case - can't add if body part has regular toys
        if (hasRegularToys(bodyPart)) {
            return false;
        }
        // Check if under max count
        const currentCount = hasClothesPegCount(bodyPart);
        const maxCount = getClothesPegMax(bodyPart);
        return currentCount < maxCount;
    } else {
        // Regular toy case - body part must be completely empty
        return isBodyPartEmpty(bodyPart);
    }
}

// Add toy to body part
export function addToyToBodyPart(bodyPart, toyId) {
    if (canAddToyToBodyPart(bodyPart, toyId)) {
        window.GAME_STATE.bodyPartState[bodyPart].items.push(toyId);
        saveGameState();
        return true;
    }
    return false;
}

// Remove toy from body part
export function removeToyFromBodyPart(bodyPart, toyId) {
    const index = window.GAME_STATE.bodyPartState[bodyPart].items.indexOf(toyId);
    if (index > -1) {
        window.GAME_STATE.bodyPartState[bodyPart].items.splice(index, 1);
        saveGameState();
        return true;
    }
    return false;
}

// Expose functions globally
window.getConditions = getTaskConditions;
window.canAddToyToBodyPart = canAddToyToBodyPart;
window.addToyToBodyPart = addToyToBodyPart;
window.removeToyFromBodyPart = removeToyFromBodyPart;
