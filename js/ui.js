// UI management - menus, settings, toy library, sliders

import { saveGameState } from './state/gameState.js';

// Initialize UI components
export function initializeUI() {
    setupInstructionSetCheckboxes();
    setupSliders();
    setupFinalChallengeUI();
    renderToyLibrary();
}

// Setup instruction set checkboxes
let isRestoringUI = false;
function setupInstructionSetCheckboxes() {
    const checkboxes = document.querySelectorAll('#instructionSetCheckboxes input[type="checkbox"]');
    
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            if (isRestoringUI) {
                console.log('Skipping renderToyLibrary during UI restore');
                return;
            }
            updateSelectedSets();
            renderToyLibrary();
            saveGameState();
        });
    });
}

// Update selected sets from checkboxes
function updateSelectedSets() {
    window.GAME_STATE.selectedSets = Array.from(
        document.querySelectorAll('#instructionSetCheckboxes input[type="checkbox"]:checked')
    ).map(cb => cb.value);
}

// Setup prize probability sliders
function setupSliders() {
    const ruinSlider = document.getElementById('ruinSlider');
    const fullSlider = document.getElementById('fullSlider');
    const deniedSlider = document.getElementById('deniedSlider');
    
    ruinSlider.addEventListener('input', function() {
        const newRuin = Math.round(parseFloat(this.value));
        const maxAllowed = 100 - Math.round(window.GAME_STATE.prizeSettings.denied);
        window.GAME_STATE.prizeSettings.ruin = newRuin > maxAllowed ? maxAllowed : newRuin;
        window.GAME_STATE.prizeSettings.full = 100 - window.GAME_STATE.prizeSettings.denied - window.GAME_STATE.prizeSettings.ruin;
        updateSliderDisplays();
    });
    
    fullSlider.addEventListener('input', function() {
        const newFull = Math.round(parseFloat(this.value));
        const maxAllowed = 100 - Math.round(window.GAME_STATE.prizeSettings.denied);
        window.GAME_STATE.prizeSettings.full = newFull > maxAllowed ? maxAllowed : newFull;
        window.GAME_STATE.prizeSettings.ruin = 100 - window.GAME_STATE.prizeSettings.denied - window.GAME_STATE.prizeSettings.full;
        updateSliderDisplays();
    });
    
    deniedSlider.addEventListener('input', function() {
        const newDenied = Math.round(parseFloat(this.value));
        
        if (newDenied >= 100) {
            window.GAME_STATE.prizeSettings.ruin = 0;
            window.GAME_STATE.prizeSettings.full = 0;
            window.GAME_STATE.prizeSettings.denied = 100;
        } else {
            const available = 100 - newDenied;
            const currentTotal = Math.round(window.GAME_STATE.prizeSettings.ruin) + Math.round(window.GAME_STATE.prizeSettings.full);
            
            if (available !== currentTotal) {
                const change = available - currentTotal;
                const half = change / 2;
                window.GAME_STATE.prizeSettings.ruin = Math.max(0, Math.round(window.GAME_STATE.prizeSettings.ruin + half));
                window.GAME_STATE.prizeSettings.full = Math.max(0, Math.round(window.GAME_STATE.prizeSettings.full + half));
                
                const actualTotal = window.GAME_STATE.prizeSettings.ruin + window.GAME_STATE.prizeSettings.full;
                window.GAME_STATE.prizeSettings.denied = Math.max(0, 100 - actualTotal);
            } else {
                window.GAME_STATE.prizeSettings.denied = Math.max(0, newDenied);
            }
        }
        
        updateSliderDisplays();
    });
}

// Update slider displays
function updateSliderDisplays(skipSave = false) {
    const prizeSettings = window.GAME_STATE.prizeSettings;
    
    prizeSettings.ruin = Math.round(prizeSettings.ruin * 10) / 10;
    prizeSettings.full = Math.round(prizeSettings.full * 10) / 10;
    prizeSettings.denied = Math.round(prizeSettings.denied * 10) / 10;
    
    document.getElementById('ruinPercent').textContent = prizeSettings.ruin.toFixed(1) + '%';
    document.getElementById('fullPercent').textContent = prizeSettings.full.toFixed(1) + '%';
    document.getElementById('deniedPercent').textContent = prizeSettings.denied.toFixed(1) + '%';
    
    document.getElementById('ruinSlider').value = prizeSettings.ruin;
    document.getElementById('fullSlider').value = prizeSettings.full;
    document.getElementById('deniedSlider').value = prizeSettings.denied;
    
    if (!skipSave) saveGameState();
}

