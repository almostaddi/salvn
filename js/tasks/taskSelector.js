// Task selection logic - manifest is source of truth for requirements

import { getTaskConditions, hasRegularToys } from '../state/gameState.js';
import { getClothesPegMax } from '../data/instructionSets.js';

let taskRegistry = null;
let manifestMetadata = null;

// Load task registry from manifest
export async function loadTaskRegistry() {
    try {
        const manifest = await fetch('js/tasks/manifest.json').then(r => r.json());
        
        taskRegistry = {
            sets: {
                dressup: { tasks: {}, add: {}, remove: {}, snakes: [], ladders: [], finals: [] },
                apple: { tasks: {}, add: {}, remove: {}, snakes: [], ladders: [], finals: [] },
                digging: { tasks: {}, add: {}, remove: {}, snakes: [], ladders: [], finals: [] },
                teaseanddenial: { tasks: {}, add: {}, remove: {}, snakes: [], ladders: [], finals: [] }
            },
            fallbacks: {
                snake: null,
                ladder: null,
                final: null,
                general: null
            },
            metadata: {
                bySet: {},
                byToy: {},
                byId: {}  // Quick lookup by task ID
            }
        };
        
        manifestMetadata = taskRegistry.metadata;
        
        // Load each category from manifest
        for (const [category, categoryData] of Object.entries(manifest)) {
            // Handle fallbacks
            if (category === '_fallbacks') {
                for (const fallbackEntry of categoryData) {
                    const taskDef = await loadTaskDefinition(fallbackEntry.file);
                    
                    if (!taskDef) {
                        console.warn(`⚠️ Failed to load: ${fallbackEntry.file}`);
                        continue;
                    }
                    
                    if (taskDef.type === 'snake' && taskDef.isFallback) {
                        taskRegistry.fallbacks.snake = { ...taskDef, filePath: fallbackEntry.file };
                        console.log(`✅ Loaded snake fallback`);
                    } else if (taskDef.type === 'ladder' && taskDef.isFallback) {
                        taskRegistry.fallbacks.ladder = { ...taskDef, filePath: fallbackEntry.file };
                        console.log(`✅ Loaded ladder fallback`);
                    } else if (taskDef.type === 'final') {
                        taskRegistry.fallbacks.final = { ...taskDef, filePath: fallbackEntry.file };
                        console.log(`✅ Loaded final fallback`);
                    } else if (taskDef.type === 'general-fallback') {
                        taskRegistry.fallbacks.general = { ...taskDef, filePath: fallbackEntry.file };
                        console.log(`✅ Loaded general fallback`);
                    }
                }
            }
            // Handle set-specific tasks
            else if (taskRegistry.sets[category]) {
                // Initialize metadata storage for this set
                if (!manifestMetadata.bySet[category]) {
                    manifestMetadata.bySet[category] = [];
                }
                
                // Load regular tasks
                if (categoryData.tasks && Array.isArray(categoryData.tasks)) {
                    for (const taskEntry of categoryData.tasks) {
                        const taskDef = await loadTaskDefinition(taskEntry.file);
                        
                        if (!taskDef) {
                            console.warn(`⚠️ Failed to load: ${taskEntry.file}`);
                            continue;
                        }
                        
                        if (taskDef.type === 'snake') {
                            taskRegistry.sets[category].snakes.push({ ...taskDef, filePath: taskEntry.file });
                        } else if (taskDef.type === 'ladder') {
                            taskRegistry.sets[category].ladders.push({ ...taskDef, filePath: taskEntry.file });
                        } else if (taskDef.type === 'final') {
                            taskRegistry.sets[category].finals.push({ ...taskDef, filePath: taskEntry.file });
                        } else {
                            // Regular set task - store in registry
                            const toyId = taskEntry.toyId || taskDef.toyId;
                            const type = taskEntry.type || taskDef.type || 'standard';
                            const isFallback = taskEntry.isFallback !== undefined ? taskEntry.isFallback : (taskDef.isFallback || false);
                            
                            if (!taskRegistry.sets[category].tasks[toyId]) {
                                taskRegistry.sets[category].tasks[toyId] = [];
                            }
                            taskRegistry.sets[category].tasks[toyId].push({ 
                                ...taskDef, 
                                filePath: taskEntry.file,
                                type: type,
                                isFallback: isFallback
                            });
                            
                            // Store metadata from manifest (source of truth)
                            const metadata = {
                                id: taskEntry.id,
                                setId: category,
                                toyId: toyId,
                                filePath: taskEntry.file,
                                type: type,
                                isFallback: isFallback,
                                requires: taskEntry.requires || { toys: [], freeBodyParts: [], notHolding: [] },
                                baseWeight: taskEntry.baseWeight || 1
                            };
                            
                            manifestMetadata.bySet[category].push(metadata);
                            manifestMetadata.byId[taskEntry.id] = metadata;
                            
                            // Index by toy as well
                            const toyKey = `${category}_${toyId}`;
                            if (!manifestMetadata.byToy[toyKey]) {
                                manifestMetadata.byToy[toyKey] = [];
                            }
                            manifestMetadata.byToy[toyKey].push(metadata);
                            
                            console.log(`✅ Loaded: ${taskEntry.file} (type: ${type}, fallback: ${isFallback})`);
                        }
                    }
                }
                
                // Load add tasks
                if (categoryData.add && Array.isArray(categoryData.add)) {
                    for (const taskEntry of categoryData.add) {
                        const taskDef = await loadTaskDefinition(taskEntry.file);
                        
                        if (!taskDef) {
                            console.warn(`⚠️ Failed to load add task: ${taskEntry.file}`);
                            continue;
                        }
                        
                        const toyId = taskEntry.toyId || taskDef.toyId;
                        if (!taskRegistry.sets[category].add[toyId]) {
                            taskRegistry.sets[category].add[toyId] = [];
                        }
                        taskRegistry.sets[category].add[toyId].push({ 
                            ...taskDef, 
                            filePath: taskEntry.file,
                            bodyPart: taskEntry.bodyPart || taskDef.bodyPart
                        });
                        
                        console.log(`✅ Loaded add task: ${taskEntry.file} (${toyId} -> ${taskEntry.bodyPart})`);
                    }
                }
                
                // Load remove tasks
                if (categoryData.remove && Array.isArray(categoryData.remove)) {
                    for (const taskEntry of categoryData.remove) {
                        const taskDef = await loadTaskDefinition(taskEntry.file);
                        
                        if (!taskDef) {
                            console.warn(`⚠️ Failed to load remove task: ${taskEntry.file}`);
                            continue;
                        }
                        
                        const toyId = taskEntry.toyId || taskDef.toyId;
                        if (!taskRegistry.sets[category].remove[toyId]) {
                            taskRegistry.sets[category].remove[toyId] = [];
                        }
                        taskRegistry.sets[category].remove[toyId].push({ 
                            ...taskDef, 
                            filePath: taskEntry.file,
                            bodyPart: taskEntry.bodyPart || taskDef.bodyPart
                        });
                        
                        console.log(`✅ Loaded remove task: ${taskEntry.file} (${toyId} -> ${taskEntry.bodyPart})`);
                    }
                }
            }
        }
        
        console.log('📋 Task registry loaded');
        console.log('📊 Total tasks:', Object.keys(manifestMetadata.byId).length);
        
        // Expose globally
        window.taskRegistry = taskRegistry;
        
        return taskRegistry;
    } catch (error) {
        console.error('Failed to load task registry:', error);
        return null;
    }
}

