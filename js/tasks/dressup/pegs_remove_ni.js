// Remove task: Take pegs off Ni (nipples)

export default {
    id: 'dressup_pegs_remove_ni',
    setId: 'dressup',
    toyId: 'pegs',
    type: 'remove',
    bodyPart: 'Ni',
    
    quantity: function(difficulty) {
        // Nipples max out at 2 pegs
        return 2;
    },
    
    execute: function() {
        const quantity = this.quantity();
        
        for (let i = 0; i < quantity; i++) {
            if (!window.removeToyFromBodyPart(this.bodyPart, this.toyId)) {
                return false;
            }
        }
        return true;
    },
    
    getHTML: function() {
        const quantity = this.quantity();
        const conditions = window.getConditions();
        const currentCount = conditions.countToyInBodyPart('pegs', 'Ni');
        
        // This HTML will be parsed into VN bubbles
        return `
            <strong>📤 Relief Time</strong>
            
            <p>You can take the pegs off your nipples now.</p>
            
            <p>Remove ${quantity} peg${quantity > 1 ? 's' : ''} from Ni.</p>
            
            ${currentCount === quantity 
                ? '<p><em>This will remove all pegs from your nipples. Enjoy the relief!</em></p>'
                : `<p><em>You have ${currentCount} pegs on Ni.</em></p>`
            }
            
            <p>Be gentle - they might be sensitive.</p>
            
            <img src="https://picsum.photos/seed/pegs_remove_ni/800/600"/>
        `;
    }
};
