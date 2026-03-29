// js/tasks/dressup/pegs_add_ba_vn.js

import { resetPlayerState } from '../../board/playerMovement.js';
import { getPlayerBodyParts } from '../../state/gameState.js';
import Counter from '../modules/counter.js';

export default {
    id: 'dressup_pegs_add_ba_vn',
    setId: 'dressup',
    toyId: 'pegs',
    type: 'standard',
    isFallback: false,

    requires: {
        toys: [{ toy: 'pegs', quantity: 5 }],
        freeBodyParts: [],
        notHolding: [],
        bodyPartCapacity: [{ bodyPart: 'Ba', toy: 'pegs', spaceNeeded: 5 }]
    },

    getDifficulty: (difficulty, conditions, difficultyMap) => {
        const currentPegs = conditions.countToy('pegs');
        const baCount     = conditions.countToyInBodyPart('pegs', 'Ba');
        const maxBa       = 20;
        const spaceLeft   = maxBa - baCount;
        const [subject]   = (conditions.pronouns || 'they/them').split('/');
        const domName     = conditions.getRandomDomName();
        const nickname    = conditions.getRandomNickname();

        const counter = new Counter({
            label:         'Pegs on balls',
            barColor:      'linear-gradient(to right, #51cf66, #37b24d)',
            tickLabel:     (c, t) => `🖇️ Attach Peg (${c}/${t})`,
            tickDoneLabel: (t)    => `✓ All Pegs Attached (${t}/${t})`,
        });

        return {
            image: 'https://realbdsmporn.net/wp-content/uploads/2020/01/85c6be9e4af9150e14cb28000471b7e7.jpg',

            bubbles: [
                '<strong>📥 Clothes Pegs Task</strong>',
                `<p>You currently have ${currentPegs} pegs attached in total.</p>`,
                currentPegs > 10
                    ? '<p><em>That is already a lot — you are doing great.</em></p>'
                    : '<p>Let us add some more.</p>'
            ],

            data: {
                targetCount: 5,
                actualCount: 0,
                subject,
                domName,      // Store in data for consistency across stages
                nickname      // Store in data for consistency across stages
            },

            stages: [
                // ── Stage 1: Choose placement ──────────────────────────────
                {
                    id: 'choose_style',
                    image: 'https://realbdsmporn.net/wp-content/uploads/2020/01/85c6be9e4af9150e14cb28000471b7e7.jpg',
                    bubbles: [
                        '<strong>Placement Style</strong>',
                        'Lets add some pegs to your balls',
                        (data) => `<p>Let's see where ${data.subject} wants to place the pegs...</p>`
                    ],
                    choices: [
                        {
                            text: 'Spread evenly',
                            onSelect(data) {
                                data.placement = 'spread';
                                data.bonus     = 'You chose the easier option.';
                                return 'prepare';
                            }
                        },
                        {
                            text: 'All in one spot',
                            onSelect(data) {
                                data.placement   = 'concentrated';
                                data.bonus       = 'That will be more intense!';
                                data.targetCount = Math.max(1, data.targetCount - 2);
                                return 'prepare';
                            }
                        }
                    ]
                },

                // ── Stage 2: Prepare ───────────────────────────────────────
                {
                    id: 'prepare',
                    image: 'https://ei.phncdn.com/videos/202111/04/397483311/original/(m=eaSaaTbaAaaaa)(mh=wTHqdsUSEb46-0LJ)4.jpg',
                    bubbles: [],
                    onMount(data, vn) {
                        vn.clearBubbles();
                        vn.addBubble('<strong>Prepare Yourself</strong>');
                        vn.addBubble(`<p>${data.bonus} You will need to attach ${data.targetCount} pegs to your balls, make sure you are ready!</p>`);
                        vn.advanceBubble();
                    },
                    buttons: [{ text: 'Ready', nextStage: 'attach', type: 'next' }]
                },

                // ── Stage 3: Attach pegs one at a time ────────────────────
                {
                    id: 'attach',
                    image: 'https://ei.phncdn.com/videos/202111/04/397483311/original/(m=eaSaaTbaAaaaa)(mh=wTHqdsUSEb46-0LJ)4.jpg',

                    leftModule: {
                        title: 'Progress',
                        content: (data) => counter.html(data.actualCount, data.targetCount)
                    },

                    bubbles: [],
                    onMount(data, vn) {
                        vn.clearBubbles();
                        vn.addBubble('<strong>Attach the Pegs</strong>');
                        vn.addBubble(data.placement === 'spread'
                            ? '<p>Spread them evenly across your balls.</p>'
                            : '<p>Place them all in one concentrated area.</p>');
                        vn.advanceBubble();
                    },

                    buttons: [
                        {
                            text: '🖇️ Attach Peg',
                            type: 'choice',
                            execute(data) {
                                if (data.actualCount >= data.targetCount) return;
                                window.addToyToBodyPart('Ba', 'pegs');
                                data.actualCount++;
                                counter.update(data.actualCount, data.targetCount);
                            },
                            nextStage: null
                        },
                        {
                            text: '✓ Done',
                            type: 'next',
                            execute(data) {
                                if (data.actualCount < data.targetCount) {
                                    return false;
                                }
                            },
                            nextStage: 'verify'
                        }
                    ]
                },

                // ── Stage 4: How do they feel? ─────────────────────────────
                {
                    id: 'verify',
                    image: 'https://www.femdom-resource.com/wp-content/uploads/2019/11/Clothespin.jpg',
                    leftModule: null,
                    bubbles: [],
                    onMount(data, vn) {
                        vn.clearBubbles();
                        vn.addBubble(`<p>Great! You have attached ${data.targetCount} pegs to your balls, how do they feel?</p>`);
                        vn.advanceBubble();
                    },
                    choices: [
                        {
                            text: 'Comfortable',
                            onSelect(data) {
                                data.feeling  = 'comfortable';
                                data.feedback = 'Good! That means they are placed correctly.';
                                return 'complete';
                            }
                        },
                        {
                            text: 'Intense',
                            onSelect(data) {
                                data.feeling  = 'intense';
                                data.feedback = 'Perfect! That is exactly how they should feel.';
                                return 'complete';
                            }
                        },
                        {
                            text: 'Too much',
                            onSelect(data) {
                                data.feeling  = 'too_much';
                                data.feedback = 'Do not worry — you will get used to it. Keep them on!';
                                return 'complete';
                            }
                        }
                    ]
                },

                // ── Stage 5: Complete ──────────────────────────────────────
                {
                    id: 'complete',
                    image: 'https://www.femdom-resource.com/wp-content/uploads/2019/11/Clothespin.jpg',
                    bubbles: [],
                    onMount(data, vn) {
                        vn.clearBubbles();
                        vn.addBubble('<strong>🎉 Task Complete!</strong>');
                        vn.addBubble(`<p>${data.feedback}</p>`);
                        
                        if (data.placement === 'concentrated' && data.feeling === 'intense') {
                            vn.addBubble('<p><em>You chose the hard way and you are feeling it. Impressive!</em></p>');
                        }
                        
                        // Add Dom name encouragement if available
                        if (data.domName && data.nickname) {
                            vn.addBubble(`<p>I'm sure ${data.domName} would be proud of ${data.subject === 'he' ? 'his' : data.subject === 'she' ? 'her' : 'their'} ${data.nickname}!</p>`);
                        } else if (data.domName) {
                            vn.addBubble(`<p>I'm sure ${data.domName} would be proud!</p>`);
                        }
                        if (data.nickname) {
                            vn.addBubble(`<p>Good ${data.nickname}!</p>`);
                        }
                        vn.addBubble(`<p>Good ${data.nickname}!</p>`);
                        vn.addBubble('<p>The pegs stay on for now. You can continue the game.</p>');
                        vn.advanceBubble();
                    },
                    complete: true
                }
            ]
        };
    }
};