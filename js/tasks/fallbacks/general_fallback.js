export default {
    id: 'general_fallback',
    type: 'general-fallback',
    
    getDifficulty: (difficulty, conditions, difficultyMap) => {
        return `
            <strong>⚠️ No Tasks Available</strong>
            <p>No tasks are currently available based on your toy selection and game state.</p>
            <p>Try adjusting your toy selection or settings.</p>
            <p style="font-size: 0.85em; color: #666; margin-top: 10px;">
                <em>This is the general fallback task. It only appears when absolutely no other tasks (including set fallbacks) can be selected.</em>
            </p>
            <img src="https://picsum.photos/seed/general_fallback/800/600"/>
        `;
    }
};
