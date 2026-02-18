// js/tasks/taskLoader.js
// Task loader - loads and renders task using Visual Novel display system
// Integrates with existing task selection and game state

import { getTaskConditions } from '../state/gameState.js';
import { saveGameState } from '../state/gameState.js';

// Image preloader
class ImagePreloader {
    constructor() {
        this.cache = new Map();
    }
    
    preload(url) {
        if (!url || this.cache.has(url)) return Promise.resolve();
        
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                this.cache.set(url, img);
                console.log('🖼️ Preloaded image:', url);
                resolve();
            };
            img.onerror = () => {
                console.warn('⚠️ Failed to preload image:', url);
                resolve(); // resolve anyway so Promise.all doesn't fail
            };
            img.src = url;
        });
    }
    
    preloadMultiple(urls) {
        const promises = urls.filter(url => url).map(url => this.preload(url));
        return Promise.all(promises);
    }
    
    // Preload in background (non-blocking)
    preloadInBackground(urls) {
        const uniqueUrls = urls.filter(url => url && !this.cache.has(url));
        if (uniqueUrls.length === 0) return;
        console.log(`🖼️ Background preloading ${uniqueUrls.length} images...`);
        uniqueUrls.forEach(url => this.preload(url));
    }
}

const imagePreloader = new ImagePreloader();

// ── Helper: collect all image URLs from a VN data object ─────────────────
function collectVNImages(vnData, firstStageOnly = false) {
    const urls = [];
    if (!vnData) return urls;

    // Top-level image (simple tasks)
    if (vnData.image) urls.push(vnData.image);

    // Stage images
    if (vnData.stages && vnData.stages.length > 0) {
        const stagesToScan = firstStageOnly ? [vnData.stages[0]] : vnData.stages;
        stagesToScan.forEach(stage => {
            if (stage.image) urls.push(stage.image);
        });
    }

    return urls;
}

// VN Task Display Class
class VNTaskDisplay {
    constructor(containerId = 'instructions') {
        console.log('🎬 VNTaskDisplay: Constructor called');
        this.container = document.getElementById(containerId);
        
        if (!this.container) {
            console.error('❌ VNTaskDisplay: Container not found:', containerId);
            return;
        }
        
        this.currentBubbleIndex = 0;
        this.bubbles = [];
        this.currentStageId = null;
        this.stageData = {};
        this.taskDefinition = null;
        this.stages = [];
        this.onCompleteCallback = null;
        this.allBubblesShown = false;
        this.pendingButtons = [];
        this.currentImageUrl = null;
        
        this.elements = {};
        this.initialize();
    }
    
    initialize() {
        if (!this.container) return;
        
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
        
        if (this.elements.textArea) {
            this.elements.textArea.addEventListener('click', () => this.advanceBubble());
        }
    }
    
    setImage(imageUrl) {
        if (!imageUrl) {
            this.elements.imageContainer.classList.add('hidden');
            this.currentImageUrl = null;
            return;
        }
        this.elements.image.src = imageUrl;
        this.elements.imageContainer.classList.remove('hidden');
        this.currentImageUrl = imageUrl;
    }
    
    addBubble(content) {
        this.bubbles.push(content);
    }
    
    clearBubbles() {
        this.bubbles = [];
        this.currentBubbleIndex = 0;
        this.allBubblesShown = false;
        this.elements.bubblesContainer.innerHTML = '';
    }
    
    addBubbleToDOMSilent(content, isOld = false) {
        const bubble = document.createElement('div');
        bubble.className = 'vn-bubble';
        if (isOld) bubble.classList.add('moving-up');
        bubble.innerHTML = content;
        this.elements.bubblesContainer.appendChild(bubble);
    }
    
