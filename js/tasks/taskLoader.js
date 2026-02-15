// Task loader - loads and renders task using Visual Novel display system
// Integrates with existing task selection and game state

import { getTaskConditions } from '../state/gameState.js';
import { saveGameState } from '../state/gameState.js';

// VN Task Display Class
class VNTaskDisplay {
    constructor(containerId = 'instructions') {
        this.container = document.getElementById(containerId);
        this.currentBubbleIndex = 0;
        this.bubbles = [];
        this.currentStageId = null;
        this.stageData = {};
        this.taskDefinition = null;
        this.stages = [];
        this.onCompleteCallback = null;
        
        this.elements = {};
        this.initialize();
    }
    
    initialize() {
        this.container.innerHTML = '';
        
        this.container.innerHTML = `
            <div class="vn-left-module"></div>
            <div class="vn-center-content">
                <div class="vn-image-container hidden">
                    <img src="" alt="Task Image">
                </div>
                <div class="vn-text-area">
                    <div class="vn-click-hint">Click to continue ▼</div>
                    <div class="vn-bubbles-container"></div>
                    <div class="vn-continue-indicator">▼</div>
                </div>
                <div class="vn-button-area"></div>
            </div>
            <div class="vn-right-module"></div>
        `;
        
        this.elements = {
            leftModule: this.container.querySelector('.vn-left-module'),
            rightModule: this.container.querySelector('.vn-right-module'),
            centerContent: this.container.querySelector('.vn-center-content'),
            imageContainer: this.container.querySelector('.vn-image-container'),
            image: this.container.querySelector('.vn-image-container img'),
            textArea: this.container.querySelector('.vn-text-area'),
            bubblesContainer: this.container.querySelector('.vn-bubbles-container'),
            buttonArea: this.container.querySelector('.vn-button-area'),
            continueIndicator: this.container.querySelector('.vn-continue-indicator')
        };
        
        // Click handler for text area
        this.elements.textArea.addEventListener('click', () => this.advanceBubble());
    }
    
    // Set image
    setImage(imageUrl) {
        if (!imageUrl) {
            this.elements.imageContainer.classList.add('hidden');
            return;
        }
        
        this.elements.image.src = imageUrl;
        this.elements.imageContainer.classList.remove('hidden');
    }
    
    // Add bubble
    addBubble(content) {
        this.bubbles.push(content);
    }
    
    // Clear bubbles
    clearBubbles() {
        this.bubbles = [];
        this.currentBubbleIndex = 0;
        this.elements.bubblesContainer.innerHTML = '';
    }
    
    // Advance to next bubble
    advanceBubble() {
        if (this.currentBubbleIndex >= this.bubbles.length) {
            return;
        }
        
        // Hide continue indicator
        this.elements.continueIndicator.style.display = 'none';
        
        // Move existing bubbles up
        const existingBubbles = this.elements.bubblesContainer.querySelectorAll('.vn-bubble:not(.hidden)');
        existingBubbles.forEach(bubble => {
            bubble.classList.add('moving-up');
        });
        
        // Create new bubble
        const content = this.bubbles[this.currentBubbleIndex];
        const bubble = document.createElement('div');
        bubble.className = 'vn-bubble';
        bubble.innerHTML = content;
        
        this.elements.bubblesContainer.appendChild(bubble);
        this.currentBubbleIndex++;
        
        // Show continue indicator if more bubbles
        if (this.currentBubbleIndex < this.bubbles.length) {
            setTimeout(() => {
                this.elements.continueIndicator.style.display = 'block';
            }, 400);
        }
        
        // Clean up old bubbles
        setTimeout(() => {
            existingBubbles.forEach(bubble => bubble.classList.add('hidden'));
        }, 300);
        
        // Save state after advancing
        this.saveState();
    }
    
    // Clear buttons
    clearButtons() {
        this.elements.buttonArea.innerHTML = '';
    }
    
    // Add button
    addButton(text, callback, type = 'choice') {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = `vn-button-${type}`;
        button.addEventListener('click', callback);
        this.elements.buttonArea.appendChild(button);
    }
    
    // Set left module
    setLeftModule(title, content, onMount = null) {
        this.elements.leftModule.innerHTML = `
            <div class="vn-module-title">${title}</div>
            <div class="vn-module-content">${content}</div>
        `;
        this.elements.leftModule.classList.add('active');
        
        if (onMount) {
            onMount();
        }
    }
    
