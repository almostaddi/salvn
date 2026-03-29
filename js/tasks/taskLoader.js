// Detect base path for imports (GitHub Pages vs local)
const BASE_PATH = window.location.hostname.includes('github.io') || window.location.pathname.startsWith('/salvn/') ? '/salvn/' : '/';

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
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.cache.set(url, img);
                console.log('🖼️ Preloaded image:', url);
                resolve();
            };
            img.onerror = () => {
                console.warn('⚠️ Failed to preload image:', url);
                reject();
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
        
        if (uniqueUrls.length === 0) {
            console.log('🖼️ All images already cached');
            return;
        }
        
        console.log(`🖼️ Background preloading ${uniqueUrls.length} images...`);
        
        // Fire and forget - don't await
        uniqueUrls.forEach(url => {
            this.preload(url).catch(err => {
                console.warn('⚠️ Background preload failed for:', url);
            });
        });
    }
}

const imagePreloader = new ImagePreloader();

// VN Task Display Class
class VNTaskDisplay {
    constructor(containerId = 'instructions') {
        console.log('🎬 VNTaskDisplay: Constructor called');
        this.container = document.getElementById(containerId);
        
        if (!this.container) {
            console.error('❌ VNTaskDisplay: Container not found:', containerId);
            return;
        }
        
        console.log('✅ VNTaskDisplay: Container found');
        
        this.currentBubbleIndex = 0;
        this.bubbles = [];
        this.currentStageId = null;
        this.stageData = {};
        this.taskDefinition = null;
        this.stages = [];
        this.onCompleteCallback = null;
        this.allBubblesShown = false;
        this.pendingButtons = [];
        this.currentImageUrl = null; // Track current image
        
        this.elements = {};
        this.initialize();
    }
    
    initialize() {
        console.log('🎬 VNTaskDisplay: Initialize called');
        
        if (!this.container) {
            console.error('❌ VNTaskDisplay: No container in initialize');
            return;
        }
        
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
        
        console.log('✅ VNTaskDisplay: HTML structure created');
        
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
        
        console.log('✅ VNTaskDisplay: Elements cached');
        
        // Click handler for text area
        if (this.elements.textArea) {
            this.elements.textArea.addEventListener('click', () => this.advanceBubble());
            console.log('✅ VNTaskDisplay: Click handler attached');
        } else {
            console.error('❌ VNTaskDisplay: Text area not found');
        }
    }
    
    // Set image (now instant since preloaded)
    setImage(imageUrl) {
        if (!imageUrl) {
            this.elements.imageContainer.classList.add('hidden');
            this.currentImageUrl = null;
            return;
        }
        
        this.elements.image.src = imageUrl;
        this.elements.imageContainer.classList.remove('hidden');
        this.currentImageUrl = imageUrl;
        console.log('🖼️ VNTaskDisplay: Image set:', imageUrl);
    }
    
    // Add bubble
    addBubble(content) {
        this.bubbles.push(content);
        console.log('💬 VNTaskDisplay: Bubble added, total:', this.bubbles.length);
    }
    
    // Clear bubbles
    clearBubbles() {
        this.bubbles = [];
        this.currentBubbleIndex = 0;
        this.allBubblesShown = false;
        this.elements.bubblesContainer.innerHTML = '';
        console.log('🧹 VNTaskDisplay: Bubbles cleared');
    }
    
    // Silently add bubble to DOM without animation (for restoration)
    addBubbleToDOMSilent(content, isOld = false) {
        const bubble = document.createElement('div');
        bubble.className = 'vn-bubble';
        
        // Add moving-up class to old bubbles (faded effect)
        if (isOld) {
            bubble.classList.add('moving-up');
        }
        
        bubble.innerHTML = content;
        this.elements.bubblesContainer.appendChild(bubble);
    }
    
