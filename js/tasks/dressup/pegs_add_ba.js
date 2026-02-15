// Add task: Place pegs on Ba
// This will be automatically converted to VN bubbles by the system

export default {
    id: 'dressup_pegs_add_ba',
    setId: 'dressup',
    toyId: 'pegs',
    type: 'add',
    bodyPart: 'Ba',
    
    quantity: function(difficulty) {
        return difficulty === 'easy' ? 2 : difficulty === 'hard' ? 5 : 3;
    },
    
    execute: function() {
        const difficulty = window.GAME_STATE.toyDifficulties['dressup_pegs'] || 'medium';
        const quantity = this.quantity(difficulty);
        
        for (let i = 0; i < quantity; i++) {
            if (!window.addToyToBodyPart(this.bodyPart, this.toyId)) {
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
            <strong>📥 Pick Up Pegs</strong>
            
            <p>Before the main task, you need to prepare.</p>
            
            <p>Attach ${quantity} clothes peg${quantity > 1 ? 's' : ''} to Ba.</p>
            
            ${currentCount > 0 ? `<p><em>Ba already has ${currentCount} pegs. These will join them.</em></p>` : ''}
            
            <img src="https://picsum.photos/seed/pegs_add_ba/800/600"/>
        `;
    }
};