    // Set right module
    setRightModule(title, content, onMount = null) {
        this.elements.rightModule.innerHTML = `
            <div class="vn-module-title">${title}</div>
            <div class="vn-module-content">${content}</div>
        `;
        this.elements.rightModule.classList.add('active');
        
        if (onMount) {
            onMount();
        }
    }
    
    // Clear modules
    clearLeftModule() {
        this.elements.leftModule.innerHTML = '';
        this.elements.leftModule.classList.remove('active');
    }
    
    clearRightModule() {
        this.elements.rightModule.innerHTML = '';
        this.elements.rightModule.classList.remove('active');
    }
    
    // Load a stage
    loadStage(stageId, newData = {}) {
        // Merge data
        this.stageData = { ...this.stageData, ...newData };
        
        const stage = this.stages.find(s => s.id === stageId);
        if (!stage) {
            console.error('Stage not found:', stageId);
            return;
        }
        
        this.currentStageId = stageId;
        
        // Clear previous content
        this.clearBubbles();
        this.clearButtons();
        
        // Set image if specified
        if (stage.image !== undefined) {
            this.setImage(stage.image);
        }
        
        // Handle modules
        if (stage.leftModule !== undefined) {
            if (stage.leftModule === null) {
                this.clearLeftModule();
            } else {
                const content = typeof stage.leftModule.content === 'function'
                    ? stage.leftModule.content(this.stageData)
                    : stage.leftModule.content;
                this.setLeftModule(stage.leftModule.title, content, stage.leftModule.onMount);
            }
        }
        
        if (stage.rightModule !== undefined) {
            if (stage.rightModule === null) {
                this.clearRightModule();
            } else {
                const content = typeof stage.rightModule.content === 'function'
                    ? stage.rightModule.content(this.stageData)
                    : stage.rightModule.content;
                this.setRightModule(stage.rightModule.title, content, stage.rightModule.onMount);
            }
        }
        
        // Add bubbles
        if (stage.bubbles) {
            stage.bubbles.forEach(bubble => {
                const content = typeof bubble === 'function'
                    ? bubble(this.stageData)
                    : (typeof bubble.content === 'function'
                        ? bubble.content(this.stageData)
                        : (bubble.content || bubble));
                this.addBubble(content);
            });
        }
        
        // Show first bubble
        if (this.bubbles.length > 0) {
            this.advanceBubble();
        }
        
        // Call onMount if present
        if (stage.onMount) {
            stage.onMount(this.stageData, this);
        }
        
        // Add buttons
        if (stage.choices) {
            stage.choices.forEach(choice => {
                this.addButton(choice.text, () => {
                    const nextStage = choice.onSelect(this.stageData);
                    if (nextStage) {
                        this.loadStage(nextStage, choice.data);
                    }
                }, 'choice');
            });
        } else if (stage.buttons) {
            stage.buttons.forEach(btn => {
                const btnType = btn.type || 'next';
                this.addButton(btn.text, () => {
                    if (btn.execute) {
                        btn.execute(this.stageData);
                    }
                    if (btn.onComplete && this.onCompleteCallback) {
                        this.onCompleteCallback();
                    } else if (btn.nextStage) {
                        this.loadStage(btn.nextStage, btn.data);
                    }
                }, btnType);
            });
        } else if (stage.nextStage) {
            this.addButton('Continue', () => {
                this.loadStage(stage.nextStage);
            }, 'next');
        } else if (stage.complete) {
            this.addButton('✓ Complete', () => {
                if (this.onCompleteCallback) {
                    this.onCompleteCallback();
                }
            }, 'complete');
        }
        
        // Call onUpdate if present
        if (stage.onUpdate) {
            stage.onUpdate(this.stageData, this);
        }
        
        this.saveState();
    }
    