    advanceBubble() {
        if (this.currentBubbleIndex >= this.bubbles.length) return;
        
        this.elements.continueIndicator.style.display = 'none';
        
        const existingBubbles = this.elements.bubblesContainer.querySelectorAll('.vn-bubble:not(.hidden)');
        existingBubbles.forEach(bubble => bubble.classList.add('moving-up'));
        
        const content = this.bubbles[this.currentBubbleIndex];
        const bubble = document.createElement('div');
        bubble.className = 'vn-bubble';
        bubble.innerHTML = content;
        this.elements.bubblesContainer.appendChild(bubble);
        this.currentBubbleIndex++;
        
        if (this.currentBubbleIndex >= this.bubbles.length) {
            this.allBubblesShown = true;
            this.showPendingButtons();
        } else {
            setTimeout(() => {
                this.elements.continueIndicator.style.display = 'block';
            }, 400);
        }
        
        setTimeout(() => {
            existingBubbles.forEach(b => b.classList.add('hidden'));
        }, 300);
        
        this.saveState();
    }
    
    clearButtons() {
        this.elements.buttonArea.innerHTML = '';
        this.pendingButtons = [];
    }
    
    addButton(text, callback, type = 'choice') {
        const buttonData = { text, callback, type };
        if (this.allBubblesShown) {
            this.createButton(buttonData);
        } else {
            this.pendingButtons.push(buttonData);
        }
    }
    
    createButton(buttonData) {
        const button = document.createElement('button');
        button.textContent = buttonData.text;
        button.className = `vn-button-${buttonData.type}`;
        button.addEventListener('click', buttonData.callback);
        this.elements.buttonArea.appendChild(button);
    }
    
    showPendingButtons() {
        this.pendingButtons.forEach(buttonData => this.createButton(buttonData));
        this.pendingButtons = [];
    }
    
    setLeftModule(title, content, onMount = null) {
        this.elements.leftModule.innerHTML = `
            <div class="vn-module-title">${title}</div>
            <div class="vn-module-content">${content}</div>
        `;
        this.elements.leftModule.classList.add('active');
        if (onMount) onMount();
    }
    
    setRightModule(title, content, onMount = null) {
        this.elements.rightModule.innerHTML = `
            <div class="vn-module-title">${title}</div>
            <div class="vn-module-content">${content}</div>
        `;
        this.elements.rightModule.classList.add('active');
        if (onMount) onMount();
    }
    
    clearLeftModule() {
        this.elements.leftModule.innerHTML = '';
        this.elements.leftModule.classList.remove('active');
    }
    
    clearRightModule() {
        this.elements.rightModule.innerHTML = '';
        this.elements.rightModule.classList.remove('active');
    }
    
    loadStage(stageId, newData = {}) {
        this.stageData = { ...this.stageData, ...newData };
        
        const stage = this.stages.find(s => s.id === stageId);
        if (!stage) {
            console.error('❌ VNTaskDisplay: Stage not found:', stageId);
            return;
        }
        
        this.currentStageId = stageId;
        this.clearBubbles();
        this.clearButtons();
        
        if (stage.image !== undefined) this.setImage(stage.image);
        
        if (stage.leftModule !== undefined) {
            if (stage.leftModule === null) {
                this.clearLeftModule();
            } else {
                const content = typeof stage.leftModule.content === 'function'
                    ? stage.leftModule.content(this.stageData) : stage.leftModule.content;
                this.setLeftModule(stage.leftModule.title, content, stage.leftModule.onMount);
            }
        }
        
        if (stage.rightModule !== undefined) {
            if (stage.rightModule === null) {
                this.clearRightModule();
            } else {
                const content = typeof stage.rightModule.content === 'function'
                    ? stage.rightModule.content(this.stageData) : stage.rightModule.content;
                this.setRightModule(stage.rightModule.title, content, stage.rightModule.onMount);
            }
        }
        
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
        
        if (stage.onMount) stage.onMount(this.stageData, this);
        
        if (stage.choices) {
            stage.choices.forEach(choice => {
                this.addButton(choice.text, () => {
                    const nextStage = choice.onSelect(this.stageData);
                    if (nextStage) this.loadStage(nextStage, choice.data);
                }, 'choice');
            });
        } else if (stage.buttons) {
            stage.buttons.forEach(btn => {
                const btnType = btn.type || 'next';
                this.addButton(btn.text, () => {
                    if (btn.execute) btn.execute(this.stageData);
                    if (btn.onComplete && this.onCompleteCallback) {
                        this.onCompleteCallback();
                    } else if (btn.nextStage) {
                        this.loadStage(btn.nextStage, btn.data);
                    }
                }, btnType);
            });
        } else if (stage.nextStage) {
            this.addButton('Continue', () => this.loadStage(stage.nextStage), 'next');
        } else if (stage.complete) {
            this.addButton('✓ Complete', () => {
                if (this.onCompleteCallback) this.onCompleteCallback();
            }, 'complete');
        }
        
        if (this.bubbles.length > 0) {
            this.advanceBubble();
        } else {
            this.allBubblesShown = true;
            this.showPendingButtons();
        }
        
        if (stage.onUpdate) stage.onUpdate(this.stageData, this);
        
        this.saveState();

        // Background-preload next stage image if it exists
        const stageIndex = this.stages.findIndex(s => s.id === stageId);
        if (stageIndex >= 0 && stageIndex + 1 < this.stages.length) {
            const nextStage = this.stages[stageIndex + 1];
            if (nextStage.image) imagePreloader.preloadInBackground([nextStage.image]);
        }
    }
    
