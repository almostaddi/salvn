// Simple VN task (no stages, just bubbles and image)

export default {
    id: 'dressup_pegs_simple',
    setId: 'dressup',
    toyId: 'pegs',
    type: 'standard',
    isFallback: false,
    
    requires: {
        toys: [{ toy: 'pegs', quantity: 2 }],
        freeBodyParts: [],
        notHolding: [],
        bodyPartCapacity: [{ bodyPart: 'Ni', toy: 'pegs', spaceNeeded: 2 }]
    },
    
    getDifficulty: (difficulty, conditions, difficultyMap) => {
        const count = difficulty === 'easy' ? 1 : 2;
        const currentNi = conditions.countToyInBodyPart('pegs', 'Ni');
        
        // Simple VN format - just image and bubbles
        return {
            image: 'https://picsum.photos/seed/pegs_nipples/800/600',
            bubbles: [
                '<strong>Nipple Pegs</strong>',
                `<p>Attach ${count} peg${count > 1 ? 's' : ''} to your nipples (Ni).</p>`,
                currentNi > 0 
                    ? `<p><em>You already have ${currentNi} on Ni. These will join them.</em></p>`
                    : '<p>Make sure they\'re secure but not too tight.</p>',
                '<p>This might sting a little at first, but you\'ll get used to it.</p>'
            ]
        };
    },
    
    execute: function() {
        const difficulty = window.GAME_STATE.toyDifficulties['dressup_pegs'] || 'medium';
        const count = difficulty === 'easy' ? 1 : 2;
        
        for (let i = 0; i < count; i++) {
            if (!window.addToyToBodyPart('Ni', 'pegs')) {
                return false;
            }
        }
        return true;
    }
};
