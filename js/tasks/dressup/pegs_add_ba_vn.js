// Advanced VN-style task with dynamic content, stages, and choices

export default {
    id: 'dressup_pegs_add_ba_vn',
    setId: 'dressup',
    toyId: 'pegs',
    type: 'standard',
    isFallback: false,
    
    // Manifest requirements
    requires: {
        toys: [
            { toy: 'pegs', quantity: 5 }
        ],
        freeBodyParts: [],
        notHolding: [],
        bodyPartCapacity: [
            { bodyPart: 'Ba', toy: 'pegs', spaceNeeded: 5 }
        ]
    },
    
    // Returns VN format
    getDifficulty: (difficulty, conditions, difficultyMap) => {
        // Check current game state
        const currentPegs = conditions.countToy('pegs');
        const hasManyPegs = currentPegs > 10;
        const baCount = conditions.countToyInBodyPart('pegs', 'Ba');
        const maxBa = 20;
        const availableSpace = maxBa - baCount;
        
        // Dynamic task based on state
        if (availableSpace < 5) {
            // Not enough space - show error stage
            return {
                image: 'https://picsum.photos/seed/pegs_error/800/600',
                bubbles: [
                    '<strong>⚠️ Too Many Pegs</strong>',
                    `<p>Ba already has ${baCount} pegs. Max is ${maxBa}.</p>`,
                    `<p>Can only add ${availableSpace} more. Remove some pegs first!</p>`
                ],
                complete: true // No actual task, just info
            };
        }
        
        // Normal task with stages
        return {
            image: 'https://picsum.photos/seed/pegs_intro/800/600',
            
            // Initial bubbles
            bubbles: [
                '<strong>📥 Clothes Pegs Task</strong>',
                `<p>You currently have ${currentPegs} pegs attached total.</p>`,
                hasManyPegs 
                    ? `<p><em>Wow, that's a lot of pegs already! You're doing great.</em></p>`
                    : `<p>Let's add some more pegs to Ba.</p>`
            ],
            
            // Shared data across stages
            data: {
                targetCount: 5,
                actualCount: 0,
                difficulty: difficulty
            },
            
            // Multi-stage task
            stages: [
                // Stage 1: Choose location preference
                {
                    id: 'choose_style',
                    image: 'https://picsum.photos/seed/pegs_choose/800/600',
                    bubbles: [
                        '<strong>Placement Style</strong>',
                        '<p>How would you like to place the pegs?</p>'
                    ],
                    choices: [
                        {
                            text: 'Spread evenly',
                            onSelect: function(data) {
                                data.placement = 'spread';
                                data.bonus = 'You chose the easier option.';
                                return 'prepare';
                            }
                        },
                        {
                            text: 'All in one spot',
                            onSelect: function(data) {
                                data.placement = 'concentrated';
                                data.bonus = 'That will be more intense!';
                                data.targetCount += 2; // Punishment for harder choice
                                return 'prepare';
                            }
                        }
                    ]
                },
                
                // Stage 2: Preparation
                {
                    id: 'prepare',
                    image: 'https://picsum.photos/seed/pegs_prepare/800/600',
                    bubbles: [],
                    onMount: function(data, vn) {
                        vn.clearBubbles();
                        vn.addBubble('<strong>Prepare Ba</strong>');
                        vn.addBubble(`<p>${data.bonus}</p>`);
                        vn.addBubble(`<p>You'll need to attach ${data.targetCount} pegs.</p>`);
                        vn.addBubble('<p>Make sure Ba is clean and ready.</p>');
                        vn.advanceBubble();
                    },
                    buttons: [
                        {
                            text: 'Ready',
                            nextStage: 'attach',
                            type: 'next'
                        }
                    ]
                },
                
                // Stage 3: Attachment with progress tracking
                {
                    id: 'attach',
                    image: 'https://picsum.photos/seed/pegs_attach/800/600',
                    
                    // Add progress module
                    leftModule: {
                        title: 'Progress',
                        content: function(data) {
                            const progress = (data.actualCount / data.targetCount) * 100;
                            return `
                                <div style="text-align: center; padding: 20px;">
                                    <div style="font-size: 48px; font-weight: bold; color: #667eea;">
                                        ${data.actualCount}/${data.targetCount}
                                    </div>
                                    <div style="margin-top: 10px; font-size: 14px; color: #666;">
                                        Pegs Attached
                                    </div>
                                    <div style="width: 100%; height: 10px; background: #e9ecef; border-radius: 5px; margin-top: 15px; overflow: hidden;">
                                        <div style="width: ${progress}%; height: 100%; background: linear-gradient(to right, #51cf66, #37b24d); transition: width 0.3s ease;"></div>
                                    </div>
                                </div>
                            `;
                        }
                    },
                    
                    bubbles: [],
                    onMount: function(data, vn) {
                        vn.clearBubbles();
                        vn.addBubble('<strong>Attach the Pegs</strong>');
                        vn.addBubble(`<p>Attach ${data.targetCount} pegs to Ba now.</p>`);
                        
                        if (data.placement === 'spread') {
                            vn.addBubble('<p>Remember to spread them evenly across Ba.</p>');
                        } else {
                            vn.addBubble('<p>Place them all in one concentrated area.</p>');
                        }
                        
                        vn.addBubble('<p><em>Watch your progress on the left.</em></p>');
                        vn.advanceBubble();
                    },
                    buttons: [
                        {
                            text: '✓ Pegs Attached',
                            nextStage: 'verify',
                            type: 'next',
                            execute: function(data) {
                                // Actually add pegs to game state
                                for (let i = 0; i < data.targetCount; i++) {
                                    window.addToyToBodyPart('Ba', 'pegs');
                                    data.actualCount++;
                                }
                                return true;
                            }
                        }
                    ]
                },
                
                // Stage 4: Verification with choice
                {
                    id: 'verify',
                    image: 'https://picsum.photos/seed/pegs_verify/800/600',
                    leftModule: null, // Remove progress module
                    bubbles: [],
                    onMount: function(data, vn) {
                        vn.clearBubbles();
                        vn.addBubble('<strong>Verification</strong>');
                        vn.addBubble(`<p>Great! You've attached ${data.targetCount} pegs to Ba.</p>`);
                        vn.addBubble('<p>How do they feel?</p>');
                        vn.advanceBubble();
                    },
                    choices: [
                        {
                            text: 'Comfortable',
                            onSelect: function(data) {
                                data.feeling = 'comfortable';
                                data.feedback = 'Good! That means they\'re placed correctly.';
                                return 'complete';
                            }
                        },
                        {
                            text: 'Intense',
                            onSelect: function(data) {
                                data.feeling = 'intense';
                                data.feedback = 'Perfect! That\'s exactly how they should feel.';
                                return 'complete';
                            }
                        },
                        {
                            text: 'Too much',
                            onSelect: function(data) {
                                data.feeling = 'too_much';
                                data.feedback = 'Don\'t worry, you\'ll get used to it. Keep them on!';
                                return 'complete';
                            }
                        }
                    ]
                },
                
                // Stage 5: Completion
                {
                    id: 'complete',
                    image: 'https://picsum.photos/seed/pegs_complete/800/600',
                    bubbles: [],
                    onMount: function(data, vn) {
                        vn.clearBubbles();
                        vn.addBubble('<strong>🎉 Task Complete!</strong>');
                        vn.addBubble(`<p>${data.feedback}</p>`);
                        
                        // Dynamic response based on all choices
                        if (data.placement === 'concentrated' && data.feeling === 'intense') {
                            vn.addBubble('<p><em>You chose the hard way and you\'re feeling it. Impressive!</em></p>');
                        }
                        
                        vn.addBubble('<p>The pegs will stay on for now. You can continue the game.</p>');
                        vn.advanceBubble();
                    },
                    complete: true // Mark as final stage
                }
            ]
        };
    }
};
