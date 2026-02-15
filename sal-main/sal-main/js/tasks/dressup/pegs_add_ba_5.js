// Example task: Add 5 pegs to Ba
// Requirements should match what's in manifest.json

export default {
    id: 'dressup_pegs_add_ba_5',
    setId: 'dressup',
    toyId: 'pegs',
    type: 'standard',
    isFallback: false,
    
    // Note: These requirements are for reference/tools to update manifest
    // The manifest.json is the actual source of truth used by the selector
    requires: {
        toys: [
            { toy: 'pegs', quantity: 5 }
        ],
        freeBodyParts: [],  // Empty! Pegs don't need free body parts
        notHolding: [],
        bodyPartCapacity: [
            { bodyPart: 'Ba', toy: 'pegs', spaceNeeded: 5 }
        ]
    },
    
    getDifficulty: (difficulty, conditions, difficultyMap) => {
        const count = 5; // This task always places 5 pegs
        
        // Check if we can actually place them
        const currentCount = conditions.countToyInBodyPart('pegs', 'Ba');
        const maxCount = 20; // Ba max for pegs
        const canPlace = maxCount - currentCount;
        
        if (canPlace < count) {
            return `
                <strong>⚠️ Too Many Pegs</strong>
                <p>Ba already has ${currentCount} pegs. Max is ${maxCount}.</p>
                <p>Can only add ${canPlace} more.</p>
            `;
        }
        
        // Check quantity available
        const toyKey = 'dressup_pegs';
        const totalQuantity = conditions.toyQuantity(toyKey) || 10;
        const inUse = conditions.countToy('pegs');
        const available = totalQuantity - inUse;
        
        if (available < count) {
            return `
                <strong>⚠️ Not Enough Pegs</strong>
                <p>Need ${count} pegs, but only ${available} available.</p>
                <p>(${inUse} already in use)</p>
            `;
        }
        
        return `
            <strong>Add Clothes Pegs</strong>
            <p>Attach ${count} clothes pegs to Ba.</p>
            <img src="https://picsum.photos/seed/pegs_ba_5/800/600"/>
        `;
    },
    
    execute: function() {
        let added = 0;
        for (let i = 0; i < 5; i++) {
            if (window.addToyToBodyPart('Ba', 'pegs')) {
                added++;
            } else {
                break;
            }
        }
        return added > 0;
    }
};