// Setup final challenge UI
function setupFinalChallengeUI() {
    // Final challenge probability sliders
    const strokingSlider = document.getElementById('strokingSlider');
    const vibeSlider = document.getElementById('vibeSlider');
    const analSlider = document.getElementById('analSlider');
    
    strokingSlider.addEventListener('input', function() {
        const newStroking = Math.round(parseFloat(this.value));
        const maxAllowed = 100 - Math.round(window.GAME_STATE.finalChallengeSettings.anal);
        window.GAME_STATE.finalChallengeSettings.stroking = newStroking > maxAllowed ? maxAllowed : newStroking;
        window.GAME_STATE.finalChallengeSettings.vibe = 100 - window.GAME_STATE.finalChallengeSettings.anal - window.GAME_STATE.finalChallengeSettings.stroking;
        updateFinalChallengeDisplays();
    });
    
    vibeSlider.addEventListener('input', function() {
        const newVibe = Math.round(parseFloat(this.value));
        const maxAllowed = 100 - Math.round(window.GAME_STATE.finalChallengeSettings.anal);
        window.GAME_STATE.finalChallengeSettings.vibe = newVibe > maxAllowed ? maxAllowed : newVibe;
        window.GAME_STATE.finalChallengeSettings.stroking = 100 - window.GAME_STATE.finalChallengeSettings.anal - window.GAME_STATE.finalChallengeSettings.vibe;
        updateFinalChallengeDisplays();
    });
    
    analSlider.addEventListener('input', function() {
        const newAnal = Math.round(parseFloat(this.value));
        
        if (newAnal >= 100) {
            window.GAME_STATE.finalChallengeSettings.stroking = 0;
            window.GAME_STATE.finalChallengeSettings.vibe = 0;
            window.GAME_STATE.finalChallengeSettings.anal = 100;
        } else {
            const available = 100 - newAnal;
            const currentTotal = Math.round(window.GAME_STATE.finalChallengeSettings.stroking) + Math.round(window.GAME_STATE.finalChallengeSettings.vibe);
            
            if (available !== currentTotal) {
                const change = available - currentTotal;
                const half = change / 2;
                window.GAME_STATE.finalChallengeSettings.stroking = Math.max(0, Math.round(window.GAME_STATE.finalChallengeSettings.stroking + half));
                window.GAME_STATE.finalChallengeSettings.vibe = Math.max(0, Math.round(window.GAME_STATE.finalChallengeSettings.vibe + half));
                
                const actualTotal = window.GAME_STATE.finalChallengeSettings.stroking + window.GAME_STATE.finalChallengeSettings.vibe;
                window.GAME_STATE.finalChallengeSettings.anal = Math.max(0, 100 - actualTotal);
            } else {
                window.GAME_STATE.finalChallengeSettings.anal = Math.max(0, newAnal);
            }
        }
        
        updateFinalChallengeDisplays();
    });
    
    // Final challenge type checkboxes
    ['stroking_icyhot', 'stroking_icewater', 'stroking_ktb', 'stroking_ballsqueeze', 'stroking_2finger',
     'vibe_icyhot', 'vibe_icewater', 'anal_vibe'].forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.addEventListener('change', function() {
                window.GAME_STATE.finalChallengeTypes[id] = this.checked;
                saveGameState();
            });
        }
    });
    
    // Final challenge difficulty dropdowns
    ['stroking', 'vibe', 'anal'].forEach(type => {
        const dropdown = document.getElementById(`${type}Difficulty`);
        if (dropdown) {
            dropdown.addEventListener('change', function() {
                window.GAME_STATE.finalChallengeDifficulties[type] = this.value;
                saveGameState();
            });
        }
    });
    
    // Final challenge modifier percentage inputs
    ['stroking_icyhot', 'stroking_icewater', 'stroking_ktb', 'stroking_ballsqueeze', 'stroking_2finger',
     'vibe_icyhot', 'vibe_icewater', 'anal_vibe'].forEach(id => {
        const input = document.getElementById(`${id}_chance`);
        if (input) {
            input.addEventListener('input', function() {
                let value = parseInt(this.value) || 0;
                value = Math.max(0, Math.min(100, value));
                this.value = value;
                window.GAME_STATE.finalChallengeModifierChances[id] = value;
                saveGameState();
            });
        }
    });
    
    // Final challenge modifiers (CE, PF)
    ['ce', 'pf'].forEach(mod => {
        const checkbox = document.getElementById(`modifier_${mod}`);
        if (checkbox) {
            checkbox.addEventListener('change', function() {
                window.GAME_STATE.finalChallengeModifiers[mod] = this.checked;
                saveGameState();
            });
        }
    });
    
    // Prize modifier percentage inputs (CE and PF)
    ['ce', 'pf'].forEach(mod => {
        const input = document.getElementById(`modifier_${mod}_chance`);
        if (input) {
            input.addEventListener('input', function() {
                let value = parseInt(this.value) || 0;
                value = Math.max(0, Math.min(100, value));
                this.value = value;
                window.GAME_STATE.finalChallengeModifierChances[mod] = value;
                saveGameState();
            });
        }
    });
}