    restoreToBubbleIndex(targetIndex) {
        this.elements.bubblesContainer.innerHTML = '';
        
        for (let i = 0; i < targetIndex && i < this.bubbles.length; i++) {
            const isOld = (i < targetIndex - 1);
            this.addBubbleToDOMSilent(this.bubbles[i], isOld);
        }
        
        this.currentBubbleIndex = targetIndex;
        
        if (this.currentBubbleIndex >= this.bubbles.length) {
            this.allBubblesShown = true;
            this.elements.continueIndicator.style.display = 'none';
            this.showPendingButtons();
        } else {
            this.allBubblesShown = false;
            this.elements.continueIndicator.style.display = 'block';
        }
    }
    
    loadTask(taskDefinition, vnData, onComplete) {
        this.taskDefinition = { ...taskDefinition, filePath: taskDefinition.filePath || null };
        this.onCompleteCallback = onComplete;
        
        if (taskDefinition.execute) {
            try { taskDefinition.execute(this.stageData); } catch (e) { console.error(e); }
        }
        
        if (vnData.image) this.setImage(vnData.image);
        
        if (vnData.leftModule) {
            const content = typeof vnData.leftModule.content === 'function'
                ? vnData.leftModule.content(this.stageData) : vnData.leftModule.content;
            this.setLeftModule(vnData.leftModule.title, content, vnData.leftModule.onMount);
        }
        
        if (vnData.rightModule) {
            const content = typeof vnData.rightModule.content === 'function'
                ? vnData.rightModule.content(this.stageData) : vnData.rightModule.content;
            this.setRightModule(vnData.rightModule.title, content, vnData.rightModule.onMount);
        }
        
        if (vnData.data) this.stageData = { ...vnData.data };
        
        if (vnData.stages && vnData.stages.length > 0) {
            this.stages = vnData.stages;
            this.loadStage(vnData.stages[0].id);
        } else {
            this.clearBubbles();
            this.clearButtons();
            if (vnData.bubbles && vnData.bubbles.length > 0) {
                vnData.bubbles.forEach(bubble => this.addBubble(bubble));
                this.addButton('✓ Complete', () => {
                    if (this.onCompleteCallback) this.onCompleteCallback();
                }, 'complete');
                this.advanceBubble();
            } else {
                this.allBubblesShown = true;
                this.addButton('✓ Complete', () => {
                    if (this.onCompleteCallback) this.onCompleteCallback();
                }, 'complete');
            }
        }
        
        this.saveState();
    }
    
