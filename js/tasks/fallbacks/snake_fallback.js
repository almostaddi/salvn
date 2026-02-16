export default {
    id: 'snake_fallback',
    type: 'snake',
    isFallback: true,
    
    getDifficulty: (difficulty, conditions, difficultyMap, snakeLadderInfo) => {
        const distance = Math.abs(snakeLadderInfo.distance);
        
        // Return VN format instead of HTML string
        return {
            image: 'https://picsum.photos/seed/snake_fallback/800/600',
            bubbles: [
                '<strong>Snake Slide! 🐍</strong>',
                `<p>Oh no! You landed on a snake!</p>`,
                `<p>You slid down ${distance} spaces from ${snakeLadderInfo.from} to ${snakeLadderInfo.to}.</p>`,
                `<p>Take a moment to recover from the fall.</p>`,
                `<p style="font-size: 0.85em; color: #666;"><em>This is the fallback snake task. It appears when no conditional snake tasks are available. Fall distance: ${distance} spaces.</em></p>`
            ]
        };
    }
};