// Load task definition from JS module file
async function loadTaskDefinition(filePath) {
    try {
        const module = await import(`/${filePath}`);
        return module.default;
    } catch (error) {
        console.error(`Failed to load ${filePath}:`, error);
        return null;
    }
}

// Get task by ID
function getTaskById(taskId) {
    const metadata = manifestMetadata?.byId[taskId];
    if (!metadata) return null;
    
    // Load from registry
    const task = taskRegistry.sets[metadata.setId]?.tasks[metadata.toyId]
        ?.find(t => t.id === taskId);
    
    return task || null;
}

// Get available toys with quantities
function getAvailableToys() {
    const available = {};
    const selectedSets = window.GAME_STATE.selectedSets;
    const toyChecked = window.GAME_STATE.toyChecked;
    const toySetEnabled = window.GAME_STATE.toySetEnabled;
    const conditions = getTaskConditions();
    
    for (const setId of selectedSets) {
        for (const [toyKey, enabled] of Object.entries(toySetEnabled)) {
            if (!enabled) continue;
            
            const [set, ...toyIdParts] = toyKey.split('_');
            if (set !== setId) continue;
            
            const toyId = toyIdParts.join('_');
            if (!toyChecked[toyId]) continue;
            
            // Get total quantity and in-use count
            const totalQuantity = window.GAME_STATE.toyQuantities[toyKey] || 1;
            const inUse = conditions.countToy(toyId);
            const availableQuantity = totalQuantity - inUse;
            
            // Store the maximum available quantity across all sets
            if (!available[toyId] || available[toyId] < availableQuantity) {
                available[toyId] = availableQuantity;
            }
        }
    }
    
    return available;
}

