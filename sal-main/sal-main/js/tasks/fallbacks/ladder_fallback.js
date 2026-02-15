export default {
    id: 'ladder_fallback',
    type: 'ladder',
    isFallback: true,
    
    getDifficulty: (difficulty, conditions, difficultyMap, snakeLadderInfo) => {
        const distance = snakeLadderInfo.distance;
        
        return `
            <strong>Ladder Climb! 🪜</strong>
            <p>You climbed ${distance} spaces from ${snakeLadderInfo.from} to ${snakeLadderInfo.to}!</p>
            <p>Celebrate your good fortune!</p>
            <p style="font-size: 0.85em; color: #666; margin-top: 10px;">
                <em>This is the fallback ladder task. It appears when no conditional ladder tasks are available. Climb distance: ${distance} spaces.</em>
            </p>
            <img src="https://picsum.photos/seed/ladder_fallback/800/600"/>
        `;
    }
};