    saveState() {
        window.GAME_STATE.currentInstruction = this.container.innerHTML;
        window.GAME_STATE.vnState = {
            currentBubbleIndex: this.currentBubbleIndex,
            currentStageId: this.currentStageId,
            stageData: this.stageData,
            taskId: this.taskDefinition?.id,
            taskFilePath: this.taskDefinition?.filePath,
            allBubblesShown: this.allBubblesShown,
            bubbleSnapshots: [...this.bubbles],
            currentImageUrl: this.currentImageUrl,
            snakeLadderInfo: this.taskDefinition?.snakeLadderInfo,
            snakeLadderType: this.taskDefinition?.snakeLadderType,
            snakeLadderFromPos: this.taskDefinition?.snakeLadderFromPos,
            snakeLadderToPos: this.taskDefinition?.snakeLadderToPos,
            prizeType: this.taskDefinition?.prizeType,
            isFinalChallenge: this.taskDefinition?.isFinalChallenge,
            taskContext: {
                setId: this.taskDefinition?.setId,
                toyId: this.taskDefinition?.toyId,
                type: this.taskDefinition?.type,
                isFallback: this.taskDefinition?.isFallback
            }
        };
        saveGameState();
    }
}

// Current VN display instance
let currentVN = null;

// ── PRELOAD task images when player lands (before clicking Enter) ──────────
export async function preloadTaskImages(taskDefinition, addRemoveTask = null) {
    console.log('🎬 Preloading images for:', taskDefinition.id);
    
    const conditions = getTaskConditions();
    const difficultyMap = buildDifficultyMap();
    const toyKey = taskDefinition.setId && taskDefinition.toyId
        ? `${taskDefinition.setId}_${taskDefinition.toyId}` : null;
    const primaryDifficulty = toyKey
        ? (window.GAME_STATE.toyDifficulties[toyKey] || 'medium') : 'medium';
    
    let vnData = null;
    try {
        vnData = taskDefinition.getDifficulty(primaryDifficulty, conditions, difficultyMap);
    } catch (e) {
        console.warn('⚠️ preloadTaskImages: getDifficulty threw:', e);
        return;
    }

    if (!vnData || typeof vnData !== 'object') return;

    // Preload first-stage images immediately (blocking)
    const firstUrls = collectVNImages(vnData, true);
    if (firstUrls.length > 0) {
        await imagePreloader.preloadMultiple(firstUrls);
        console.log('✅ Preloaded', firstUrls.length, 'first-stage images');
    }

    // Preload remaining stage images in background
    const allUrls = collectVNImages(vnData, false);
    const remainingUrls = allUrls.filter(u => !firstUrls.includes(u));
    if (remainingUrls.length > 0) {
        imagePreloader.preloadInBackground(remainingUrls);
    }

    // Handle add/remove task — it returns a VN object directly from getHTML()
    if (addRemoveTask) {
        let addRemoveData = null;
        try {
            addRemoveData = addRemoveTask.getHTML ? addRemoveTask.getHTML() : null;
        } catch (e) { /* ignore */ }
        if (addRemoveData && typeof addRemoveData === 'object' && addRemoveData.image) {
            imagePreloader.preloadInBackground([addRemoveData.image]);
        }
    }
}

