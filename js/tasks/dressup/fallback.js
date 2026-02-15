export default {
    id: 'dressup_fallback',
    setId: 'dressup',
    toyId: 'hand',
    type: 'standard',
    
    getDifficulty: (difficulty, conditions, difficultyMap) => {
        const count = difficulty === 'easy' ? 5 : difficulty === 'hard' ? 15 : 10;
        
        return `
            <strong>Painplay Task</strong>
            <p>Clap your hands ${count} times.</p>
            <p style="font-size: 0.85em; color: #666; margin-top: 10px;">
                <em>This is a fallback task for the Painplay set. It appears when no other tasks are available.</em>
            </p>
            <img src="https://picsum.photos/seed/dressup_fallback/800/600"/>
        `;
    }
};