// Update final challenge displays
function updateFinalChallengeDisplays() {
    const settings = window.GAME_STATE.finalChallengeSettings;
    
    document.getElementById('strokingPercent').textContent = settings.stroking + '%';
    document.getElementById('vibePercent').textContent = settings.vibe + '%';
    document.getElementById('analPercent').textContent = settings.anal + '%';
    
    document.getElementById('strokingSlider').value = settings.stroking;
    document.getElementById('vibeSlider').value = settings.vibe;
    document.getElementById('analSlider').value = settings.anal;
    
    saveGameState();
}

// Render toy library
let isRendering = false;
export function renderToyLibrary() {
    console.log('🎨 renderToyLibrary() called, isRendering:', isRendering);
    
    if (isRendering) {
        console.warn('⚠️ Already rendering, skipping duplicate call');
        return;
    }
    
    isRendering = true;
    console.trace('Call stack:');
    
    updateSelectedSets();
    
    const container = document.getElementById('toyLibraryContainer');
    if (!container) {
        isRendering = false;
        return;
    }
    
    console.log('Container children before clear:', container.children.length);
    
    // Save the probability display if it exists (check for the actual probability elements)
    const probabilityDisplay = container.querySelector('div:first-child');
    let probabilityHTML = null;
    if (probabilityDisplay && probabilityDisplay.querySelector('#totalAddProbability')) {
        probabilityHTML = probabilityDisplay.outerHTML;
    }
    
    // Completely clear the container - remove all child nodes properly
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    
    // Re-add probability display if it existed
    if (probabilityHTML) {
        container.insertAdjacentHTML('afterbegin', probabilityHTML);
    }
    
    console.log('Container children after clear:', container.children.length);
    
    // Get toys from instruction sets (will be imported from data/instructionSets.js)
    const instructionSets = window.INSTRUCTION_SETS || {};
    const selectedSets = window.GAME_STATE.selectedSets;
    
    const setEmojis = {
        dressup: '🎨',
        apple: '🍎',
        digging: '⛏️',
        teaseanddenial: '🎯'
    };
    
    const allToys = {};
    
    // ALWAYS show cage toy first (even with no sets selected)
    allToys['cage'] = {
        id: 'cage',
        name: 'Cage 🔒',
        sets: [],
        alwaysVisible: true
    };
    
    // Collect toys from selected sets
    selectedSets.forEach(setId => {
        if (instructionSets[setId]) {
            instructionSets[setId].toys.forEach(toy => {
                if (toy.id === 'cage') {
                    // Add this set to the existing cage toy (don't create a new one)
                    if (!allToys['cage'].sets.some(s => s.setId === setId)) {
                        allToys['cage'].sets.push({
                            setId,
                            setName: instructionSets[setId].name,
                            emoji: setEmojis[setId] || ''
                        });
                    }
                } else {
                    // Regular toy - create if doesn't exist
                    if (!allToys[toy.id]) {
                        allToys[toy.id] = {
                            id: toy.id,
                            name: toy.name,
                            sets: []
                        };
                    }
                    // Add set if not already added
                    if (!allToys[toy.id].sets.some(s => s.setId === setId)) {
                        allToys[toy.id].sets.push({
                            setId,
                            setName: instructionSets[setId].name,
                            emoji: setEmojis[setId] || ''
                        });
                    }
                }
            });
        }
    });
    
    // Initialize toy state
    for (const [toyId, toyData] of Object.entries(allToys)) {
        const toyKeys = toyData.sets.map(s => `${s.setId}_${toyId}`);
        
        toyKeys.forEach(key => {
            if (window.GAME_STATE.toyQuantities[key] === undefined) {
                window.GAME_STATE.toyQuantities[key] = 1;
            }
            if (!window.GAME_STATE.toyModifiers[key]) {
                window.GAME_STATE.toyModifiers[key] = { addChance: 10, removeChance: 20 };
            }
            if (!window.GAME_STATE.toyDifficulties[key]) {
                window.GAME_STATE.toyDifficulties[key] = 'medium';
            }
            if (window.GAME_STATE.toySetEnabled[key] === undefined) {
                window.GAME_STATE.toySetEnabled[key] = true;
            }
        });
        
        if (window.GAME_STATE.toyChecked[toyId] === undefined) {
            window.GAME_STATE.toyChecked[toyId] = true;
        }
    }
    
    // Render each toy
    for (const [toyId, toyData] of Object.entries(allToys)) {
        const toyItem = createToyLibraryItem(toyId, toyData);
        container.appendChild(toyItem);
    }
    
    // Update continuous task probabilities
    updateContinuousTaskProbabilities();
    
    saveGameState();
    
    isRendering = false;
    console.log('✅ renderToyLibrary() complete');
}