// ── Load and display a task ───────────────────────────────────────────────
export async function loadAndDisplayTask(taskDefinition, addRemoveTask = null) {
    console.log('🎯 loadAndDisplayTask called:', taskDefinition.id);
    
    const instructions = document.getElementById('instructions');
    if (!instructions) return;
    
    instructions.classList.add('active');
    
    if (!currentVN) {
        currentVN = new VNTaskDisplay();
    } else {
        currentVN.initialize();
    }
    
    const conditions = getTaskConditions();
    const difficultyMap = buildDifficultyMap();
    const toyKey = taskDefinition.setId && taskDefinition.toyId
        ? `${taskDefinition.setId}_${taskDefinition.toyId}` : null;
    const primaryDifficulty = toyKey
        ? (window.GAME_STATE.toyDifficulties[toyKey] || 'medium') : 'medium';
    
    if (taskDefinition.setId && taskDefinition.toyId) {
        const selectedToyKey = `${taskDefinition.setId}_${taskDefinition.toyId}`;
        window.GAME_STATE.turnCountBySet[taskDefinition.setId] =
            (window.GAME_STATE.turnCountBySet[taskDefinition.setId] || 0) + 1;
        window.GAME_STATE.turnCountByToy[selectedToyKey] =
            (window.GAME_STATE.turnCountByToy[selectedToyKey] || 0) + 1;
        window.GAME_STATE.lastSelectedSet[taskDefinition.toyId] = taskDefinition.setId;
    }
    
    const vnData = taskDefinition.getDifficulty(primaryDifficulty, conditions, difficultyMap);
    
    // ── Ensure images are preloaded before displaying ────────────────────
    // This catches cases where preloadTaskImages wasn't called or raced
    const firstUrls = collectVNImages(vnData, true);
    if (firstUrls.length > 0) {
        await imagePreloader.preloadMultiple(firstUrls);
    }

    // Kick off remaining images in background
    const allUrls = collectVNImages(vnData, false);
    const remainingUrls = allUrls.filter(u => !firstUrls.includes(u));
    if (remainingUrls.length > 0) {
        imagePreloader.preloadInBackground(remainingUrls);
    }
    
    // Add add/remove task bubbles at the beginning
    if (addRemoveTask && addRemoveTask.getHTML) {
        const addRemoveData = addRemoveTask.getHTML();
        // addRemoveData is a VN object — prepend its bubbles
        if (vnData.bubbles && addRemoveData && addRemoveData.bubbles) {
            vnData.bubbles = [...addRemoveData.bubbles, ...vnData.bubbles];
        }
        // Preload add/remove image if present
        if (addRemoveData && addRemoveData.image) {
            imagePreloader.preloadInBackground([addRemoveData.image]);
        }
    }
    
    currentVN.loadTask(taskDefinition, vnData, () => {
        if (window.GAME_FUNCTIONS && window.GAME_FUNCTIONS.completeTask) {
            window.GAME_FUNCTIONS.completeTask();
        }
    });
}

// ── Load and display snake/ladder task ────────────────────────────────────
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
    const difficultyMap = buildDifficultyMap();
    const vnData = task.getDifficulty('medium', conditions, difficultyMap, snakeLadderInfo);
    
    // Preload images before displaying
    const firstUrls = collectVNImages(vnData, true);
    if (firstUrls.length > 0) await imagePreloader.preloadMultiple(firstUrls);
    
    const taskWithContext = {
        ...task,
        snakeLadderInfo,
        snakeLadderType: type,
        snakeLadderFromPos: fromPos,
        snakeLadderToPos: toPos
    };
    
    currentVN.loadTask(taskWithContext, vnData, () => {
        if (window.GAME_FUNCTIONS && window.GAME_FUNCTIONS.completeTask) {
            window.GAME_FUNCTIONS.completeTask();
        }
    });
}

// ── Load and display final challenge ─────────────────────────────────────
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
    const difficultyMap = buildDifficultyMap();
    const vnData = task.getDifficulty(null, conditions, difficultyMap, prizeType);
    
    // Preload images before displaying
    const firstUrls = collectVNImages(vnData, true);
    if (firstUrls.length > 0) await imagePreloader.preloadMultiple(firstUrls);
    
    const taskWithContext = { ...task, prizeType, isFinalChallenge: true };
    
    currentVN.loadTask(taskWithContext, vnData, () => {
        // Final challenge complete — no further action needed
    });
}

// ── Determine prize type ──────────────────────────────────────────────────
function determinePrize() {
    const prizeSettings = window.GAME_STATE.prizeSettings;
    const roll = Math.random() * 100;
    return roll < prizeSettings.full ? 'full'
        : roll < prizeSettings.full + prizeSettings.ruin ? 'ruin'
        : 'none';
}

// ── Build difficulty map ──────────────────────────────────────────────────
function buildDifficultyMap() {
    const difficultyMap = {};
    for (const [toyKey, diff] of Object.entries(window.GAME_STATE.toyDifficulties)) {
        const [setId, ...toyIdParts] = toyKey.split('_');
        const toyId = toyIdParts.join('_');
        if (!difficultyMap[toyId]) difficultyMap[toyId] = diff;
    }
    return difficultyMap;
}

