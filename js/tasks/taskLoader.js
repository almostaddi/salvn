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
        
        // Show first bubble
        if (this.bubbles.length > 0) {
            this.advanceBubble();
        } else {
            console.warn('⚠️ VNTaskDisplay: Stage has no bubbles');
            this.allBubblesShown = true;
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
        
        // If no bubbles, show buttons immediately
        if (this.allBubblesShown) {
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
            if (vnData.bubbles && vnData.bubbles.length > 0) {
                vnData.bubbles.forEach(bubble => this.addBubble(bubble));
                this.advanceBubble();
                
                // Add button (will be queued until bubbles shown)
                this.addButton('✓ Complete', () => {
                    if (this.onCompleteCallback) {
                        this.onCompleteCallback();
                    }
                }, 'complete');
            } else {
                console.error('❌ VNTaskDisplay: No bubbles in task!');
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

// Parse HTML string into VN format (for backward compatibility)
function parseHTMLToVNFormat(htmlContent) {
    console.log('🔄 Parsing HTML to VN format');
    
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
    
    console.log('✅ Parsed:', bubbles.length, 'bubbles, image:', image ? 'yes' : 'no');
    
    return { image, bubbles };
}

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

// Extract all image URLs from VN data (for restoration only)
function extractAllImageUrls(vnData) {
    const urls = [];
    
    // Main image
    if (vnData.image) {
        urls.push(vnData.image);
    }
    
    // Stage images
    if (vnData.stages) {
        vnData.stages.forEach(stage => {
            if (stage.image) {
                urls.push(stage.image);
            }
        });
    }
    
    return urls;
}

// PRELOAD task images when player lands (before clicking Enter)
export async function preloadTaskImages(taskDefinition, addRemoveTask = null) {
    console.log('🎬 Preloading images for:', taskDefinition.id);
    
    const conditions = getTaskConditions();
    
    // Build difficulty map
    const difficultyMap = buildDifficultyMap();
    
    // Get primary difficulty
    const toyKey = taskDefinition.setId && taskDefinition.toyId ? 
        `${taskDefinition.setId}_${taskDefinition.toyId}` : null;
    const primaryDifficulty = toyKey ? 
        (window.GAME_STATE.toyDifficulties[toyKey] || 'medium') : 
        'medium';
    
    // Get task content
    const taskContent = taskDefinition.getDifficulty(primaryDifficulty, conditions, difficultyMap);
    
    // Determine if VN format or HTML string
    let vnData;
    if (typeof taskContent === 'object' && (taskContent.bubbles || taskContent.stages)) {
        vnData = taskContent;
    } else {
        vnData = parseHTMLToVNFormat(taskContent);
    }
    
    // Handle add/remove task
    if (addRemoveTask && addRemoveTask.getHTML) {
        const addRemoveHTML = addRemoveTask.getHTML();
        const parsed = parseHTMLToVNFormat(addRemoveHTML);
        if (parsed.image) {
            await imagePreloader.preload(parsed.image);
        }
    }
    
    // Only preload CURRENT stage images (blocking)
    const currentImageUrls = extractCurrentStageImageUrls(vnData);
    if (currentImageUrls.length > 0) {
        await imagePreloader.preloadMultiple(currentImageUrls);
        console.log('✅ Preloaded', currentImageUrls.length, 'current stage images');
    }
    
    // Preload remaining stage images in background (non-blocking)
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
    
    // Create VN instance if needed
    if (!currentVN) {
        console.log('🆕 Creating new VN instance');
        currentVN = new VNTaskDisplay();
    } else {
        console.log('♻️ Reinitializing existing VN instance');
        currentVN.initialize();
    }
    
    // Get conditions
    const conditions = getTaskConditions();
    
    // Build difficulty map
    const difficultyMap = buildDifficultyMap();
    
    // Get primary difficulty
    const toyKey = taskDefinition.setId && taskDefinition.toyId ? 
        `${taskDefinition.setId}_${taskDefinition.toyId}` : null;
    const primaryDifficulty = toyKey ? 
        (window.GAME_STATE.toyDifficulties[toyKey] || 'medium') : 
        'medium';
    
    console.log('🎚️ Difficulty:', primaryDifficulty);
    
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
    console.log('📝 Getting task content...');
    const taskContent = taskDefinition.getDifficulty(primaryDifficulty, conditions, difficultyMap);
    console.log('✅ Task content received:', typeof taskContent);
    
    // Determine if VN format or HTML string
    let vnData;
    if (typeof taskContent === 'object' && (taskContent.bubbles || taskContent.stages)) {
        // New VN format
        console.log('✨ Using VN format');
        vnData = taskContent;
    } else {
        // Old HTML format - convert
        console.log('🔄 Converting HTML format to VN');
        vnData = parseHTMLToVNFormat(taskContent);
    }
    
    // Add add/remove task bubbles at the beginning
    if (addRemoveTask && addRemoveTask.getHTML) {
        console.log('🔧 Adding add/remove task bubbles');
        const addRemoveHTML = addRemoveTask.getHTML();
        const parsed = parseHTMLToVNFormat(addRemoveHTML);
        
        // Prepend add/remove bubbles
        if (vnData.bubbles) {
            vnData.bubbles = [...parsed.bubbles, ...vnData.bubbles];
            console.log('✅ Add/remove bubbles prepended, total:', vnData.bubbles.length);
        }
    }
    
    // Start background preloading of remaining images (if multi-stage)
    if (vnData.stages && vnData.stages.length > 1) {
        const remainingImageUrls = extractRemainingStageImageUrls(vnData);
        if (remainingImageUrls.length > 0) {
            imagePreloader.preloadInBackground(remainingImageUrls);
        }
    }
    
    // Load task into VN display
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
    
    let vnData;
    if (typeof taskContent === 'object' && (taskContent.bubbles || taskContent.stages)) {
        vnData = taskContent;
    } else {
        vnData = parseHTMLToVNFormat(taskContent);
    }
    
    // Add snake/ladder info to task definition for restoration
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
    
    let vnData;
    if (typeof taskContent === 'object' && (taskContent.bubbles || taskContent.stages)) {
        vnData = taskContent;
    } else {
        vnData = parseHTMLToVNFormat(taskContent);
    }
    
    // Add prize type to task definition for restoration
    const taskWithContext = {
        ...task,
        prizeType: prizeType,
        isFinalChallenge: true
    };
    
    currentVN.loadTask(taskWithContext, vnData, () => {
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
        const module = await import(`/salvn/${filePath}`);
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
        
        // Check if we have bubble snapshots (new format)
        if (vnState.bubbleSnapshots && vnState.bubbleSnapshots.length > 0) {
            console.log('✅ Using bubble snapshots for restoration (new method)');
            
            // Handle special task types
            let taskDef;
            let vnData;
            
            if (vnState.isFinalChallenge) {
                console.log('🏆 Restoring final challenge task');
                taskDef = window.selectFinalChallenge();
                
                const conditions = getTaskConditions();
                const difficultyMap = buildDifficultyMap();
                const taskContent = taskDef.getDifficulty(null, conditions, difficultyMap, vnState.prizeType);
                
                vnData = typeof taskContent === 'object' && (taskContent.bubbles || taskContent.stages)
                    ? taskContent
                    : parseHTMLToVNFormat(taskContent);
                    
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
                
                vnData = typeof taskContent === 'object' && (taskContent.bubbles || taskContent.stages)
                    ? taskContent
                    : parseHTMLToVNFormat(taskContent);
                    
                taskDef = {
                    ...taskDef,
                    snakeLadderInfo: snakeLadderInfo,
                    snakeLadderType: vnState.snakeLadderType,
                    snakeLadderFromPos: vnState.snakeLadderFromPos,
                    snakeLadderToPos: vnState.snakeLadderToPos
                };
                
            } else if (vnState.taskFilePath) {
                console.log('📋 Restoring regular task');
                // Load the task definition from file
                taskDef = await loadTaskDefinition(vnState.taskFilePath);
                
                if (!taskDef) {
                    console.error('❌ Failed to reload task definition');
                    fallbackToHTMLRestore(instructions, vnState);
                    return;
                }
                
                // Get conditions and difficulty map
                const conditions = getTaskConditions();
                const difficultyMap = buildDifficultyMap();
                
                const toyKey = taskDef.setId && taskDef.toyId ? 
                    `${taskDef.setId}_${taskDef.toyId}` : null;
                const primaryDifficulty = toyKey ? 
                    (window.GAME_STATE.toyDifficulties[toyKey] || 'medium') : 
                    'medium';
                
                // Regenerate task content
                const taskContent = taskDef.getDifficulty(primaryDifficulty, conditions, difficultyMap);
                
                vnData = typeof taskContent === 'object' && (taskContent.bubbles || taskContent.stages)
                    ? taskContent
                    : parseHTMLToVNFormat(taskContent);
                    
                taskDef = {
                    ...taskDef,
                    filePath: taskDef.filePath || vnState.taskFilePath
                };
                
            } else {
                console.error('❌ No task context found for restoration');
                fallbackToHTMLRestore(instructions, vnState);
                return;
            }
            
            // Preload the SAVED image (not the regenerated one)
            if (vnState.currentImageUrl) {
                console.log('🖼️ Preloading saved image:', vnState.currentImageUrl);
                await imagePreloader.preload(vnState.currentImageUrl);
            }
            
            // Show instructions
            instructions.classList.add('active');
            
            // Recreate VN instance
            if (!currentVN) {
                currentVN = new VNTaskDisplay();
            } else {
                currentVN.initialize();
            }
            
            // Set up VN
            currentVN.taskDefinition = taskDef;
            currentVN.onCompleteCallback = () => {
                if (window.GAME_FUNCTIONS && window.GAME_FUNCTIONS.completeTask) {
                    window.GAME_FUNCTIONS.completeTask();
                }
            };
            
            // Restore stage data
            if (vnState.stageData) {
                currentVN.stageData = vnState.stageData;
            }
            
            // Set the SAVED image (not regenerated one)
            if (vnState.currentImageUrl) {
                currentVN.setImage(vnState.currentImageUrl);
                console.log('✅ Restored saved image:', vnState.currentImageUrl);
            }
            
            // Load stages structure (for buttons and navigation)
            if (vnData.stages && vnData.stages.length > 0) {
                currentVN.stages = vnData.stages;
                currentVN.currentStageId = vnState.currentStageId || vnData.stages[0].id;
                
                const stage = currentVN.stages.find(s => s.id === currentVN.currentStageId);
                
                if (stage) {
                    // Add buttons from stage definition
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
                                if (btn.execute) {
                                    btn.execute(currentVN.stageData);
                                }
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
                // Simple task - add completion button
                currentVN.addButton('✓ Complete', () => {
                    if (currentVN.onCompleteCallback) {
                        currentVN.onCompleteCallback();
                    }
                }, 'complete');
            }
            
            // Use saved bubble snapshots instead of regenerating
            currentVN.bubbles = vnState.bubbleSnapshots;
            
            // Restore to saved bubble index
            const targetBubbleIndex = vnState.currentBubbleIndex || 1;
            currentVN.restoreToBubbleIndex(targetBubbleIndex);
            
            console.log('✅ Task restored using bubble snapshots and saved image');
            
        } else {
            // OLD FORMAT: No bubble snapshots, use fallback
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
    
    // Create fresh VN instance
    if (!currentVN) {
        currentVN = new VNTaskDisplay();
    }
    
    // Re-cache element references after HTML restore
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
    
    // Verify critical elements exist
    if (!currentVN.elements.textArea || !currentVN.elements.buttonArea) {
        console.error('❌ Critical VN elements not found after restore');
        return;
    }
    
    // Restore basic state values
    if (vnState) {
        currentVN.currentBubbleIndex = vnState.currentBubbleIndex || 0;
        currentVN.currentStageId = vnState.currentStageId;
        currentVN.stageData = vnState.stageData || {};
        currentVN.allBubblesShown = vnState.allBubblesShown || false;
        currentVN.currentImageUrl = vnState.currentImageUrl || null;
    }
    
    // CRITICAL: Set the completion callback
    currentVN.onCompleteCallback = () => {
        if (window.GAME_FUNCTIONS && window.GAME_FUNCTIONS.completeTask) {
            window.GAME_FUNCTIONS.completeTask();
        }
    };
    
    // Re-attach text area click handler
    if (currentVN.elements.textArea) {
        currentVN.elements.textArea.onclick = () => currentVN.advanceBubble();
        console.log('✅ Text area click handler attached');
    }
    
    // Re-attach button click handlers
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