// Create toy library item
function createToyLibraryItem(toyId, toyData) {
    const item = document.createElement('div');
    item.className = 'toy-library-item';
    
    // Toy header with checkbox and name
    const header = document.createElement('div');
    header.className = 'toy-header';
    
    const checkboxWrapper = document.createElement('div');
    checkboxWrapper.className = 'toy-checkbox-wrapper';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = window.GAME_STATE.toyChecked[toyId];
    checkbox.addEventListener('change', () => {
        window.GAME_STATE.toyChecked[toyId] = checkbox.checked;
        
        // Don't reset values, just grey out/ungrey controls
        // The game logic will treat unchecked toys as 0/unselected
        
        updateToyEnabledStates(toyId, toyData, item);
        updateContinuousTaskProbabilities();
        saveGameState();
    });
    checkboxWrapper.appendChild(checkbox);
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'toy-name';
    nameSpan.textContent = toyData.name;
    
    header.appendChild(checkboxWrapper);
    header.appendChild(nameSpan);
    item.appendChild(header);
    
    // Special handling for cage toy
    if (toyId === 'cage') {
        item.appendChild(createCageControls(toyId, toyData));
    } else {
        // Regular toy controls (quantity)
        item.appendChild(createToyControls(toyId, toyData));
    }
    
    // Set difficulty section (only if sets are available)
    if (toyData.sets.length > 0) {
        item.appendChild(createSetDifficultySection(toyId, toyData));
    }
    
    return item;
}

// Create cage-specific controls
function createCageControls(toyId, toyData) {
    const controls = document.createElement('div');
    controls.className = 'toy-controls';
    controls.style.cssText = 'margin-left: 28px; margin-top: 10px; display: flex; flex-direction: row; gap: 16px; align-items: center;';
    
    // Worn checkbox
    const wornLabel = document.createElement('label');
    wornLabel.style.cssText = 'display: flex; align-items: center; gap: 8px; cursor: pointer;';
    wornLabel.className = 'cage-worn-label';
    
    const wornCheckbox = document.createElement('input');
    wornCheckbox.type = 'checkbox';
    wornCheckbox.checked = window.GAME_STATE.cageWorn;
    wornCheckbox.disabled = !window.GAME_STATE.toyChecked[toyId];
    wornCheckbox.style.cssText = 'width: 18px; height: 18px; cursor: pointer; accent-color: #667eea;';
    wornCheckbox.className = 'cage-worn-checkbox';
    
    const wornText = document.createElement('span');
    wornText.textContent = '👕 Start Worn';
    wornText.style.cssText = 'font-weight: 600; color: #333;';
    
    wornLabel.appendChild(wornCheckbox);
    wornLabel.appendChild(wornText);
    controls.appendChild(wornLabel);
    
    // Locked checkbox
    const lockedLabel = document.createElement('label');
    lockedLabel.style.cssText = 'display: flex; align-items: center; gap: 8px; cursor: pointer;';
    lockedLabel.className = 'cage-locked-label';
    
    const lockedCheckbox = document.createElement('input');
    lockedCheckbox.type = 'checkbox';
    lockedCheckbox.checked = window.GAME_STATE.cageLocked;
    lockedCheckbox.disabled = !window.GAME_STATE.toyChecked[toyId] || !window.GAME_STATE.cageWorn;
    lockedCheckbox.style.cssText = 'width: 18px; height: 18px; cursor: pointer; accent-color: #667eea;';
    lockedCheckbox.className = 'cage-locked-checkbox';
    
    const lockedText = document.createElement('span');
    lockedText.textContent = '🔒 Locked';
    lockedText.style.cssText = 'font-weight: 600;';
    lockedText.style.color = window.GAME_STATE.cageWorn ? '#333' : '#999';
    
    lockedLabel.appendChild(lockedCheckbox);
    lockedLabel.appendChild(lockedText);
    controls.appendChild(lockedLabel);
    
    // Event handlers
    wornCheckbox.addEventListener('change', function() {
        window.GAME_STATE.cageWorn = this.checked;
        
        if (!this.checked) {
            window.GAME_STATE.cageLocked = false;
            lockedCheckbox.checked = false;
            lockedCheckbox.disabled = true;
            lockedCheckbox.style.opacity = '0.5';
            lockedText.style.color = '#999';
        } else {
            lockedCheckbox.disabled = false;
            lockedCheckbox.style.opacity = '1';
            lockedText.style.color = '#333';
        }
        
        saveGameState();
    });
    
    lockedCheckbox.addEventListener('change', function() {
        window.GAME_STATE.cageLocked = this.checked;
        saveGameState();
        updateCageInputStates();
    });
    
    return controls;
}

