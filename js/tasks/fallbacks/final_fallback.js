export default {
    id: 'fallback',
    type: 'final',
    
    getDifficulty: (difficulty, conditions, difficultyMap, prizeType) => {
        // Generate prize HTML with modifiers
        let html = '<strong>🏆 Final Challenge! 🏆</strong>';
        html += '<p>You\'ve reached the end! Let\'s see what your prize is...</p>';
        html += '<div style="margin-top: 20px; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea;">';
        html += generatePrizeHTML(prizeType, conditions);
        html += '</div>';
        html += '<p style="font-size: 0.85em; color: #666; margin-top: 10px;">';
        html += '<em>This is the fallback final challenge. It appears when no other final challenges are available.</em>';
        html += '</p>';
        html += '<img src="https://picsum.photos/seed/final_fallback/800/600"/>';
        
        return html;
    }
};

// Helper function to generate prize HTML
function generatePrizeHTML(prizeType, conditions) {
    const finalChallengeModifiers = window.GAME_STATE?.finalChallengeModifiers || { ce: false, pf: false };
    
    let html = '<div style="text-align: center;">';
    html += '<div style="font-size: 24px; margin-bottom: 10px;">━━━━━━━━━━━━━━━━━━━━</div>';
    html += '<div style="font-size: 20px; font-weight: 600; margin-bottom: 15px;">🎉 Prize Result 🎉</div>';
    
    if (prizeType === 'full') {
        html += '<div style="font-size: 28px; font-weight: bold; color: #ffd93d; margin-bottom: 10px;">🏆 FULL PRIZE! 🏆</div>';
        html += '<p style="font-size: 16px; margin-bottom: 15px;">Congratulations! You won big!</p>';
        
        // Add modifiers for Full
        if (finalChallengeModifiers.ce) {
            html += '<div style="background: #fff3cd; padding: 10px; border-radius: 6px; margin-bottom: 10px; text-align: left;">';
            html += '<strong>🥛 CE (Cum Eating):</strong> Complete the CE requirement.';
            html += '</div>';
        }
        if (finalChallengeModifiers.pf) {
            html += '<div style="background: #cfe2ff; padding: 10px; border-radius: 6px; margin-bottom: 10px; text-align: left;">';
            html += '<strong>⏱️ PF (Post Finish):</strong> Complete the PF requirement.';
            html += '</div>';
        }
    } else if (prizeType === 'ruin') {
        html += '<div style="font-size: 28px; font-weight: bold; color: #51cf66; margin-bottom: 10px;">🎉 Ruin 🎉</div>';
        html += '<p style="font-size: 16px; margin-bottom: 15px;">You got ruined!</p>';
        
        // Add modifiers for Ruin (CE only)
        if (finalChallengeModifiers.ce) {
            html += '<div style="background: #fff3cd; padding: 10px; border-radius: 6px; margin-bottom: 10px; text-align: left;">';
            html += '<strong>🥛 CE (Cum Eating):</strong> Complete the CE requirement.';
            html += '</div>';
        }
    } else {
        html += '<div style="font-size: 28px; font-weight: bold; color: #adb5bd; margin-bottom: 10px;">❌ Denial ❌</div>';
        html += '<p style="font-size: 16px; margin-bottom: 15px;">Better luck next time!</p>';
        // No modifiers for Denial
    }
    
    html += '</div>';
    return html;
}