// ── Load task definition from file ───────────────────────────────────────
async function loadTaskDefinition(filePath) {
    try {
        const module = await import(`/salvn/${filePath}`);
        return module.default;
    } catch (error) {
        console.error(`Failed to load ${filePath}:`, error);
        return null;
    }
}

// ── Restore VN state ─────────────────────────────────────────────────────
export async function restoreVNState() {
    if (!window.GAME_STATE?.vnState || !window.GAME_STATE.currentInstruction) return;
    
    try {
        const vnState = window.GAME_STATE.vnState;
        const instructions = document.getElementById('instructions');
        if (!instructions) return;
        
        if (vnState.bubbleSnapshots && vnState.bubbleSnapshots.length > 0) {
            let taskDef;
            let vnData;
            
            if (vnState.isFinalChallenge) {
                taskDef = window.selectFinalChallenge();
                const conditions = getTaskConditions();
                const difficultyMap = buildDifficultyMap();
                vnData = taskDef.getDifficulty(null, conditions, difficultyMap, vnState.prizeType);
                taskDef = { ...taskDef, prizeType: vnState.prizeType, isFinalChallenge: true };
                
            } else if (vnState.snakeLadderInfo) {
                const { task, snakeLadderInfo } = window.selectSnakeLadderTask(
                    vnState.snakeLadderType, vnState.snakeLadderFromPos, vnState.snakeLadderToPos);
                taskDef = task;
                const conditions = getTaskConditions();
                const difficultyMap = buildDifficultyMap();
                vnData = taskDef.getDifficulty('medium', conditions, difficultyMap, snakeLadderInfo);
                taskDef = { ...taskDef, snakeLadderInfo, snakeLadderType: vnState.snakeLadderType,
                    snakeLadderFromPos: vnState.snakeLadderFromPos, snakeLadderToPos: vnState.snakeLadderToPos };
                
            } else if (vnState.taskFilePath) {
                taskDef = await loadTaskDefinition(vnState.taskFilePath);
                if (!taskDef) { fallbackToHTMLRestore(instructions, vnState); return; }
                const conditions = getTaskConditions();
                const difficultyMap = buildDifficultyMap();
                const toyKey = taskDef.setId && taskDef.toyId
                    ? `${taskDef.setId}_${taskDef.toyId}` : null;
                const primaryDifficulty = toyKey
                    ? (window.GAME_STATE.toyDifficulties[toyKey] || 'medium') : 'medium';
                vnData = taskDef.getDifficulty(primaryDifficulty, conditions, difficultyMap);
                taskDef = { ...taskDef, filePath: taskDef.filePath || vnState.taskFilePath };
                
            } else {
                fallbackToHTMLRestore(instructions, vnState);
                return;
            }
            
            // Preload the SAVED image
            if (vnState.currentImageUrl) {
                await imagePreloader.preload(vnState.currentImageUrl);
            }
            
            instructions.classList.add('active');
            
            if (!currentVN) {
                currentVN = new VNTaskDisplay();
            } else {
                currentVN.initialize();
            }
            
            currentVN.taskDefinition = taskDef;
            currentVN.onCompleteCallback = () => {
                if (window.GAME_FUNCTIONS?.completeTask) window.GAME_FUNCTIONS.completeTask();
            };
            
            if (vnState.stageData) currentVN.stageData = vnState.stageData;
            if (vnState.currentImageUrl) currentVN.setImage(vnState.currentImageUrl);
            
            if (vnData.stages && vnData.stages.length > 0) {
                currentVN.stages = vnData.stages;
                currentVN.currentStageId = vnState.currentStageId || vnData.stages[0].id;
                
                const stage = currentVN.stages.find(s => s.id === currentVN.currentStageId);
                if (stage) {
                    if (stage.choices) {
                        stage.choices.forEach(choice => {
                            currentVN.addButton(choice.text, () => {
                                const nextStage = choice.onSelect(currentVN.stageData);
                                if (nextStage) currentVN.loadStage(nextStage, choice.data);
                            }, 'choice');
                        });
                    } else if (stage.buttons) {
                        stage.buttons.forEach(btn => {
                            const btnType = btn.type || 'next';
                            currentVN.addButton(btn.text, () => {
                                if (btn.execute) btn.execute(currentVN.stageData);
                                if (btn.onComplete && currentVN.onCompleteCallback) {
                                    currentVN.onCompleteCallback();
                                } else if (btn.nextStage) {
                                    currentVN.loadStage(btn.nextStage, btn.data);
                                }
                            }, btnType);
                        });
                    } else if (stage.complete) {
                        currentVN.addButton('✓ Complete', () => {
                            if (currentVN.onCompleteCallback) currentVN.onCompleteCallback();
                        }, 'complete');
                    }
                }
            } else {
                currentVN.addButton('✓ Complete', () => {
                    if (currentVN.onCompleteCallback) currentVN.onCompleteCallback();
                }, 'complete');
            }
            
            currentVN.bubbles = vnState.bubbleSnapshots;
            currentVN.restoreToBubbleIndex(vnState.currentBubbleIndex || 1);
            
        } else {
            fallbackToHTMLRestore(instructions, vnState);
        }
    } catch (error) {
        console.error('❌ Error restoring VN state:', error);
    }
}