// Create toy controls (quantity input)
function createToyControls(toyId, toyData) {
    const controls = document.createElement('div');
    controls.className = 'toy-controls';
    
    const qtyLabel = document.createElement('label');
    qtyLabel.textContent = 'Qty:';
    controls.appendChild(qtyLabel);
    
    const toyKeys = toyData.sets.map(s => `${s.setId}_${toyId}`);
    const toyQuantity = window.GAME_STATE.toyQuantities[toyKeys[0]] || 1;
    
    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.min = '1';
    qtyInput.value = toyQuantity;
    qtyInput.disabled = !window.GAME_STATE.toyChecked[toyId];
    qtyInput.className = 'toy-quantity-input';
    qtyInput.addEventListener('change', function() {
        const newQty = Math.max(1, parseInt(this.value) || 1);
        toyKeys.forEach(key => {
            window.GAME_STATE.toyQuantities[key] = newQty;
        });
        // DON'T call renderToyLibrary here - just update the value and save
        this.value = newQty;
        saveGameState();
    });
    controls.appendChild(qtyInput);
    
    return controls;
}

// Create set difficulty section
function createSetDifficultySection(toyId, toyData) {
    const section = document.createElement('div');
    section.className = 'set-difficulty';
    
    toyData.sets.forEach(setInfo => {
        const toyKey = `${setInfo.setId}_${toyId}`;
        const setItem = document.createElement('div');
        setItem.className = 'set-difficulty-item';
        
        // Difficulty row with checkbox, name, difficulty selector, and gear button
        const diffRow = document.createElement('div');
        diffRow.className = 'difficulty-row';
        
        // Set checkbox and name
        const setCheckboxWrapper = document.createElement('div');
        setCheckboxWrapper.style.cssText = 'display:flex;align-items:center;gap:8px;';
        
        const setCheckbox = document.createElement('input');
        setCheckbox.type = 'checkbox';
        setCheckbox.checked = window.GAME_STATE.toySetEnabled[toyKey];
        setCheckbox.disabled = !window.GAME_STATE.toyChecked[toyId];
        setCheckbox.style.cssText = 'width:16px;height:16px;cursor:pointer;accent-color:#667eea;';
        setCheckbox.className = `set-checkbox-${toyKey}`;
        setCheckbox.addEventListener('change', function() {
            window.GAME_STATE.toySetEnabled[toyKey] = this.checked;
            updateToySetControls(toyKey, toyId, setItem);
            updateContinuousTaskProbabilities();
            saveGameState();
        });
        setCheckboxWrapper.appendChild(setCheckbox);
        
        const setNameSpan = document.createElement('span');
        setNameSpan.textContent = `${setInfo.emoji} ${setInfo.setName}`;
        setCheckboxWrapper.appendChild(setNameSpan);
        diffRow.appendChild(setCheckboxWrapper);
        
        // Difficulty controls
        const diffControls = document.createElement('div');
        diffControls.className = 'difficulty-controls';
        
        const diffSelect = document.createElement('select');
        diffSelect.disabled = !window.GAME_STATE.toyChecked[toyId] || !window.GAME_STATE.toySetEnabled[toyKey];
        diffSelect.className = `difficulty-select-${toyKey}`;
        ['easy', 'medium', 'hard'].forEach(level => {
            const opt = document.createElement('option');
            opt.value = level;
            opt.textContent = level === 'easy' ? 'Easy 😊' : level === 'medium' ? 'Medium 😐' : 'Hard 😤';
            if (level === (window.GAME_STATE.toyDifficulties[toyKey] || 'medium')) {
                opt.selected = true;
            }
            diffSelect.appendChild(opt);
        });
        diffSelect.addEventListener('change', function() {
            window.GAME_STATE.toyDifficulties[toyKey] = this.value;
            applyPreset(toyKey, this.value, setItem);
            saveGameState();
        });
        diffControls.appendChild(diffSelect);
        
        // Gear button (for add/remove settings)
        const hasAddRemove = window.hasAddOrRemoveTasks ? window.hasAddOrRemoveTasks(setInfo.setId, toyId) : false;
        const gearBtn = document.createElement('button');
        gearBtn.className = 'gear-btn';
        gearBtn.textContent = '⚙️';
        gearBtn.disabled = !window.GAME_STATE.toyChecked[toyId] || !window.GAME_STATE.toySetEnabled[toyKey] || !hasAddRemove;
        gearBtn.title = hasAddRemove ? 'Advanced Settings' : 'This toy has no add/remove tasks';
        
        if (hasAddRemove) {
            gearBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const advSettings = setItem.querySelector('.advanced-settings');
                if (advSettings) {
                    if (advSettings.classList.contains('visible')) {
                        advSettings.classList.remove('visible');
                        gearBtn.classList.remove('active');
                    } else {
                        advSettings.classList.add('visible');
                        gearBtn.classList.add('active');
                    }
                }
            });
        }
        diffControls.appendChild(gearBtn);
        
        diffRow.appendChild(diffControls);
        setItem.appendChild(diffRow);
        
        // Advanced settings panel
        if (hasAddRemove) {
            const advSettings = document.createElement('div');
            advSettings.className = 'advanced-settings';
            
            // Add chance input
            const addLabel = document.createElement('label');
            addLabel.textContent = 'Add: ';
            const addInput = document.createElement('input');
            addInput.type = 'number';
            addInput.min = '0';
            addInput.max = '100';
            addInput.value = (toyId === 'cage' && window.GAME_STATE.cageLocked) ? 0 : (window.GAME_STATE.toyModifiers[toyKey]?.addChance ?? 10);
            addInput.disabled = !window.GAME_STATE.toyChecked[toyId] || !window.GAME_STATE.toySetEnabled[toyKey] || (toyId === 'cage' && window.GAME_STATE.cageLocked);
            addInput.className = `add-input-${toyKey}`;
            addInput.addEventListener('input', function(e) {
                const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                e.target.value = val;
                if (!window.GAME_STATE.toyModifiers[toyKey]) {
                    window.GAME_STATE.toyModifiers[toyKey] = { addChance: 10, removeChance: 20 };
                }
                window.GAME_STATE.toyModifiers[toyKey].addChance = val;
                updateContinuousTaskProbabilities();
                saveGameState();
            });
            addLabel.appendChild(addInput);
            addLabel.appendChild(document.createTextNode('%'));
            advSettings.appendChild(addLabel);
            
            // Remove chance input
            const removeLabel = document.createElement('label');
            removeLabel.textContent = 'Remove: ';
            const removeInput = document.createElement('input');
            removeInput.type = 'number';
            removeInput.min = '0';
            removeInput.max = '100';
            removeInput.value = (toyId === 'cage' && window.GAME_STATE.cageLocked) ? 0 : (window.GAME_STATE.toyModifiers[toyKey]?.removeChance ?? 20);
            removeInput.disabled = !window.GAME_STATE.toyChecked[toyId] || !window.GAME_STATE.toySetEnabled[toyKey] || (toyId === 'cage' && window.GAME_STATE.cageLocked);
            removeInput.className = `remove-input-${toyKey}`;
            removeInput.addEventListener('input', function(e) {
                const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                e.target.value = val;
                if (!window.GAME_STATE.toyModifiers[toyKey]) {
                    window.GAME_STATE.toyModifiers[toyKey] = { addChance: 10, removeChance: 20 };
                }
                window.GAME_STATE.toyModifiers[toyKey].removeChance = val;
                updateContinuousTaskProbabilities();
                saveGameState();
            });
            removeLabel.appendChild(removeInput);
            removeLabel.appendChild(document.createTextNode('%'));
            advSettings.appendChild(removeLabel);
            
            setItem.appendChild(advSettings);
        }
        
        section.appendChild(setItem);
    });
    
    return section;
}

