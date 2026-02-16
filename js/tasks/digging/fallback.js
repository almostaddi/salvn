export default {
    id: 'digging_fallback',
    setId: 'digging',
    toyId: 'hand',
    type: 'standard',
    
    getDifficulty: (difficulty, conditions, difficultyMap) => {
        const seconds = difficulty === 'easy' ? 10 : difficulty === 'hard' ? 30 : 20;
        
        // Return VN format
        return {
            image: 'https://picsum.photos/seed/digging_fallback/800/600',
            bubbles: [
                '<strong>Deepthroat Task</strong>',
                `<p>Make exaggerated swallowing motions for ${seconds} seconds.</p>`,
                '<p style="font-size: 0.85em; color: #666;"><em>This is a fallback task for the Deepthroat set. It appears when no other tasks are available.</em></p>'
            ]
        };
    }
};