    // Load task from definition
    loadTask(taskDefinition, vnData, onComplete) {
        this.taskDefinition = taskDefinition;
        this.onCompleteCallback = onComplete;
        
        // Execute task logic if present
        if (taskDefinition.execute) {
            taskDefinition.execute(this.stageData);
        }
        
        // Set initial image
        if (vnData.image) {
            this.setImage(vnData.image);
        }
        
        // Handle modules
        if (vnData.leftModule) {
            const content = typeof vnData.leftModule.content === 'function'
                ? vnData.leftModule.content(this.stageData)
                : vnData.leftModule.content;
            this.setLeftModule(vnData.leftModule.title, content, vnData.leftModule.onMount);
        }
        
        if (vnData.rightModule) {
            const content = typeof vnData.rightModule.content === 'function'
                ? vnData.rightModule.content(this.stageData)
                : vnData.rightModule.content;
            this.setRightModule(vnData.rightModule.title, content, vnData.rightModule.onMount);
        }
        
        // Initialize shared data
        if (vnData.data) {
            this.stageData = { ...vnData.data };
        }
        
        // Load stages if present
        if (vnData.stages && vnData.stages.length > 0) {
            this.stages = vnData.stages;
            this.loadStage(vnData.stages[0].id);
        } else {
            // Simple task without stages
            vnData.bubbles.forEach(bubble => this.addBubble(bubble));
            if (this.bubbles.length > 0) {
                this.advanceBubble();
            }
            
            this.addButton('✓ Complete', () => {
                if (this.onCompleteCallback) {
                    this.onCompleteCallback();
                }
            }, 'complete');
        }
        
        this.saveState();
    }
    
    // Save current state
    saveState() {
        window.GAME_STATE.currentInstruction = this.container.innerHTML;
        window.GAME_STATE.vnState = {
            currentBubbleIndex: this.currentBubbleIndex,
            currentStageId: this.currentStageId,
            stageData: this.stageData,
            taskId: this.taskDefinition?.id
        };
        saveGameState();
    }
    
    // Restore from saved state
    restore(vnState) {
        if (!vnState) return;
        
        this.currentBubbleIndex = vnState.currentBubbleIndex || 0;
        this.currentStageId = vnState.currentStageId;
        this.stageData = vnState.stageData || {};
        
        // Re-attach event handlers to buttons
        const buttons = this.elements.buttonArea.querySelectorAll('button');
        buttons.forEach(button => {
            const text = button.textContent;
            if (text === '✓ Complete') {
                button.onclick = () => {
                    if (this.onCompleteCallback) {
                        this.onCompleteCallback();
                    }
                };
            }
        });
        
        // Re-attach text area click handler
        this.elements.textArea.onclick = () => this.advanceBubble();
    }
}

// Current VN display instance
let currentVN = null;

// Parse HTML string into VN format (for backward compatibility)
function parseHTMLToVNFormat(htmlContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Extract image
    const img = doc.querySelector('img');
    const image = img ? img.src : null;
    
    // Remove image from content
    if (img) img.remove();
    
    // Extract bubbles
    const bubbles = [];
    const strong = doc.querySelector('strong');
    const paragraphs = doc.querySelectorAll('p');
    
    if (strong || paragraphs.length > 0) {
        let currentBubble = '';
        
        if (strong) {
            currentBubble = `<strong>${strong.textContent}</strong>`;
            strong.remove();
        }
        
        let pCount = 0;
        paragraphs.forEach((p, index) => {
            if (!p.textContent.trim()) return;
            
            currentBubble += `<p>${p.innerHTML}</p>`;
            pCount++;
            
            // Create bubble every 2 paragraphs or at the end
            if (pCount >= 2 || index === paragraphs.length - 1) {
                bubbles.push(currentBubble);
                currentBubble = '';
                pCount = 0;
            }
        });
        
        if (currentBubble) {
            bubbles.push(currentBubble);
        }
    }
    
    return { image, bubbles };
}

// Load and display a task
export async function loadAndDisplayTask(taskDefinition, addRemoveTask = null) {
    // Clean up previous VN
    if (currentVN) {
        // Don't reset, just prepare for new task
    }
    
    const instructions = document.getElementById('instructions');
    instructions.classList.add('active');
    
    // Create VN instance if needed
    if (!currentVN) {
        currentVN = new VNTaskDisplay();
    } else {
        currentVN.initialize();
    }
    
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
    
    // Increment turn counts
    if (taskDefinition.setId && taskDefinition.toyId) {
        const selectedToyKey = `${taskDefinition.setId}_${taskDefinition.toyId}`;
        window.GAME_STATE.turnCountBySet[taskDefinition.setId] = 
            (window.GAME_STATE.turnCountBySet[taskDefinition.setId] || 0) + 1;
        window.GAME_STATE.turnCountByToy[selectedToyKey] = 
            (window.GAME_STATE.turnCountByToy[selectedToyKey] || 0) + 1;
        window.GAME_STATE.lastSelectedSet[taskDefinition.toyId] = taskDefinition.setId;
    }
    
    // Get task content
    const taskContent = taskDefinition.getDifficulty(primaryDifficulty, conditions, difficultyMap);
    
    // Determine if VN format or HTML string
    let vnData;
    if (typeof taskContent === 'object' && (taskContent.bubbles || taskContent.stages)) {
        // New VN format
        vnData = taskContent;
    } else {
        // Old HTML format - convert
        vnData = parseHTMLToVNFormat(taskContent);
    }
    
    // Add add/remove task bubbles at the beginning
    if (addRemoveTask && addRemoveTask.getHTML) {
        const addRemoveHTML = addRemoveTask.getHTML();
        const parsed = parseHTMLToVNFormat(addRemoveHTML);
        
        // Prepend add/remove bubbles
        if (vnData.bubbles) {
            vnData.bubbles = [...parsed.bubbles, ...vnData.bubbles];
        }
    }
    
    // Load task into VN display
    currentVN.loadTask(taskDefinition, vnData, () => {
        if (window.GAME_FUNCTIONS && window.GAME_FUNCTIONS.completeTask) {
            window.GAME_FUNCTIONS.completeTask();
        }
    });
}