// Update toy enabled states when toy checkbox changes
function updateToyEnabledStates(toyId, toyData, itemElement) {
    const isChecked = window.GAME_STATE.toyChecked[toyId];
    
    // Update cage-specific controls if this is the cage
    if (toyId === 'cage') {
        const wornCheckbox = itemElement.querySelector('.cage-worn-checkbox');
        const lockedCheckbox = itemElement.querySelector('.cage-locked-checkbox');
        
        if (wornCheckbox) {
            wornCheckbox.disabled = !isChecked;
            wornCheckbox.style.opacity = isChecked ? '1' : '0.5';
        }
        
        if (lockedCheckbox) {
            lockedCheckbox.disabled = !isChecked || !window.GAME_STATE.cageWorn;
            lockedCheckbox.style.opacity = (isChecked && window.GAME_STATE.cageWorn) ? '1' : '0.5';
        }
    } else {
        // Update quantity input for regular toys
        const qtyInput = itemElement.querySelector('.toy-quantity-input');
        if (qtyInput) {
            qtyInput.disabled = !isChecked;
            qtyInput.style.opacity = isChecked ? '1' : '0.5';
        }
    }
    
    // Update all set-specific controls
    toyData.sets.forEach(setInfo => {
        const toyKey = `${setInfo.setId}_${toyId}`;
        
        // Update set checkbox - keep it checked, just disable/grey it
        const setCheckbox = itemElement.querySelector(`.set-checkbox-${toyKey}`);
        if (setCheckbox) {
            setCheckbox.disabled = !isChecked;
            setCheckbox.style.opacity = isChecked ? '1' : '0.5';
        }
        
        // When re-enabling toy, restore controls based on set checkbox state
        const setEnabled = window.GAME_STATE.toySetEnabled[toyKey];
        
        // Update difficulty select
        const diffSelect = itemElement.querySelector(`.difficulty-select-${toyKey}`);
        if (diffSelect) {
            diffSelect.disabled = !isChecked || !setEnabled;
            diffSelect.style.opacity = (isChecked && setEnabled) ? '1' : '0.5';
        }
        
        // Update gear button
        const gearBtn = itemElement.querySelector('.gear-btn');
        if (gearBtn) {
            const hasAddRemove = window.hasAddOrRemoveTasks ? window.hasAddOrRemoveTasks(setInfo.setId, toyId) : false;
            gearBtn.disabled = !isChecked || !setEnabled || !hasAddRemove;
            gearBtn.style.opacity = (isChecked && setEnabled && hasAddRemove) ? '1' : '0.5';
        }
        
        // Update add/remove inputs
        const addInput = itemElement.querySelector(`.add-input-${toyKey}`);
        const removeInput = itemElement.querySelector(`.remove-input-${toyKey}`);
        
        if (addInput) {
            addInput.disabled = !isChecked || !setEnabled || (toyId === 'cage' && window.GAME_STATE.cageLocked);
            addInput.style.opacity = (isChecked && setEnabled && !(toyId === 'cage' && window.GAME_STATE.cageLocked)) ? '1' : '0.5';
        }
        
        if (removeInput) {
            removeInput.disabled = !isChecked || !setEnabled || (toyId === 'cage' && window.GAME_STATE.cageLocked);
            removeInput.style.opacity = (isChecked && setEnabled && !(toyId === 'cage' && window.GAME_STATE.cageLocked)) ? '1' : '0.5';
        }
    });
}

