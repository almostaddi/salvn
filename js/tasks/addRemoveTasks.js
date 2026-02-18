// js/tasks/addRemoveTasks.js
// Implements rollForAddRemoveTasks() — called after each dice roll to determine
// whether an add or remove task fires before the main task.

import { getTaskConditions, getPlayerBodyParts, playerHasBodyPart } from '../state/gameState.js';
import { getClothesPegMax } from '../data/instructionSets.js';

/**
 * Roll to see if an add or remove task should fire this turn.
 * Returns a task object with { getHTML(), execute() } or null.
 */
function rollForAddRemoveTasks() {
    const selectedSets   = window.GAME_STATE.selectedSets  || [];
    const toyChecked     = window.GAME_STATE.toyChecked     || {};
    const toySetEnabled  = window.GAME_STATE.toySetEnabled  || {};
    const toyModifiers   = window.GAME_STATE.toyModifiers   || {};
    const conditions     = getTaskConditions();
    const playerParts    = getPlayerBodyParts();
    const registry       = window.taskRegistry;

    if (!registry) return null;

    // ── Build candidate list ────────────────────────────────────────────────
    // Each entry: { type: 'add'|'remove', toyKey, setId, toyId, chance, task }
    const candidates = [];

    for (const setId of selectedSets) {
        const setRegistry = registry.sets[setId];
        if (!setRegistry) continue;

        // Iterate over all toys that have add or remove tasks in this set
        const toyIds = new Set([
            ...Object.keys(setRegistry.add  || {}),
            ...Object.keys(setRegistry.remove || {})
        ]);

        for (const toyId of toyIds) {
            const toyKey = `${setId}_${toyId}`;

            // Must be checked and set-enabled
            if (toyChecked[toyId]      === false) continue;
            if (toySetEnabled[toyKey]  === false) continue;

            const modifiers = toyModifiers[toyKey] || { addChance: 10, removeChance: 20 };

            // ── ADD tasks ───────────────────────────────────────────────────
            const addTasks = (setRegistry.add[toyId] || []);
            if (addTasks.length > 0) {
                let addChance = modifiers.addChance ?? 10;
                // Cage locked → cannot add
                if (toyId === 'cage' && window.GAME_STATE.cageLocked) addChance = 0;

                if (addChance > 0) {
                    // Find a valid add task (body part must exist and have capacity)
                    const validAddTasks = addTasks.filter(task => {
                        const bp = task.bodyPart;
                        if (!bp) return false;
                        if (!playerParts.has(bp)) return false;
                        return conditions.canBodyPartHold(bp, toyId);
                    });

                    if (validAddTasks.length > 0) {
                        const task = validAddTasks[Math.floor(Math.random() * validAddTasks.length)];
                        candidates.push({ type: 'add', toyKey, setId, toyId, chance: addChance, task });
                    }
                }
            }

            // ── REMOVE tasks ────────────────────────────────────────────────
            const removeTasks = (setRegistry.remove[toyId] || []);
            if (removeTasks.length > 0) {
                let removeChance = modifiers.removeChance ?? 20;
                // Cage locked → cannot remove
                if (toyId === 'cage' && window.GAME_STATE.cageLocked) removeChance = 0;

                if (removeChance > 0) {
                    // Find a valid remove task (body part must actually hold this toy)
                    const validRemoveTasks = removeTasks.filter(task => {
                        const bp = task.bodyPart;
                        if (!bp) return false;
                        return conditions.countToyInBodyPart(toyId, bp) > 0;
                    });

                    if (validRemoveTasks.length > 0) {
                        const task = validRemoveTasks[Math.floor(Math.random() * validRemoveTasks.length)];
                        candidates.push({ type: 'remove', toyKey, setId, toyId, chance: removeChance, task });
                    }
                }
            }
        }
    }

    if (candidates.length === 0) return null;

    // ── Roll each candidate independently; collect winners ─────────────────
    // Multiple can win; pick one winner at random if more than one fires.
    const winners = candidates.filter(c => Math.random() * 100 < c.chance);

    if (winners.length === 0) return null;

    const chosen = winners[Math.floor(Math.random() * winners.length)];

    console.log(`🎲 Add/Remove task triggered: ${chosen.type} ${chosen.toyId} on ${chosen.task.bodyPart}`);

    // ── Return a unified task interface expected by taskLoader ──────────────
    return {
        // getHTML() must return a VN data object (bubbles array + optional image)
        getHTML: () => {
            if (typeof chosen.task.getHTML === 'function') {
                return chosen.task.getHTML();
            }
            // Fallback plain VN object
            const action = chosen.type === 'add' ? '📥 Add' : '📤 Remove';
            return {
                image: null,
                bubbles: [
                    `<strong>${action} ${chosen.toyId}</strong>`,
                    `<p>${chosen.type === 'add' ? 'Attach' : 'Remove'} ${chosen.toyId} ${chosen.type === 'add' ? 'to' : 'from'} ${chosen.task.bodyPart}.</p>`
                ]
            };
        },

        // execute() mutates body part state
        execute: () => {
            if (typeof chosen.task.execute === 'function') {
                chosen.task.execute();
            }
        }
    };
}

// Expose globally so playerMovement.js can call it
window.rollForAddRemoveTasks = rollForAddRemoveTasks;

export { rollForAddRemoveTasks };