// Get free body parts
function getFreeBodyParts() {
    const conditions = getTaskConditions();
    const bodyParts = ['Mo', 'Ba', 'Bu', 'As', 'Ni', 'Ha', 'Bo', 'Pe'];
    const free = [];
    
    for (const bp of bodyParts) {
        if (conditions.bodyPartEmpty(bp)) {
            free.push(bp);
        }
    }
    
    return free;
}

// Get toys currently being held
function getHoldingToys() {
    const conditions = getTaskConditions();
    const allHeld = conditions.getAllHeldItems();
    return [...new Set(allHeld)];
}

// Check if task metadata meets basic requirements
function meetsBasicRequirements(taskMeta, availableToys, freeBodyParts, holdingToys) {
    const requires = taskMeta.requires || { toys: [], freeBodyParts: [], notHolding: [], bodyPartCapacity: [] };
    const conditions = getTaskConditions();
    
    // Check required toys with quantities (inventory check only)
    if (requires.toys && requires.toys.length > 0) {
        for (const toyReq of requires.toys) {
            const toyId = toyReq.toy;
            const quantity = toyReq.quantity || 1;
            const available = availableToys[toyId] || 0;
            
            if (available < quantity) {
                return false;
            }
        }
    }
    
    // Check body part capacity requirements (for stackable toys like pegs)
    if (requires.bodyPartCapacity && requires.bodyPartCapacity.length > 0) {
        for (const capacityReq of requires.bodyPartCapacity) {
            const bodyPart = capacityReq.bodyPart;
            const toyId = capacityReq.toy;
            const spaceNeeded = capacityReq.spaceNeeded || 1;
            
            // Get max capacity for this body part
            const maxCount = getClothesPegMax(bodyPart);
            
            // Get current count in body part
            const currentCount = conditions.countToyInBodyPart(toyId, bodyPart);
            
            // Get available space in body part
            const spaceAvailable = maxCount - currentCount;
            
            // Check if there's enough space
            if (spaceAvailable < spaceNeeded) {
                return false;
            }
            
            // Also check that body part doesn't have regular toys (if this is pegs)
            if (toyId === 'pegs' && hasRegularToys(bodyPart)) {
                return false;
            }
        }
    }
    
    // Check free body parts needed (for non-stackable toys)
    if (requires.freeBodyParts && requires.freeBodyParts.length > 0) {
        for (const bp of requires.freeBodyParts) {
            // Body part must be completely empty
            if (!freeBodyParts.includes(bp)) {
                return false;
            }
        }
    }
    
    // Check not holding
    if (requires.notHolding && requires.notHolding.length > 0) {
        if (requires.notHolding.some(t => holdingToys.includes(t))) {
            return false;
        }
    }
    
    return true;
}