// Update toy set controls when set checkbox changes
function updateToySetControls(toyKey, toyId, setItemElement) {
    const isEnabled = window.GAME_STATE.toySetEnabled[toyKey];
    const isChecked = window.GAME_STATE.toyChecked[toyId];
    
    // Update difficulty select
    const diffSelect = setItemElement.querySelector(`.difficulty-select-${toyKey}`);
    if (diffSelect) {
        diffSelect.disabled = !isChecked || !isEnabled;
        diffSelect.style.opacity = (isChecked && isEnabled) ? '1' : '0.5';
    }
    
    // Update gear button
    const gearBtn = setItemElement.querySelector('.gear-btn');
    if (gearBtn) {
        const [setId] = toyKey.split('_');
        const hasAddRemove = window.hasAddOrRemoveTasks ? window.hasAddOrRemoveTasks(setId, toyId) : false;
        gearBtn.disabled = !isChecked || !isEnabled || !hasAddRemove;
        gearBtn.style.opacity = (isChecked && isEnabled && hasAddRemove) ? '1' : '0.5';
    }
    
    // Update add/remove inputs
    const addInput = setItemElement.querySelector(`.add-input-${toyKey}`);
    const removeInput = setItemElement.querySelector(`.remove-input-${toyKey}`);
    
    if (addInput) {
        addInput.disabled = !isChecked || !isEnabled || (toyId === 'cage' && window.GAME_STATE.cageLocked);
        addInput.style.opacity = (isChecked && isEnabled && !(toyId === 'cage' && window.GAME_STATE.cageLocked)) ? '1' : '0.5';
    }
    
    if (removeInput) {
        removeInput.disabled = !isChecked || !isEnabled || (toyId === 'cage' && window.GAME_STATE.cageLocked);
        removeInput.style.opacity = (isChecked && isEnabled && !(toyId === 'cage' && window.GAME_STATE.cageLocked)) ? '1' : '0.5';
    }
}

// Apply difficulty preset to toy modifiers
function applyPreset(toyKey, difficulty, setItemElement) {
    const presets = {
        easy: { addChance: 5, removeChance: 25 },
        medium: { addChance: 10, removeChance: 20 },
        hard: { addChance: 15, removeChance: 15 }
    };
    
    if (presets[difficulty]) {
        const [setId, ...toyIdParts] = toyKey.split('_');
        const toyId = toyIdParts.join('_');
        
        // If cage is locked, don't change add/remove values
        if (toyId === 'cage' && window.GAME_STATE.cageLocked) {
            window.GAME_STATE.toyDifficulties[toyKey] = difficulty;
            saveGameState();
            return;
        }
        
        window.GAME_STATE.toyModifiers[toyKey] = { ...presets[difficulty] };
        window.GAME_STATE.toyDifficulties[toyKey] = difficulty;
        
        // Update the input values in the UI if advanced settings are visible
        if (setItemElement) {
            const addInput = setItemElement.querySelector(`.add-input-${toyKey}`);
            const removeInput = setItemElement.querySelector(`.remove-input-${toyKey}`);
            
            if (addInput) {
                addInput.value = presets[difficulty].addChance;
            }
            if (removeInput) {
                removeInput.value = presets[difficulty].removeChance;
            }
        }
        
        updateContinuousTaskProbabilities();
        saveGameState();
    }
}

