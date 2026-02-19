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
        const { pronouns } = conditions;
        const [subject, object] = pronouns.split('/');
        
        // Dynamic task based on state
        if (availableSpace < 5) {
            return {
                image: 'https://picsum.photos/seed/pegs_error/800/600',
                bubbles: [
                    '<strong>⚠️ Too Many Pegs</strong>',
                    `<p>Ba already has ${baCount} pegs. Max is ${maxBa}.</p>`,
                    `<p>Can only add ${availableSpace} more. Remove some pegs first!</p>`
                ],
                complete: true
            };
        }
        
        // Normal task with stages
        return {
            image: 'https://picsum.photos/seed/pegs_intro/800/600',
            
            bubbles: [
                '<strong>📥 Clothes Pegs Task</strong>',
                `<p>You currently have ${currentPegs} pegs attached total.</p>`,
                hasManyPegs 
                    ? `<p><em>Wow, that is a lot of pegs already! You are doing great.</em></p>`
                    : `<p>Let us add some more pegs.</p>`
            ],
            
            data: {
                targetCount: 5,
                actualCount: 0,
                difficulty: difficulty,
                subject: subject,
                object: object
            },
            
            stages: [
                // Stage 1: Choose location preference
                {
                    id: 'choose_style',
                    image: 'https://picsum.photos/seed/pegs_choose/800/600',
                    bubbles: [
                        '<strong>Placement Style</strong>',
                        function(data) { return `<p>Lets see where ${data.subject} wants to place the pegs...</p>`; }
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
                                data.targetCount -= 2;
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
                        vn.addBubble('<strong>Prepare Your Balls</strong>');
                        vn.addBubble(`<p>${data.bonus}</p>`);
                        vn.addBubble(`<p>You will need to attach ${data.targetCount} pegs.</p>`);
                        vn.addBubble('<p>Make sure you are ready.</p>');
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
                    leftModule: null,
                    bubbles: [],
                    onMount: function(data, vn) {
                        vn.clearBubbles();
                        vn.addBubble('<strong>Verification</strong>');
                        vn.addBubble(`<p>Great! You have attached ${data.targetCount} pegs to Ba.</p>`);
                        vn.addBubble('<p>How do they feel?</p>');
                        vn.advanceBubble();
                    },
                    choices: [
                        {
                            text: 'Comfortable',
                            onSelect: function(data) {
                                data.feeling = 'comfortable';
                                data.feedback = 'Good! That means they are placed correctly.';
                                return 'complete';
                            }
                        },
                        {
                            text: 'Intense',
                            onSelect: function(data) {
                                data.feeling = 'intense';
                                data.feedback = 'Perfect! That is exactly how they should feel.';
                                return 'complete';
                            }
                        },
                        {
                            text: 'Too much',
                            onSelect: function(data) {
                                data.feeling = 'too_much';
                                data.feedback = 'Do not worry, you will get used to it. Keep them on!';
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
                        
                        if (data.placement === 'concentrated' && data.feeling === 'intense') {
                            vn.addBubble('<p><em>You chose the hard way and you are feeling it. Impressive!</em></p>');
                        }
                        
                        vn.addBubble('<p>The pegs will stay on for now. You can continue the game.</p>');
                        vn.advanceBubble();
                    },
                    complete: true
                }
            ]
        };
    }
};
