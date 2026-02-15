export default {
    id: 'teaseanddenial_fallback',
    setId: 'teaseanddenial',
    toyId: 'hand',
    type: 'standard',
    
    getDifficulty: (difficulty, conditions, difficultyMap) => {
        const count = difficulty === 'easy' ? 3 : difficulty === 'hard' ? 10 : 5;
        
        return `
            <strong>Tease And Denial Task</strong>
            <p>Take ${count} deep, slow breaths while thinking teasing thoughts.</p>
            <p style="font-size: 0.85em; color: #666; margin-top: 10px;">
                <em>This is a fallback task for the Tease And Denial set. It appears when no other tasks are available.</em>
            </p>
            <img src="https://picsum.photos/seed/teaseanddenial_fallback/800/600"/>
        `;
    }
};