// Select next task using manifest pre-filtering
export function selectNextTask() {
    if (!manifestMetadata) {
        console.warn('Manifest metadata not loaded, using fallback');
        return taskRegistry?.fallbacks?.general || null;
    }
    
    // Get current game state for filtering
    const availableToys = getAvailableToys();
    const freeBodyParts = getFreeBodyParts();
    const holdingToys = getHoldingToys();
    const selectedSets = window.GAME_STATE.selectedSets;
    
    console.log('🎯 Selecting task:');
    console.log('  Available toys:', availableToys);
    console.log('  Free body parts:', freeBodyParts);
    console.log('  Holding:', holdingToys);
    
    // Collect eligible NON-FALLBACK tasks from selected sets
    const eligibleTasks = [];
    
    for (const setId of selectedSets) {
        const setTasks = manifestMetadata.bySet[setId] || [];
        
        for (const taskMeta of setTasks) {
            // Skip fallback tasks during normal selection
            if (taskMeta.isFallback) {
                continue;
            }
            
            // Skip non-standard tasks (snake, ladder, final, etc.)
            if (taskMeta.type !== 'standard') {
                continue;
            }
            
            // Check if toy/set is enabled
            const toyKey = `${taskMeta.setId}_${taskMeta.toyId}`;
            if (!window.GAME_STATE.toySetEnabled[toyKey]) {
                continue;
            }
            
            // Check if toy is checked
            if (!window.GAME_STATE.toyChecked[taskMeta.toyId]) {
                continue;
            }
            
            // Check basic requirements from manifest
            if (!meetsBasicRequirements(taskMeta, availableToys, freeBodyParts, holdingToys)) {
                continue;
            }
            
            // Task is eligible!
            eligibleTasks.push(taskMeta);
        }
    }
    
    console.log(`✅ Found ${eligibleTasks.length} eligible non-fallback tasks`);
    
    // If no eligible tasks, try set-specific fallbacks
    if (eligibleTasks.length === 0) {
        console.warn('No eligible tasks found, trying set fallbacks');
        
        for (const setId of selectedSets) {
            const setTasks = manifestMetadata.bySet[setId] || [];
            
            for (const taskMeta of setTasks) {
                // Only look at fallback tasks
                if (!taskMeta.isFallback || taskMeta.type !== 'standard') {
                    continue;
                }
                
                // Fallback tasks should always be selectable, but check requirements anyway
                if (!meetsBasicRequirements(taskMeta, availableToys, freeBodyParts, holdingToys)) {
                    continue;
                }
                
                // Found a set fallback!
                const task = taskRegistry.sets[setId]?.tasks[taskMeta.toyId]
                    ?.find(t => t.id === taskMeta.id);
                
                if (task) {
                    console.log(`Using ${setId} fallback: ${task.id}`);
                    return task;
                }
            }
        }
        
        // No set fallbacks work, use general fallback
        console.warn('No set fallbacks available, using general fallback');
        return taskRegistry.fallbacks.general;
    }
    
    // Apply weight modifications
    const weighted = eligibleTasks.map(taskMeta => ({
        taskMeta,
        weight: Math.max(0, taskMeta.baseWeight + (window.GAME_STATE.taskWeights[taskMeta.filePath] || 0))
    })).filter(t => t.weight > 0);
    
    if (weighted.length === 0) {
        console.warn('All tasks have 0 weight, using fallback');
        return taskRegistry.fallbacks.general;
    }
    
    // Weighted random selection
    const selected = weightedRandomSelect(weighted);
    
    // Load the actual task
    const task = taskRegistry.sets[selected.taskMeta.setId]?.tasks[selected.taskMeta.toyId]
        ?.find(t => t.id === selected.taskMeta.id);
    
    if (!task) {
        console.error('Selected task not found in registry:', selected.taskMeta.id);
        return taskRegistry.fallbacks.general;
    }
    
    console.log(`🎲 Selected task: ${task.id}`);
    return task;
}

// Weighted random selection
function weightedRandomSelect(weightedItems) {
    const totalWeight = weightedItems.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const item of weightedItems) {
        random -= item.weight;
        if (random <= 0) {
            return item;
        }
    }
    
    return weightedItems[weightedItems.length - 1];
}

// Check if a toy/set combo has add tasks
export function hasAddTasks(setId, toyId) {
    if (!taskRegistry || !taskRegistry.sets[setId]) return false;
    return taskRegistry.sets[setId].add[toyId] && taskRegistry.sets[setId].add[toyId].length > 0;
}

// Check if a toy/set combo has remove tasks
export function hasRemoveTasks(setId, toyId) {
    if (!taskRegistry || !taskRegistry.sets[setId]) return false;
    return taskRegistry.sets[setId].remove[toyId] && taskRegistry.sets[setId].remove[toyId].length > 0;
}

// Check if a toy/set combo has any add or remove tasks
export function hasAddOrRemoveTasks(setId, toyId) {
    return hasAddTasks(setId, toyId) || hasRemoveTasks(setId, toyId);
}

// Get all body parts that have add tasks for this toy/set combo
export function getAddTaskBodyParts(setId, toyId) {
    if (!taskRegistry || !taskRegistry.sets[setId]) return [];
    if (!taskRegistry.sets[setId].add[toyId]) return [];
    
    const bodyParts = new Set();
    taskRegistry.sets[setId].add[toyId].forEach(task => {
        if (task.bodyPart) {
            bodyParts.add(task.bodyPart);
        }
    });
    
    return Array.from(bodyParts);
}