// Update cage input states
function updateCageInputStates() {
    // Update all cage-related inputs based on locked state
    const isLocked = window.GAME_STATE.cageLocked;
    
    // This will be implemented when we have the full toy rendering
    // For now, just trigger a re-render
    renderToyLibrary();
}

// Update continuous task probabilities display
function updateContinuousTaskProbabilities() {
    const selectedToys = getSelectedToys();
    
    let probNoAddTriggers = 1.0;
    let probNoRemoveTriggers = 1.0;
    let hasAnyAddTasks = false;
    let hasAnyRemoveTasks = false;
    
    selectedToys.forEach(toyObj => {
        const toyKey = `${toyObj.setId}_${toyObj.toyId}`;
        const toyId = toyObj.toyId;
        
        // IMPORTANT: Treat unchecked toys as having 0% add/remove chance
        // even if they have values stored in the state
        if (!window.GAME_STATE.toyChecked[toyId]) {
            return; // Skip this toy entirely
        }
        
        // Check if toy has add/remove tasks from manifest
        const hasAddTask = window.hasAddTasks ? window.hasAddTasks(toyObj.setId, toyId) : false;
        const hasRemoveTask = window.hasRemoveTasks ? window.hasRemoveTasks(toyObj.setId, toyId) : false;
        
        if (hasAddTask) {
            let addChance = window.GAME_STATE.toyModifiers[toyKey]?.addChance ?? 10;
            if (toyId === 'cage' && window.GAME_STATE.cageLocked) {
                addChance = 0;
            }
            if (addChance > 0) {
                const addProbability = addChance / 100;
                probNoAddTriggers *= (1 - addProbability);
                hasAnyAddTasks = true;
            }
        }
        
        if (hasRemoveTask) {
            let removeChance = window.GAME_STATE.toyModifiers[toyKey]?.removeChance ?? 20;
            if (toyId === 'cage' && window.GAME_STATE.cageLocked) {
                removeChance = 0;
            }
            if (removeChance > 0) {
                const removeProbability = removeChance / 100;
                probNoRemoveTriggers *= (1 - removeProbability);
                hasAnyRemoveTasks = true;
            }
        }
    });
    
    const totalAddProb = hasAnyAddTasks ? (1 - probNoAddTriggers) * 100 : 0;
    const totalRemoveProb = hasAnyRemoveTasks ? (1 - probNoRemoveTriggers) * 100 : 0;
    
    const addDisplay = document.getElementById('totalAddProbability');
    const removeDisplay = document.getElementById('totalRemoveProbability');
    
    if (addDisplay) addDisplay.textContent = totalAddProb.toFixed(1) + '%';
    if (removeDisplay) removeDisplay.textContent = totalRemoveProb.toFixed(1) + '%';
}

// Get selected toys
function getSelectedToys() {
    const allToys = [];
    
    for (const [toyKey, quantity] of Object.entries(window.GAME_STATE.toyQuantities)) {
        if (quantity > 0) {
            const [setId, ...toyIdParts] = toyKey.split('_');
            const toyId = toyIdParts.join('_');
            
            // IMPORTANT: Treat unchecked toys as unselected, even if toySetEnabled is true
            // This ensures greyed-out toys don't participate in the game
            if (window.GAME_STATE.toyChecked[toyId] && 
                window.GAME_STATE.toySetEnabled[toyKey] && 
                window.GAME_STATE.selectedSets.includes(setId)) {
                allToys.push({
                    toyId,
                    setId,
                    difficulty: window.GAME_STATE.toyDifficulties[toyKey] || 'medium'
                });
            }
        }
    }
    
    return allToys;
}

// Restore UI state from saved game
export function restoreUIState(state) {
    isRestoringUI = true;
    
    // Restore checkboxes
    document.querySelectorAll('#instructionSetCheckboxes input[type="checkbox"]').forEach(cb => {
        cb.checked = state.selectedSets.includes(cb.value);
    });
    
    // Update selected sets in state
    window.GAME_STATE.selectedSets = state.selectedSets;
    
    // Restore sliders
    updateSliderDisplays(true);
    updateFinalChallengeDisplays();
    
    // Restore player name
    document.getElementById('playerNameInput').value = state.playerName;
    
    // Restore board size
    document.getElementById('boardSizeSelect').value = state.totalSquares;
    
    // Restore prize modifier percentage inputs
    if (state.finalChallengeModifierChances) {
        if (state.finalChallengeModifierChances.ce !== undefined) {
            const ceInput = document.getElementById('modifier_ce_chance');
            if (ceInput) ceInput.value = state.finalChallengeModifierChances.ce;
        }
        if (state.finalChallengeModifierChances.pf !== undefined) {
            const pfInput = document.getElementById('modifier_pf_chance');
            if (pfInput) pfInput.value = state.finalChallengeModifierChances.pf;
        }
    }
    
    isRestoringUI = false;
}