function fallbackToHTMLRestore(instructions, vnState) {
    instructions.innerHTML = window.GAME_STATE.currentInstruction;
    instructions.classList.add('active');
    
    if (!currentVN) currentVN = new VNTaskDisplay();
    
    currentVN.container = instructions;
    currentVN.elements = {
        leftModule: instructions.querySelector('.vn-left-module'),
        rightModule: instructions.querySelector('.vn-right-module'),
        centerContent: instructions.querySelector('.vn-center-content'),
        imageContainer: instructions.querySelector('.vn-image-container'),
        image: instructions.querySelector('.vn-image-container img'),
        textArea: instructions.querySelector('.vn-text-area'),
        bubblesContainer: instructions.querySelector('.vn-bubbles-container'),
        buttonArea: instructions.querySelector('.vn-button-area'),
        continueIndicator: instructions.querySelector('.vn-continue-indicator')
    };
    
    if (!currentVN.elements.textArea || !currentVN.elements.buttonArea) return;
    
    if (vnState) {
        currentVN.currentBubbleIndex = vnState.currentBubbleIndex || 0;
        currentVN.currentStageId = vnState.currentStageId;
        currentVN.stageData = vnState.stageData || {};
        currentVN.allBubblesShown = vnState.allBubblesShown || false;
        currentVN.currentImageUrl = vnState.currentImageUrl || null;
    }
    
    currentVN.onCompleteCallback = () => {
        if (window.GAME_FUNCTIONS?.completeTask) window.GAME_FUNCTIONS.completeTask();
    };
    
    currentVN.elements.textArea.onclick = () => currentVN.advanceBubble();
    
    const buttons = currentVN.elements.buttonArea.querySelectorAll('button');
    buttons.forEach(button => {
        if (button.textContent.includes('Complete')) {
            button.onclick = () => {
                if (currentVN.onCompleteCallback) currentVN.onCompleteCallback();
            };
        }
    });
}

export function getCurrentVN() {
    return currentVN;
}

// Expose globally
window.displayRandomInstruction = async () => {
    const task = window.selectNextTask();
    if (task) await loadAndDisplayTask(task);
};

window.displayRandomInstructionWithAddRemove = async (addRemoveTask) => {
    const task = window.selectNextTask();
    if (task) await loadAndDisplayTask(task, addRemoveTask);
};

window.preloadTaskImages = preloadTaskImages;
window.displaySnakeLadderTask = loadAndDisplaySnakeLadderTask;
window.displayFinalChallenge = loadAndDisplayFinalChallenge;
window.restoreVNState = restoreVNState;
