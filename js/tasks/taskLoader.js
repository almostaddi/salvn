// Task loader - loads and renders task HTML/logic from task modules

import { getTaskConditions } from '../state/gameState.js';
import { saveGameState } from '../state/gameState.js';

// Current active task
let currentTask = null;
let currentMetronomeTask = null;

// Continue button
const continueButton = document.createElement('button');
continueButton.id = "continueButton";
continueButton.textContent = "✓ Complete";

// Load and display a regular task
export async function loadAndDisplayTask(taskDefinition, addRemoveTask = null) {
    // Clean up previous task
    if (currentMetronomeTask) {
        currentMetronomeTask.cleanup();
        currentMetronomeTask = null;
    }
    
    currentTask = taskDefinition;
    const instructions = document.getElementById('instructions');
    instructions.classList.add('active');
    
    // Get conditions
    const conditions = getTaskConditions();
    
    // Build difficulty map
    const difficultyMap = {};
    for (const [toyKey, diff] of Object.entries(window.GAME_STATE.toyDifficulties)) {
        const [setId, ...toyIdParts] = toyKey.split('_');
        const toyId = toyIdParts.join('_');
        if (!difficultyMap[toyId]) {
            difficultyMap[toyId] = diff;
        }
    }
    
    // Get primary difficulty
    const toyKey = taskDefinition.setId && taskDefinition.toyId ? 
        `${taskDefinition.setId}_${taskDefinition.toyId}` : null;
    const primaryDifficulty = toyKey ? 
        (window.GAME_STATE.toyDifficulties[toyKey] || 'medium') : 
        'medium';
    
    // Increment turn counts if this is a set/toy task
    if (taskDefinition.setId && taskDefinition.toyId) {
        const selectedToyKey = `${taskDefinition.setId}_${taskDefinition.toyId}`;
        window.GAME_STATE.turnCountBySet[taskDefinition.setId] = 
            (window.GAME_STATE.turnCountBySet[taskDefinition.setId] || 0) + 1;
        window.GAME_STATE.turnCountByToy[selectedToyKey] = 
            (window.GAME_STATE.turnCountByToy[selectedToyKey] || 0) + 1;
        window.GAME_STATE.lastSelectedSet[taskDefinition.toyId] = taskDefinition.setId;
    }
    
    // Store task info for saving
    window.lastTaskInfo = {
        toyId: taskDefinition.toyId,
        setId: taskDefinition.setId,
        difficulty: primaryDifficulty,
        taskType: taskDefinition.type || 'normal',
        filePath: taskDefinition.filePath
    };
    
    // Build add/remove HTML if present
    let addRemoveHTML = '';
    if (addRemoveTask) {
        const html = addRemoveTask.getHTML();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const strong = doc.querySelector('strong');
        const paragraphs = doc.querySelectorAll('p');
        let text = '';
        if (strong) text += `<strong>${strong.textContent}</strong>`;
        paragraphs.forEach(p => text += `<p>${p.textContent}</p>`);
        addRemoveHTML = text;
    }
    
    // Handle different task types
    if (taskDefinition.type === 'metronome') {
        const beatCount = taskDefinition.getDifficulty(primaryDifficulty, conditions, difficultyMap);
        window.lastTaskInfo.beatCount = beatCount;
        currentMetronomeTask = createMetronomeTask(beatCount);
        instructions.innerHTML = addRemoveHTML;
        instructions.appendChild(currentMetronomeTask.element);
    } else if (taskDefinition.type === 'redlight') {
        const duration = taskDefinition.getDifficulty(primaryDifficulty, conditions, difficultyMap);
        window.lastTaskInfo.duration = duration;
        currentMetronomeTask = createRedLightGreenLightTask(duration);
        instructions.innerHTML = addRemoveHTML;
        instructions.appendChild(currentMetronomeTask.element);
    } else {
        // Regular task - get HTML content
        const content = taskDefinition.getDifficulty(primaryDifficulty, conditions, difficultyMap);
        instructions.innerHTML = addRemoveHTML + content;
    }
    
    // Execute task if it has an execute function
    if (taskDefinition.execute) {
        taskDefinition.execute();
    }
    
    // Add continue button
    instructions.appendChild(continueButton);
    continueButton.style.display = "block";
    continueButton.onclick = () => {
        if (window.GAME_FUNCTIONS && window.GAME_FUNCTIONS.completeTask) {
            window.GAME_FUNCTIONS.completeTask();
        }
    };
    
    // Save current instruction HTML to state for restoration
    window.GAME_STATE.currentInstruction = instructions.innerHTML;
    
    // Save state
    if (window.GAME_FUNCTIONS && window.GAME_FUNCTIONS.saveState) {
        window.GAME_FUNCTIONS.saveState();
    }
}

