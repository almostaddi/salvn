export default {
    id: 'apple_fallback',
    setId: 'apple',
    toyId: 'hand',
    type: 'standard',
    
    getDifficulty: (difficulty, conditions, difficultyMap) => {
        const count = difficulty === 'easy' ? 5 : difficulty === 'hard' ? 15 : 10;
        
        return `
            <strong>Anal Set Task</strong>
            <p>Touch your toes ${count} times.</p>
            <p style="font-size: 0.85em; color: #666; margin-top: 10px;">
                <em>This is a fallback task for the Anal set. It appears when no other tasks are available.</em>
            </p>
            <img src="https://picsum.photos/seed/apple_fallback/800/600"/>
        `;
    }
};