// Load and display snake/ladder task
export async function loadAndDisplaySnakeLadderTask(type, fromPos, toPos) {
    const { task, snakeLadderInfo } = window.selectSnakeLadderTask(type, fromPos, toPos);
    
    const instructions = document.getElementById('instructions');
    instructions.classList.add('active');
    
    if (!currentVN) {
        currentVN = new VNTaskDisplay();
    } else {
        currentVN.initialize();
    }
    
    const conditions = getTaskConditions();
    const difficultyMap = {};
    for (const [toyKey, diff] of Object.entries(window.GAME_STATE.toyDifficulties)) {
        const [setId, ...toyIdParts] = toyKey.split('_');
        const toyId = toyIdParts.join('_');
        if (!difficultyMap[toyId]) {
            difficultyMap[toyId] = diff;
        }
    }
    
    const taskContent = task.getDifficulty('medium', conditions, difficultyMap, snakeLadderInfo);
    
    let vnData;
    if (typeof taskContent === 'object' && (taskContent.bubbles || taskContent.stages)) {
        vnData = taskContent;
    } else {
        vnData = parseHTMLToVNFormat(taskContent);
    }
    
    currentVN.loadTask(task, vnData, () => {
        if (window.GAME_FUNCTIONS && window.GAME_FUNCTIONS.completeTask) {
            window.GAME_FUNCTIONS.completeTask();
        }
    });
}

// Load and display final challenge
export async function loadAndDisplayFinalChallenge() {
    const prizeType = determinePrize();
    const task = window.selectFinalChallenge();
    
    const instructions = document.getElementById('instructions');
    instructions.classList.add('active');
    
    if (!currentVN) {
        currentVN = new VNTaskDisplay();
    } else {
        currentVN.initialize();
    }
    
    const conditions = getTaskConditions();
    const difficultyMap = {};
    for (const [toyKey, diff] of Object.entries(window.GAME_STATE.toyDifficulties)) {
        const [setId, ...toyIdParts] = toyKey.split('_');
        const toyId = toyIdParts.join('_');
        if (!difficultyMap[toyId]) {
            difficultyMap[toyId] = diff;
        }
    }
    
    const taskContent = task.getDifficulty(null, conditions, difficultyMap, prizeType);
    
    let vnData;
    if (typeof taskContent === 'object' && (taskContent.bubbles || taskContent.stages)) {
        vnData = taskContent;
    } else {
        vnData = parseHTMLToVNFormat(taskContent);
    }
    
    currentVN.loadTask(task, vnData, () => {
        // Final challenge complete - no callback needed
        // The task itself handles what happens next
    });
}

// Determine prize type
function determinePrize() {
    const prizeSettings = window.GAME_STATE.prizeSettings;
    const roll = Math.random() * 100;
    return roll < prizeSettings.full ? 'full' : 
           roll < prizeSettings.full + prizeSettings.ruin ? 'ruin' : 'none';
}

// Restore VN state (called on page load)
export function restoreVNState() {
    if (window.GAME_STATE.vnState && window.GAME_STATE.currentInstruction) {
        const instructions = document.getElementById('instructions');
        instructions.innerHTML = window.GAME_STATE.currentInstruction;
        instructions.classList.add('active');
        
        if (!currentVN) {
            currentVN = new VNTaskDisplay();
        }
        
        currentVN.restore(window.GAME_STATE.vnState);
    }
}

// Export current VN instance
export function getCurrentVN() {
    return currentVN;
}

// Expose functions globally
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
window.restoreVNState = restoreVNState;