// Load and display snake/ladder task
export async function loadAndDisplaySnakeLadderTask(type, fromPos, toPos) {
    const { task, snakeLadderInfo } = window.selectSnakeLadderTask(type, fromPos, toPos);
    
    // Clean up previous task
    if (currentMetronomeTask) {
        currentMetronomeTask.cleanup();
        currentMetronomeTask = null;
    }
    
    currentTask = task;
    const instructions = document.getElementById('instructions');
    instructions.classList.add('active');
    
    // Get conditions
    const conditions = getTaskConditions();
    
    // Build difficulty map
    const difficultyMap = {};
    for (const [toyKey, diff] of Object.entries(window.GAME_STATE.toyDifficulties)) {
        const [setId, ...toyIdParts] = toyKey.split('_');
        const toyId = toyIdParts.join('_');
        if (!difficultyMap[toyId]) {
            difficultyMap[toyId] = diff;
        }
    }
    
    // Get task HTML
    const primaryDifficulty = 'medium';
    const content = task.getDifficulty(primaryDifficulty, conditions, difficultyMap, snakeLadderInfo);
    instructions.innerHTML = content;
    
    // Add continue button
    instructions.appendChild(continueButton);
    continueButton.style.display = "block";
    continueButton.onclick = () => {
        if (window.GAME_FUNCTIONS && window.GAME_FUNCTIONS.completeTask) {
            window.GAME_FUNCTIONS.completeTask();
        }
    };
    
    // Save current instruction HTML to state for restoration
    window.GAME_STATE.currentInstruction = instructions.innerHTML;
    
    // Save state
    if (window.GAME_FUNCTIONS && window.GAME_FUNCTIONS.saveState) {
        window.GAME_FUNCTIONS.saveState();
    }
}

// Load and display final challenge
export async function loadAndDisplayFinalChallenge() {
    // Roll prize type first (secretly)
    const prizeType = determinePrize();
    
    // Select final challenge task
    const task = window.selectFinalChallenge();
    
    // Clean up previous task
    if (currentMetronomeTask) {
        currentMetronomeTask.cleanup();
        currentMetronomeTask = null;
    }
    
    currentTask = task;
    const instructions = document.getElementById('instructions');
    instructions.classList.add('active');
    
    // Get conditions
    const conditions = getTaskConditions();
    
    // Build difficulty map
    const difficultyMap = {};
    for (const [toyKey, diff] of Object.entries(window.GAME_STATE.toyDifficulties)) {
        const [setId, ...toyIdParts] = toyKey.split('_');
        const toyId = toyIdParts.join('_');
        if (!difficultyMap[toyId]) {
            difficultyMap[toyId] = diff;
        }
    }
    
    // Get task HTML with prize type
    const content = task.getDifficulty(null, conditions, difficultyMap, prizeType);
    instructions.innerHTML = content;
    
    // Note: Continue button is NOT added for final challenge
    // The task itself handles prize reveal
    
    // Save current instruction HTML to state for restoration
    window.GAME_STATE.currentInstruction = instructions.innerHTML;
    
    // Save state
    if (window.GAME_FUNCTIONS && window.GAME_FUNCTIONS.saveState) {
        window.GAME_FUNCTIONS.saveState();
    }
}

// Determine prize type
function determinePrize() {
    const prizeSettings = window.GAME_STATE.prizeSettings;
    const roll = Math.random() * 100;
    return roll < prizeSettings.full ? 'full' : 
           roll < prizeSettings.full + prizeSettings.ruin ? 'ruin' : 'none';
}

// Create metronome task (imported from minigames)
function createMetronomeTask(beatCount) {
    // This will be imported from minigames/metronome.js
    if (window.createMetronomeTask) {
        return window.createMetronomeTask(beatCount);
    }
    
    // Fallback
    return {
        element: document.createElement('div'),
        isComplete: () => true,
        cleanup: () => {},
        hasStarted: () => false
    };
}

// Create red light green light task (imported from minigames)
function createRedLightGreenLightTask(duration) {
    // This will be imported from minigames/redgreenlight.js
    if (window.createRedLightGreenLightTask) {
        return window.createRedLightGreenLightTask(duration);
    }
    
    // Fallback
    return {
        element: document.createElement('div'),
        isComplete: () => true,
        cleanup: () => {},
        hasStarted: () => false
    };
}

// Get current task
export function getCurrentTask() {
    return currentTask;
}

// Get current metronome task
export function getCurrentMetronomeTask() {
    return currentMetronomeTask;
}

// Expose functions globally for compatibility
window.displayRandomInstruction = async () => {
    const task = window.selectNextTask();
    if (task) {
        await loadAndDisplayTask(task);
    }
};

window.displayRandomInstructionWithAddRemove = async (addRemoveTask) => {
    const task = window.selectNextTask();
    if (task) {
        await loadAndDisplayTask(task, addRemoveTask);
    }
};

window.displaySnakeLadderTask = loadAndDisplaySnakeLadderTask;
window.displayFinalChallenge = loadAndDisplayFinalChallenge;