    // Advance to next bubble
    advanceBubble() {
        console.log('👆 VNTaskDisplay: advanceBubble called, index:', this.currentBubbleIndex, 'total:', this.bubbles.length);
        
        if (this.currentBubbleIndex >= this.bubbles.length) {
            console.log('⚠️ VNTaskDisplay: No more bubbles to show');
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
        
        console.log('✅ VNTaskDisplay: Bubble shown, new index:', this.currentBubbleIndex);
        
        // Check if all bubbles have been shown
        if (this.currentBubbleIndex >= this.bubbles.length) {
            this.allBubblesShown = true;
            console.log('✅ VNTaskDisplay: All bubbles shown - showing buttons');
            this.showPendingButtons();
        } else {
            // Show continue indicator if more bubbles
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
        this.pendingButtons = [];
    }
    
    // Add button (stores it if bubbles not shown yet)
    addButton(text, callback, type = 'choice') {
        const buttonData = { text, callback, type };
        
        if (this.allBubblesShown) {
            // Show immediately
            this.createButton(buttonData);
        } else {
            // Store for later
            this.pendingButtons.push(buttonData);
            console.log('📦 VNTaskDisplay: Button queued:', text, type);
        }
    }
    
    // Actually create and show a button
    createButton(buttonData) {
        const button = document.createElement('button');
        button.textContent = buttonData.text;
        button.className = `vn-button-${buttonData.type}`;
        button.addEventListener('click', buttonData.callback);
        this.elements.buttonArea.appendChild(button);
        console.log('🔘 VNTaskDisplay: Button shown:', buttonData.text, buttonData.type);
    }
    
    // Show all pending buttons
    showPendingButtons() {
        console.log('🎯 VNTaskDisplay: Showing', this.pendingButtons.length, 'pending buttons');
        this.pendingButtons.forEach(buttonData => {
            this.createButton(buttonData);
        });
        this.pendingButtons = [];
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
        console.log('📦 VNTaskDisplay: Left module set:', title);
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
        console.log('📦 VNTaskDisplay: Right module set:', title);
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
        console.log('🎭 VNTaskDisplay: Loading stage:', stageId);
        
        // Merge data
        this.stageData = { ...this.stageData, ...newData };
        
        const stage = this.stages.find(s => s.id === stageId);
        if (!stage) {
            console.error('❌ VNTaskDisplay: Stage not found:', stageId);
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
        
        // Call onMount if present
        if (stage.onMount) {
            stage.onMount(this.stageData, this);
        }
        
        // Add buttons (will be queued until bubbles are shown)
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
                    // ── FIX: if execute() returns false, block navigation ──
                    if (btn.execute) {
                        const result = btn.execute(this.stageData);
                        if (result === false) return;
                    }
                    // ─────────────────────────────────────────────────────
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
            // FIX BUG 3: Queue complete button like other buttons
            this.addButton('✓ Complete', () => {
                if (this.onCompleteCallback) {
                    this.onCompleteCallback();
                }
            }, 'complete');
        }
        
        // Show first bubble AFTER buttons are queued
        if (this.bubbles.length > 0) {
            this.advanceBubble();
        } else {
            console.warn('⚠️ VNTaskDisplay: Stage has no bubbles');
            this.allBubblesShown = true;
            // If no bubbles, show buttons immediately
            this.showPendingButtons();
        }
        
        // Call onUpdate if present
        if (stage.onUpdate) {
            stage.onUpdate(this.stageData, this);
        }
        
        this.saveState();
        console.log('✅ VNTaskDisplay: Stage loaded:', stageId);
    }
    
    // Restore to a specific bubble index silently (no animations)
    restoreToBubbleIndex(targetIndex) {
        console.log('🔄 VNTaskDisplay: Restoring to bubble index:', targetIndex);
        
        // Clear any existing bubbles in DOM
        this.elements.bubblesContainer.innerHTML = '';
        
        // Add all bubbles up to target index silently
        // All bubbles except the last one should be "old" (faded)
        for (let i = 0; i < targetIndex && i < this.bubbles.length; i++) {
            const isOld = (i < targetIndex - 1); // All except current bubble are old
            this.addBubbleToDOMSilent(this.bubbles[i], isOld);
        }
        
        // Update state
        this.currentBubbleIndex = targetIndex;
        
        // Check if all bubbles shown
        if (this.currentBubbleIndex >= this.bubbles.length) {
            this.allBubblesShown = true;
            this.elements.continueIndicator.style.display = 'none';
            this.showPendingButtons();
        } else {
            this.allBubblesShown = false;
            this.elements.continueIndicator.style.display = 'block';
        }
        
        console.log('✅ VNTaskDisplay: Restored to bubble index', this.currentBubbleIndex);
    }
    
    // Load task from definition
    loadTask(taskDefinition, vnData, onComplete) {
        console.log('🎮 VNTaskDisplay: Loading task:', taskDefinition.id);
        console.log('📋 VNTaskDisplay: VN Data:', vnData);
        
        // Save file path for restoration
        this.taskDefinition = {
            ...taskDefinition,
            filePath: taskDefinition.filePath || null
        };
        this.onCompleteCallback = onComplete;
        
        // Execute task logic if present
        if (taskDefinition.execute) {
            try {
                taskDefinition.execute(this.stageData);
                console.log('✅ VNTaskDisplay: Task execute() called');
            } catch (error) {
                console.error('❌ VNTaskDisplay: Error in task execute():', error);
            }
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
            console.log('🎭 VNTaskDisplay: Task has stages:', vnData.stages.length);
            this.stages = vnData.stages;
            this.loadStage(vnData.stages[0].id);
        } else {
            console.log('💬 VNTaskDisplay: Simple task (no stages)');
            // Simple task without stages
            this.clearBubbles();
            this.clearButtons();
            if (vnData.bubbles && vnData.bubbles.length > 0) {
                // FIX BUG 3: Add ALL bubbles first
                vnData.bubbles.forEach(bubble => this.addBubble(bubble));
                
                // Then queue the complete button BEFORE showing first bubble
                this.addButton('✓ Complete', () => {
                    if (this.onCompleteCallback) {
                        this.onCompleteCallback();
                    }
                }, 'complete');
                
                // Finally show first bubble after button is queued
                this.advanceBubble();
            } else {
                console.error('❌ VNTaskDisplay: No bubbles in task!');
                // No bubbles - add button and show immediately
                this.allBubblesShown = true;
                this.addButton('✓ Complete', () => {
                    if (this.onCompleteCallback) {
                        this.onCompleteCallback();
                    }
                }, 'complete');
            }
        }
        
        this.saveState();
        console.log('✅ VNTaskDisplay: Task loaded successfully');
    }
    
    // Save current state with bubble content snapshots AND current image
    saveState() {
        window.GAME_STATE.currentInstruction = this.container.innerHTML;
        window.GAME_STATE.vnState = {
            currentBubbleIndex: this.currentBubbleIndex,
            currentStageId: this.currentStageId,
            stageData: this.stageData,
            taskId: this.taskDefinition?.id,
            taskFilePath: this.taskDefinition?.filePath,
            allBubblesShown: this.allBubblesShown,
            
            // Save actual bubble HTML content (snapshot)
            bubbleSnapshots: [...this.bubbles],
            
            // Save current image URL
            currentImageUrl: this.currentImageUrl,
            
            // Save snake/ladder context
            snakeLadderInfo: this.taskDefinition?.snakeLadderInfo,
            snakeLadderType: this.taskDefinition?.snakeLadderType,
            snakeLadderFromPos: this.taskDefinition?.snakeLadderFromPos,
            snakeLadderToPos: this.taskDefinition?.snakeLadderToPos,
            
            // Save final challenge context
            prizeType: this.taskDefinition?.prizeType,
            isFinalChallenge: this.taskDefinition?.isFinalChallenge,
            
            // Save complete task context for restoration
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

// Extract image URLs from current stage only
function extractCurrentStageImageUrls(vnData, currentStageId = null) {
    const urls = [];
    
    // Main image (for simple tasks)
    if (vnData.image) {
        urls.push(vnData.image);
    }
    
    // Current stage image (for multi-stage tasks)
    if (vnData.stages && currentStageId) {
        const currentStage = vnData.stages.find(s => s.id === currentStageId);
        if (currentStage && currentStage.image) {
            urls.push(currentStage.image);
        }
    } else if (vnData.stages && vnData.stages.length > 0) {
        // If no currentStageId specified, get first stage
        if (vnData.stages[0].image) {
            urls.push(vnData.stages[0].image);
        }
    }
    
    return urls;
}

// Extract image URLs from remaining stages (for background preloading)
function extractRemainingStageImageUrls(vnData, currentStageId = null) {
    const urls = [];
    
    if (!vnData.stages || vnData.stages.length === 0) {
        return urls;
    }
    
    // Find current stage index
    let startIndex = 0;
    if (currentStageId) {
        const currentIndex = vnData.stages.findIndex(s => s.id === currentStageId);
        if (currentIndex >= 0) {
            startIndex = currentIndex + 1; // Start from next stage
        }
    } else {
        startIndex = 1; // Skip first stage (already loaded)
    }
    
    // Get all remaining stage images
    for (let i = startIndex; i < vnData.stages.length; i++) {
        if (vnData.stages[i].image) {
            urls.push(vnData.stages[i].image);
        }
    }
    
    return urls;
}

// PRELOAD task images when player lands (before clicking Enter)
export async function preloadTaskImages(taskDefinition, addRemoveTask = null) {
    console.log('🎬 Preloading images for:', taskDefinition.id);
    
    const conditions = getTaskConditions();
    const difficultyMap = buildDifficultyMap();
    
    const toyKey = taskDefinition.setId && taskDefinition.toyId ? 
        `${taskDefinition.setId}_${taskDefinition.toyId}` : null;
    const primaryDifficulty = toyKey ? 
        (window.GAME_STATE.toyDifficulties[toyKey] || 'medium') : 
        'medium';
    
    const taskContent = taskDefinition.getDifficulty(primaryDifficulty, conditions, difficultyMap);
    const vnData = taskContent;
    
    if (addRemoveTask && addRemoveTask.getHTML) {
        const addRemoveHTML = addRemoveTask.getHTML();
        const parsed = addRemoveHTML;
        if (parsed.image) {
            await imagePreloader.preload(parsed.image);
        }
    }
    
    const currentImageUrls = extractCurrentStageImageUrls(vnData);
    if (currentImageUrls.length > 0) {
        await imagePreloader.preloadMultiple(currentImageUrls);
        console.log('✅ Preloaded', currentImageUrls.length, 'current stage images');
    }
    
    const remainingImageUrls = extractRemainingStageImageUrls(vnData);
    if (remainingImageUrls.length > 0) {
        imagePreloader.preloadInBackground(remainingImageUrls);
        console.log(`🔄 Background preloading ${remainingImageUrls.length} remaining images...`);
    }
}

// Load and display a task
export async function loadAndDisplayTask(taskDefinition, addRemoveTask = null) {
    console.log('🎯 loadAndDisplayTask called');
    console.log('📋 Task:', taskDefinition.id);
    console.log('🔧 Add/Remove:', addRemoveTask ? 'yes' : 'no');
    
    const instructions = document.getElementById('instructions');
    if (!instructions) {
        console.error('❌ Instructions container not found!');
        return;
    }
    
    instructions.classList.add('active');
    console.log('✅ Instructions container activated');
    
    if (!currentVN) {
        console.log('🆕 Creating new VN instance');
        currentVN = new VNTaskDisplay();
    } else {
        console.log('♻️ Reinitializing existing VN instance');
        currentVN.initialize();
    }
    
    const conditions = getTaskConditions();
    const difficultyMap = buildDifficultyMap();
    
    const toyKey = taskDefinition.setId && taskDefinition.toyId ? 
        `${taskDefinition.setId}_${taskDefinition.toyId}` : null;
    const primaryDifficulty = toyKey ? 
        (window.GAME_STATE.toyDifficulties[toyKey] || 'medium') : 
        'medium';
    
    console.log('🎚️ Difficulty:', primaryDifficulty);
    
    if (taskDefinition.setId && taskDefinition.toyId) {
        const selectedToyKey = `${taskDefinition.setId}_${taskDefinition.toyId}`;
        window.GAME_STATE.turnCountBySet[taskDefinition.setId] = 
            (window.GAME_STATE.turnCountBySet[taskDefinition.setId] || 0) + 1;
        window.GAME_STATE.turnCountByToy[selectedToyKey] = 
            (window.GAME_STATE.turnCountByToy[selectedToyKey] || 0) + 1;
        window.GAME_STATE.lastSelectedSet[taskDefinition.toyId] = taskDefinition.setId;
    }
    
    console.log('📝 Getting task content...');
    const taskContent = taskDefinition.getDifficulty(primaryDifficulty, conditions, difficultyMap);
    console.log('✅ Task content received:', typeof taskContent);
    
    const vnData = taskContent;
    
    if (addRemoveTask && addRemoveTask.getHTML) {
        console.log('🔧 Adding add/remove task bubbles');
        const addRemoveHTML = addRemoveTask.getHTML();
        const parsed = addRemoveHTML;
        
        if (vnData.bubbles && parsed.bubbles) {
            vnData.bubbles = [...parsed.bubbles, ...vnData.bubbles];
            console.log('✅ Add/remove bubbles prepended, total:', vnData.bubbles.length);
        }
    }
    
    if (vnData.stages && vnData.stages.length > 1) {
        const remainingImageUrls = extractRemainingStageImageUrls(vnData);
        if (remainingImageUrls.length > 0) {
            imagePreloader.preloadInBackground(remainingImageUrls);
        }
    }
    
    console.log('🚀 Loading task into VN display...');
    currentVN.loadTask(taskDefinition, vnData, () => {
        if (window.GAME_FUNCTIONS && window.GAME_FUNCTIONS.completeTask) {
            window.GAME_FUNCTIONS.completeTask();
        }
    });
    
    console.log('✅ loadAndDisplayTask complete');
}

// Load and display snake/ladder task
export async function loadAndDisplaySnakeLadderTask(type, fromPos, toPos) {
    console.log('🐍 loadAndDisplaySnakeLadderTask called:', type);
    
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
    
    const taskContent = task.getDifficulty('medium', conditions, difficultyMap, snakeLadderInfo);
    const vnData = taskContent;
    
    const taskWithContext = {
        ...task,
        snakeLadderInfo: snakeLadderInfo,
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

// Load and display final challenge
export async function loadAndDisplayFinalChallenge() {
    console.log('🏆 loadAndDisplayFinalChallenge called');
    
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
    
    const taskContent = task.getDifficulty(null, conditions, difficultyMap, prizeType);
    const vnData = taskContent;
    
    const taskWithContext = {
        ...task,
        prizeType: prizeType,
        isFinalChallenge: true
    };
    
    currentVN.loadTask(taskWithContext, vnData, () => {
        // Final challenge complete - no callback needed
    });
}

// Determine prize type
function determinePrize() {
    const prizeSettings = window.GAME_STATE.prizeSettings;
    const roll = Math.random() * 100;
    return roll < prizeSettings.full ? 'full' : 
           roll < prizeSettings.full + prizeSettings.ruin ? 'ruin' : 'none';
}

// Helper: Build difficulty map
function buildDifficultyMap() {
    const difficultyMap = {};
    for (const [toyKey, diff] of Object.entries(window.GAME_STATE.toyDifficulties)) {
        const [setId, ...toyIdParts] = toyKey.split('_');
        const toyId = toyIdParts.join('_');
        if (!difficultyMap[toyId]) {
            difficultyMap[toyId] = diff;
        }
    }
    return difficultyMap;
}

// Helper: Load task definition from file
async function loadTaskDefinition(filePath) {
    try {
        const module = await import(`${BASE_PATH}${filePath}`);
        return module.default;
    } catch (error) {
        console.error(`Failed to load ${filePath}:`, error);
        return null;
    }
}

// Restore VN state using saved bubble snapshots AND saved image
export async function restoreVNState() {
    console.log('🔄 restoreVNState called');
    
    if (!window.GAME_STATE || !window.GAME_STATE.vnState || !window.GAME_STATE.currentInstruction) {
        console.log('ℹ️ No VN state to restore');
        return;
    }
    
    try {
        const vnState = window.GAME_STATE.vnState;
        const instructions = document.getElementById('instructions');
        
        if (!instructions) {
            console.error('❌ Instructions container not found');
            return;
        }
        
        if (vnState.bubbleSnapshots && vnState.bubbleSnapshots.length > 0) {
            console.log('✅ Using bubble snapshots for restoration (new method)');
            
            let taskDef;
            let vnData;
            
            if (vnState.isFinalChallenge) {
                console.log('🏆 Restoring final challenge task');
                taskDef = window.selectFinalChallenge();
                
                const conditions = getTaskConditions();
                const difficultyMap = buildDifficultyMap();
                const taskContent = taskDef.getDifficulty(null, conditions, difficultyMap, vnState.prizeType);
                
                vnData = taskContent;
                    
                taskDef = {
                    ...taskDef,
                    prizeType: vnState.prizeType,
                    isFinalChallenge: true
                };
                
            } else if (vnState.snakeLadderInfo) {
                console.log('🐍 Restoring snake/ladder task');
                const { task, snakeLadderInfo } = window.selectSnakeLadderTask(
                    vnState.snakeLadderType,
                    vnState.snakeLadderFromPos,
                    vnState.snakeLadderToPos
                );
                taskDef = task;
                
                const conditions = getTaskConditions();
                const difficultyMap = buildDifficultyMap();
                const taskContent = taskDef.getDifficulty('medium', conditions, difficultyMap, snakeLadderInfo);
                
                vnData = taskContent;
                    
                taskDef = {
                    ...taskDef,
                    snakeLadderInfo: snakeLadderInfo,
                    snakeLadderType: vnState.snakeLadderType,
                    snakeLadderFromPos: vnState.snakeLadderFromPos,
                    snakeLadderToPos: vnState.snakeLadderToPos
                };
                
            } else if (vnState.taskFilePath) {
                console.log('📋 Restoring regular task');
                taskDef = await loadTaskDefinition(vnState.taskFilePath);
                
                if (!taskDef) {
                    console.error('❌ Failed to reload task definition');
                    fallbackToHTMLRestore(instructions, vnState);
                    return;
                }
                
                const conditions = getTaskConditions();
                const difficultyMap = buildDifficultyMap();
                
                const toyKey = taskDef.setId && taskDef.toyId ? 
                    `${taskDef.setId}_${taskDef.toyId}` : null;
                const primaryDifficulty = toyKey ? 
                    (window.GAME_STATE.toyDifficulties[toyKey] || 'medium') : 
                    'medium';
                
                const taskContent = taskDef.getDifficulty(primaryDifficulty, conditions, difficultyMap);
                
                vnData = taskContent;
                    
                taskDef = {
                    ...taskDef,
                    filePath: taskDef.filePath || vnState.taskFilePath
                };
                
            } else {
                console.error('❌ No task context found for restoration');
                fallbackToHTMLRestore(instructions, vnState);
                return;
            }
            
            if (vnState.currentImageUrl) {
                console.log('🖼️ Preloading saved image:', vnState.currentImageUrl);
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
                if (window.GAME_FUNCTIONS && window.GAME_FUNCTIONS.completeTask) {
                    window.GAME_FUNCTIONS.completeTask();
                }
            };
            
            if (vnState.stageData) {
                currentVN.stageData = vnState.stageData;
            }
            
            if (vnState.currentImageUrl) {
                currentVN.setImage(vnState.currentImageUrl);
                console.log('✅ Restored saved image:', vnState.currentImageUrl);
            }
            
            if (vnData.stages && vnData.stages.length > 0) {
                currentVN.stages = vnData.stages;
                currentVN.currentStageId = vnState.currentStageId || vnData.stages[0].id;
                
                const stage = currentVN.stages.find(s => s.id === currentVN.currentStageId);
                
                if (stage) {
                    if (stage.choices) {
                        stage.choices.forEach(choice => {
                            currentVN.addButton(choice.text, () => {
                                const nextStage = choice.onSelect(currentVN.stageData);
                                if (nextStage) {
                                    currentVN.loadStage(nextStage, choice.data);
                                }
                            }, 'choice');
                        });
                    } else if (stage.buttons) {
                        stage.buttons.forEach(btn => {
                            const btnType = btn.type || 'next';
                            currentVN.addButton(btn.text, () => {
                                // ── FIX: if execute() returns false, block navigation ──
                                if (btn.execute) {
                                    const result = btn.execute(currentVN.stageData);
                                    if (result === false) return;
                                }
                                // ─────────────────────────────────────────────────────
                                if (btn.onComplete && currentVN.onCompleteCallback) {
                                    currentVN.onCompleteCallback();
                                } else if (btn.nextStage) {
                                    currentVN.loadStage(btn.nextStage, btn.data);
                                }
                            }, btnType);
                        });
                    } else if (stage.complete) {
                        currentVN.addButton('✓ Complete', () => {
                            if (currentVN.onCompleteCallback) {
                                currentVN.onCompleteCallback();
                            }
                        }, 'complete');
                    }
                }
            } else {
                currentVN.addButton('✓ Complete', () => {
                    if (currentVN.onCompleteCallback) {
                        currentVN.onCompleteCallback();
                    }
                }, 'complete');
            }
            
            currentVN.bubbles = vnState.bubbleSnapshots;
            
            const targetBubbleIndex = vnState.currentBubbleIndex || 1;
            currentVN.restoreToBubbleIndex(targetBubbleIndex);
            
            console.log('✅ Task restored using bubble snapshots and saved image');
            
        } else {
            console.warn('⚠️ No bubble snapshots found, using fallback restore');
            fallbackToHTMLRestore(instructions, vnState);
        }
        
    } catch (error) {
        console.error('❌ Error restoring VN state:', error);
    }
}

// Fallback: Restore HTML and reconnect basic handlers
function fallbackToHTMLRestore(instructions, vnState) {
    console.warn('⚠️ Using HTML-only restore (fallback)');
    
    instructions.innerHTML = window.GAME_STATE.currentInstruction;
    instructions.classList.add('active');
    
    if (!currentVN) {
        currentVN = new VNTaskDisplay();
    }
    
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
    
    if (!currentVN.elements.textArea || !currentVN.elements.buttonArea) {
        console.error('❌ Critical VN elements not found after restore');
        return;
    }
    
    if (vnState) {
        currentVN.currentBubbleIndex = vnState.currentBubbleIndex || 0;
        currentVN.currentStageId = vnState.currentStageId;
        currentVN.stageData = vnState.stageData || {};
        currentVN.allBubblesShown = vnState.allBubblesShown || false;
        currentVN.currentImageUrl = vnState.currentImageUrl || null;
    }
    
    currentVN.onCompleteCallback = () => {
        if (window.GAME_FUNCTIONS && window.GAME_FUNCTIONS.completeTask) {
            window.GAME_FUNCTIONS.completeTask();
        }
    };
    
    if (currentVN.elements.textArea) {
        currentVN.elements.textArea.onclick = () => currentVN.advanceBubble();
        console.log('✅ Text area click handler attached');
    }
    
    const buttons = currentVN.elements.buttonArea.querySelectorAll('button');
    buttons.forEach(button => {
        const text = button.textContent;
        if (text === '✓ Complete' || text.includes('Complete')) {
            button.onclick = () => {
                if (currentVN.onCompleteCallback) {
                    currentVN.onCompleteCallback();
                }
            };
            console.log('✅ Reconnected Complete button');
        }
    });
    
    console.log('✅ HTML-only restore complete');
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

window.preloadTaskImages = preloadTaskImages;
window.displaySnakeLadderTask = loadAndDisplaySnakeLadderTask;
window.displayFinalChallenge = loadAndDisplayFinalChallenge;
window.restoreVNState = restoreVNState;