export default {
    id: 'fallback',
    type: 'final',
    
    getDifficulty: (difficulty, conditions, difficultyMap, prizeType) => {
        const finalChallengeModifiers = window.GAME_STATE?.finalChallengeModifiers || { ce: false, pf: false };
        
        // Build bubbles array based on prize type
        const bubbles = [
            '<strong>🏆 Final Challenge! 🏆</strong>',
            '<p>You\'ve reached the end! Let\'s see what your prize is...</p>'
        ];
        
        // Add prize-specific bubbles
        if (prizeType === 'full') {
            bubbles.push('<p style="font-size: 28px; font-weight: bold; color: #ffd93d; text-align: center;">🏆 FULL PRIZE! 🏆</p>');
            bubbles.push('<p>Congratulations! You won big!</p>');
            
            if (finalChallengeModifiers.ce) {
                bubbles.push('<p style="background: #fff3cd; padding: 10px; border-radius: 6px;"><strong>🥛 CE (Cum Eating):</strong> Complete the CE requirement.</p>');
            }
            if (finalChallengeModifiers.pf) {
                bubbles.push('<p style="background: #cfe2ff; padding: 10px; border-radius: 6px;"><strong>⏱️ PF (Post Finish):</strong> Complete the PF requirement.</p>');
            }
        } else if (prizeType === 'ruin') {
            bubbles.push('<p style="font-size: 28px; font-weight: bold; color: #51cf66; text-align: center;">🎉 Ruin 🎉</p>');
            bubbles.push('<p>You got ruined!</p>');
            
            if (finalChallengeModifiers.ce) {
                bubbles.push('<p style="background: #fff3cd; padding: 10px; border-radius: 6px;"><strong>🥛 CE (Cum Eating):</strong> Complete the CE requirement.</p>');
            }
        } else {
            bubbles.push('<p style="font-size: 28px; font-weight: bold; color: #adb5bd; text-align: center;">❌ Denial ❌</p>');
            bubbles.push('<p>Better luck next time!</p>');
        }
        
        bubbles.push('<p style="font-size: 0.85em; color: #666;"><em>This is the fallback final challenge. It appears when no other final challenges are available.</em></p>');
        
        // Return VN format
        return {
            image: 'https://picsum.photos/seed/final_fallback/800/600',
            bubbles: bubbles
        };
    }
};
