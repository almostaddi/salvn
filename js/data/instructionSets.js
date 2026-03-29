// Instruction sets and toy definitions
// This file contains ONLY data definitions and pure utility functions
// Body part state management is in gameState.js

export const INSTRUCTION_SETS = {
    dressup: {
        name: "Painplay",
        emoji: "🎨",
        toys: [
            { id: "pegs", name: "Clothes Pegs 🎨" },
            { id: "silly_shirt", name: "Clamps 👕" },
            { id: "wristband", name: "KTB ⌚" },
            { id: "hand", name: "Hand ✋" },
            { id: "vibe", name: "Vibe 💎" }
        ]
    },
    anal: {
        name: "Anal Set",
        emoji: "🍎",
        toys: [
            { id: "stick_a", name: "Dildo A 🪵" },
            { id: "metal_stick", name: "Metal Wand 🔩" },
            { id: "tail", name: "Plug 🦊" },
            { id: "vibe", name: "Vibe 💎" },
            { id: "cage", name: "Cage 🔒" }
        ]
    },
    digging: {
        name: "Deepthroat",
        emoji: "⛏️",
        toys: [
            { id: "stick_m", name: "Dildo M 🪵" },
            { id: "hand", name: "Hand ✋" }
        ]
    },
    teaseanddenial: {
        name: "Tease And Denial",
        emoji: "🎯",
        toys: [
            { id: "vibe", name: "Vibe 💎" },
            { id: "hand", name: "Hand ✋" },
            { id: "cage", name: "Cage 🔒" }
        ]
    }
};

// Wearable toys (can be held on body parts)
export const WEARABLE_TOYS = new Set([
    'pegs', 
    'silly_shirt', 
    'stick_a', 
    'stick_m', 
    'metal_stick', 
    'tail', 
    'cage', 
    'hand', 
    'vibe'
]);

// Clothes pegs max count per body part
export const CLOTHESPEGS_MAX_COUNT = {
    'Ba': 20,
    'Ni': 2,
    'Mo': 3,
    'Bu': 1,
    'As': 1,
    'Ha': 1,
    'Bo': 1,
    'Pe': 1
};

// Pure utility functions (no state access)

// Check if toy can be worn
export function isToyWearable(toyId) {
    return WEARABLE_TOYS.has(toyId);
}

// Get max clothes pegs for body part
export function getClothesPegMax(bodyPart) {
    return CLOTHESPEGS_MAX_COUNT[bodyPart] || 1;
}

// Get difficulty value based on difficulty setting
export function getDifficultyValue(difficulty, easyVal, mediumVal, hardVal) {
    if (difficulty === 'easy') return easyVal;
    if (difficulty === 'medium') return mediumVal;
    if (difficulty === 'hard') return hardVal;
    return mediumVal; // default
}

// Check if toy has add/remove tasks (based on wearability)
export function toyHasAddRemoveTasks(toyKey) {
    // This will eventually check against actual task definitions
    // For now, assume all wearable toys have add/remove tasks
    const [setId, ...toyIdParts] = toyKey.split('_');
    const toyId = toyIdParts.join('_');
    
    return isToyWearable(toyId);
}

// Expose globally for compatibility
window.INSTRUCTION_SETS = INSTRUCTION_SETS;
window.isToyWearable = isToyWearable;
window.getDifficultyValue = getDifficultyValue;