// Get all body parts that have remove tasks for this toy/set combo
export function getRemoveTaskBodyParts(setId, toyId) {
    if (!taskRegistry || !taskRegistry.sets[setId]) return [];
    if (!taskRegistry.sets[setId].remove[toyId]) return [];
    
    const bodyParts = new Set();
    taskRegistry.sets[setId].remove[toyId].forEach(task => {
        if (task.bodyPart) {
            bodyParts.add(task.bodyPart);
        }
    });
    
    return Array.from(bodyParts);
}

// Select snake/ladder task
export function selectSnakeLadderTask(type, fromPos, toPos) {
    const conditions = getTaskConditions();
    const snakeLadderInfo = {
        type: type,
        from: fromPos,
        to: toPos,
        distance: toPos - fromPos
    };
    
    const selectedSets = window.GAME_STATE.selectedSets;
    const allTasks = [];
    
    // Collect set-specific snake/ladder tasks (non-fallback)
    for (const setId of selectedSets) {
        if (!taskRegistry.sets[setId]) continue;
        
        const setTasks = type === 'snake' ? 
            taskRegistry.sets[setId].snakes : 
            taskRegistry.sets[setId].ladders;
        
        // Only add non-fallback tasks
        allTasks.push(...setTasks.filter(task => !task.isFallback));
    }
    
    // Filter by conditions
    const availableTasks = allTasks.filter(task => {
        if (task.canSelect && !task.canSelect(conditions)) return false;
        return true;
    });
    
    // If set-specific tasks available, pick one
    if (availableTasks.length > 0) {
        const taskToUse = availableTasks[Math.floor(Math.random() * availableTasks.length)];
        console.log(`Using set-specific ${type} task:`, taskToUse.id);
        return { task: taskToUse, snakeLadderInfo };
    }
    
    // Otherwise use fallback
    const fallbackTask = type === 'snake' ? 
        taskRegistry.fallbacks.snake : 
        taskRegistry.fallbacks.ladder;
    
    if (!fallbackTask) {
        console.error(`No ${type} fallback task found!`);
        return { task: taskRegistry.fallbacks.general, snakeLadderInfo };
    }
    
    console.log(`Using ${type} fallback task`);
    return { task: fallbackTask, snakeLadderInfo };
}

// Select final challenge task
export function selectFinalChallenge() {
    const conditions = getTaskConditions();
    const selectedSets = window.GAME_STATE.selectedSets;
    
    // Collect all set-specific final challenges (non-fallback)
    const allFinalTasks = [];
    for (const setId of selectedSets) {
        if (!taskRegistry.sets[setId]) continue;
        const nonFallbackFinals = taskRegistry.sets[setId].finals.filter(t => !t.isFallback);
        allFinalTasks.push(...nonFallbackFinals);
    }
    
    // Check for "always" final challenges
    const alwaysTasks = allFinalTasks.filter(t => 
        t.alwaysSelect && t.alwaysSelect(conditions)
    );
    
    if (alwaysTasks.length > 0) {
        const selected = alwaysTasks[Math.floor(Math.random() * alwaysTasks.length)];
        console.log('Using always-select final challenge:', selected.id);
        return selected;
    }
    
    // Filter by canSelect
    const availableTasks = allFinalTasks.filter(task => {
        if (task.canSelect && !task.canSelect(conditions)) return false;
        return true;
    });
    
    // Weighted selection if tasks available
    if (availableTasks.length > 0) {
        const weighted = availableTasks.map(task => ({
            task,
            weight: task.weight || 1
        }));
        
        const selected = weightedRandomSelect(weighted).task;
        console.log('Using set-specific final challenge:', selected.id);
        return selected;
    }
    
    // Use fallback
    console.log('Using fallback final challenge');
    return taskRegistry.fallbacks.final;
}

// Expose functions globally
window.selectNextTask = selectNextTask;
window.selectSnakeLadderTask = selectSnakeLadderTask;
window.selectFinalChallenge = selectFinalChallenge;
window.hasAddTasks = hasAddTasks;
window.hasRemoveTasks = hasRemoveTasks;
window.hasAddOrRemoveTasks = hasAddOrRemoveTasks;
window.getAddTaskBodyParts = getAddTaskBodyParts;
window.getRemoveTaskBodyParts = getRemoveTaskBodyParts;
window.getTaskById = getTaskById;
