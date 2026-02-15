// Add task: Place pegs on Ni (nipples)

export default {
    id: 'dressup_pegs_add_ni',
    setId: 'dressup',
    toyId: 'pegs',
    type: 'add',
    bodyPart: 'Ni',
    
    quantity: function(difficulty) {
        // Nipples max out at 2 pegs
        return 2;
    },
    
    execute: function() {
        const quantity = this.quantity();
        
        for (let i = 0; i < quantity; i++) {
            if (!window.addToyToBodyPart(this.bodyPart, this.toyId)) {
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
            <strong>📥 Nipple Pegs</strong>
            
            <p>Time to add some pegs to your nipples.</p>
            
            <p>Attach ${quantity} peg${quantity > 1 ? 's' : ''} to Ni (one per nipple).</p>
            
            ${currentCount > 0 ? `<p><em>You already have ${currentCount} on Ni.</em></p>` : '<p><em>This will sting at first, but you can handle it.</em></p>'}
            
            <img src="https://picsum.photos/seed/pegs_add_ni/800/600"/>
        `;
    }
};
