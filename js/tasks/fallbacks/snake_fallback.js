export default {
    id: 'snake_fallback',
    type: 'snake',
    isFallback: true,
    
    getDifficulty: (difficulty, conditions, difficultyMap, snakeLadderInfo) => {
        const distance = Math.abs(snakeLadderInfo.distance);
        
        return `
            <strong>Snake Slide! 🐍</strong>
            <p>You slid down ${distance} spaces from ${snakeLadderInfo.from} to ${snakeLadderInfo.to}.</p>
            <p>Take a moment to recover from the fall.</p>
            <p style="font-size: 0.85em; color: #666; margin-top: 10px;">
                <em>This is the fallback snake task. It appears when no conditional snake tasks are available. Fall distance: ${distance} spaces.</em>
            </p>
            <img src="https://picsum.photos/seed/snake_fallback/800/600"/>
        `;
    }
};
