// Remove task: Take pegs off Ba

export default {
    id: 'dressup_pegs_remove_ba',
    setId: 'dressup',
    toyId: 'pegs',
    type: 'remove',
    bodyPart: 'Ba',
    
    quantity: function(difficulty) {
        return difficulty === 'easy' ? 2 : difficulty === 'hard' ? 5 : 3;
    },
    
    execute: function() {
        const difficulty = window.GAME_STATE.toyDifficulties['dressup_pegs'] || 'medium';
        const quantity = this.quantity(difficulty);
        
        for (let i = 0; i < quantity; i++) {
            if (!window.removeToyFromBodyPart(this.bodyPart, this.toyId)) {
                return false;
            }
        }
        return true;
    },
    
    getHTML: function() {
        const difficulty = window.GAME_STATE.toyDifficulties['dressup_pegs'] || 'medium';
        const quantity = this.quantity(difficulty);
        const conditions = window.getConditions();
        const currentCount = conditions.countToyInBodyPart('pegs', 'Ba');
        
        // This HTML will be parsed into VN bubbles
        return `
            <strong>📤 Remove Pegs</strong>
            
            <p>Good news! You get to take some pegs off.</p>
            
            <p>Remove ${quantity} clothes peg${quantity > 1 ? 's' : ''} from Ba.</p>
            
            ${currentCount > quantity 
                ? `<p><em>You have ${currentCount} pegs on Ba. ${currentCount - quantity} will remain.</em></p>`
                : `<p><em>This will remove all ${currentCount} pegs from Ba.</em></p>`
            }
            
            <p>Take them off slowly and carefully.</p>
            
            <img src="https://picsum.photos/seed/pegs_remove_ba/800/600"/>
        `;
    }
};
