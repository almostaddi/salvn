// Player movement, dice rolling, and game flow

let playerPosition = 0;
let isRolling = false;
let currentSquare = 0;

// Create player piece
const player = document.createElement('div');
player.classList.add('player');

// Scroll to player position instantly
function scrollToPlayer(playerPos, instant = true) {
    const square = document.getElementById(`square-${playerPos}`);
    if (!square) {
        console.warn(`⚠️ Square ${playerPos} not found yet`);
        return false;
    }
    
    // Use instant scroll by default for better UX when loading pages
    square.scrollIntoView({
        behavior: instant ? 'auto' : 'smooth',
        block: 'center',
        inline: 'center'
    });
    console.log(`📍 ${instant ? 'Jumped' : 'Scrolled'} to player at square ${playerPos}`);
    return true;
}

// Scroll to bottom of page (for new games starting at square 1)
function scrollToBottom() {
    // Scroll the window to the very bottom
    window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'auto'
    });
    console.log(`📍 Jumped to bottom of page`);
}

// Animate player movement
export function animatePlayer(start, end, callback, instant = false) {
    if (instant) {
        const targetSquare = document.getElementById(`square-${end}`);
        if (targetSquare) targetSquare.appendChild(player);
        
        // Don't scroll after instant movement - let player see where they landed
        // Scrolling only happens when returning from tasks
        
        if (callback) callback();
        return;
    }
    
    let current = start;
    const step = current < end ? 1 : -1;
    
    const interval = setInterval(() => {
        current += step;
        const currentSquare = document.getElementById(`square-${current}`);
        if (currentSquare) currentSquare.appendChild(player);
        
        if (current === end) {
            clearInterval(interval);
            
            // Don't scroll after dice roll - let player see their movement
            // Scrolling only happens when returning from tasks
            
            if (callback) callback();
        }
    }, 200);
}

// Roll dice
export function rollDice() {
    if (isRolling) {
        console.log('Already rolling, ignoring click');
        return;
    }
    
    isRolling = true;
    const rollDiceButton = document.getElementById('rollDice');
    const diceResult = document.getElementById('diceResult');
    const turnCounter = document.getElementById('turnCounter');
    const testJumpInput = document.getElementById('testJumpInput');
    
    rollDiceButton.disabled = true;
    rollDiceButton.textContent = '🎲 Roll Dice';
    
    // Get snakes and ladders from board renderer
    const snakes = window.BOARD_SNAKES || {16:6, 47:26, 49:11, 56:53, 62:19, 64:60, 87:24, 93:73, 95:75, 98:78};
    const ladders = window.BOARD_LADDERS || {1:38, 4:14, 9:31, 21:42, 28:84, 36:44, 51:67, 71:91, 80:99};
    const totalSquares = window.GAME_STATE.totalSquares || 100;
    
    // Check if there's a jump value
    const jumpValue = parseInt(testJumpInput.value);
    
    let diceRoll, nextPosition;
    
    if (jumpValue >= 1 && jumpValue <= totalSquares) {
        // Jump mode
        window.GAME_STATE.turnCount++;
        diceRoll = jumpValue - playerPosition;
        const resultText = `Jump to: ${jumpValue} 🎯`;
        diceResult.textContent = resultText;
        window.GAME_STATE.diceResultText = resultText;
        turnCounter.textContent = `Turn: ${window.GAME_STATE.turnCount}`;
        nextPosition = jumpValue;
        testJumpInput.value = '';
    } else {
        // Normal dice roll
        window.GAME_STATE.turnCount++;
        diceRoll = Math.floor(Math.random() * 6) + 1;
        const resultText = `Dice: ${diceRoll} 🎲`;
        diceResult.textContent = resultText;
        window.GAME_STATE.diceResultText = resultText;
        turnCounter.textContent = `Turn: ${window.GAME_STATE.turnCount}`;
        nextPosition = playerPosition + diceRoll;
        if (nextPosition > totalSquares) nextPosition = totalSquares;
    }
    
    // Check for snake or ladder
    const isSnake = snakes[nextPosition];
    const isLadder = ladders[nextPosition];
    
    // Roll for add/remove tasks
    const addRemoveTask = window.rollForAddRemoveTasks ? window.rollForAddRemoveTasks() : null;
    
    // Animate to the square
    animatePlayer(playerPosition, nextPosition, () => {
        playerPosition = nextPosition;
        currentSquare = nextPosition;
        window.GAME_STATE.playerPosition = playerPosition;
        
        // Execute add/remove task if any
        if (addRemoveTask && addRemoveTask.execute) {
            addRemoveTask.execute();
        }
        
        // Check if final square
        if (playerPosition === totalSquares) {
            // STATE: Ready for final challenge
            window.GAME_STATE.gamePhase = 'awaiting_final_challenge';
            window.GAME_STATE.pendingSnakeLadder = null;
            window.GAME_FUNCTIONS.saveState();
            
            window.showPage('task');
            window.displayFinalChallenge();
            isRolling = false;
            return;
        }
        
        // Stay on board page and show Continue button
        rollDiceButton.textContent = '🚪 Enter';
        rollDiceButton.disabled = false;
        isRolling = false;
        
        // Clear onclick first to prevent double-firing
        rollDiceButton.onclick = null;
        
        // PRELOAD IMAGES IMMEDIATELY AFTER LANDING
        // Get the task that will be shown
        const taskToShow = window.selectNextTask();
        if (taskToShow && window.preloadTaskImages) {
            console.log('🎬 Preloading task images after landing...');
            window.preloadTaskImages(taskToShow, addRemoveTask).catch(err => {
                console.warn('⚠️ Image preload failed:', err);
            });
        }
        
        // Set up what happens when user clicks Continue
        if (isSnake || isLadder) {
            // Snake/Ladder: Highlight the destination square
            const finalPosition = isSnake ? snakes[nextPosition] : ladders[nextPosition];
            const destSquare = document.getElementById(`square-${finalPosition}`);
            if (destSquare) {
                destSquare.classList.add(isSnake ? 'snake-destination' : 'ladder-destination');
            }
            
            const pendingSnakeLadder = {
                type: isSnake ? 'snake' : 'ladder',
                from: nextPosition,
                to: finalPosition,
                addRemoveTask: addRemoveTask
            };
            
            // STATE: Waiting to show snake/ladder task
            window.GAME_STATE.gamePhase = 'awaiting_snake_ladder_task';
            window.GAME_STATE.pendingSnakeLadder = pendingSnakeLadder;
            window.GAME_FUNCTIONS.saveState();
            
            rollDiceButton.onclick = () => {
                // Remove highlight when continuing
                if (destSquare) {
                    destSquare.classList.remove('snake-destination', 'ladder-destination');
                }
                window.showPage('task');
                window.displaySnakeLadderTask(pendingSnakeLadder.type, pendingSnakeLadder.from, pendingSnakeLadder.to);
            };
        } else {
            // STATE: Waiting to show normal task
            window.GAME_STATE.gamePhase = 'awaiting_normal_task';
            window.GAME_STATE.pendingSnakeLadder = null;
            window.GAME_STATE.pendingAddRemoveTask = addRemoveTask ? {
                getHTML: addRemoveTask.getHTML ? addRemoveTask.getHTML() : null,
                executed: true
            } : null;
            window.GAME_FUNCTIONS.saveState();
            
            rollDiceButton.onclick = () => {
                window.showPage('task');
                window.displayRandomInstructionWithAddRemove(addRemoveTask);
            };
        }
    });
}

// Handle task completion
export function onTaskComplete() {
    const currentMetronomeTask = window.currentMetronomeTask;
    
    if (currentMetronomeTask && !currentMetronomeTask.isComplete()) return;
    
    // Clear current instruction when returning to board
    window.GAME_STATE.currentInstruction = '';
    
    // Check what phase we're in
    if (window.GAME_STATE.gamePhase === 'awaiting_snake_ladder_task') {
        // Just completed snake/ladder task, need to move piece
        const savedPending = window.GAME_STATE.pendingSnakeLadder;
        
        // STATE: Need to move piece after snake/ladder
        window.GAME_STATE.gamePhase = 'awaiting_snake_ladder_movement';
        window.GAME_FUNCTIONS.saveState();
        
        window.showPage('board');
        
        // Instant scroll to player after returning to board
        scrollToPlayer(savedPending.from, true);
        
        const rollDiceButton = document.getElementById('rollDice');
        rollDiceButton.textContent = '🚪 Enter';
        rollDiceButton.disabled = false;
        rollDiceButton.onclick = null;
        
        // Continue button moves the piece
        rollDiceButton.onclick = () => {
            rollDiceButton.disabled = true;
            rollDiceButton.onclick = null;
            
            animatePlayer(savedPending.from, savedPending.to, () => {
                playerPosition = savedPending.to;
                currentSquare = savedPending.to;
                window.GAME_STATE.playerPosition = playerPosition;
                
                const totalSquares = window.GAME_STATE.totalSquares || 100;
                
                // Check if final square after snake/ladder
                if (playerPosition === totalSquares) {
                    // STATE: Ready for final challenge
                    window.GAME_STATE.gamePhase = 'awaiting_final_challenge';
                    window.GAME_STATE.pendingSnakeLadder = null;
                    window.GAME_FUNCTIONS.saveState();
                    
                    window.showPage('task');
                    window.displayFinalChallenge();
                    return;
                }
                
                // STATE: Waiting to show normal task at destination
                window.GAME_STATE.gamePhase = 'awaiting_normal_task';
                window.GAME_STATE.pendingSnakeLadder = null;
                window.GAME_FUNCTIONS.saveState();
                
                // Stay on board, show Continue button for the destination square task
                rollDiceButton.textContent = '🚪 Enter';
                rollDiceButton.disabled = false;
                rollDiceButton.onclick = null;
                
                // Second continue: show the normal task at destination square
                rollDiceButton.onclick = () => {
                    window.showPage('task');
                    window.displayRandomInstructionWithAddRemove(savedPending.addRemoveTask);
                };
            }, true);
        };
    } else {
        // Completed normal task, ready for next roll
        // STATE: Ready for dice roll
        window.GAME_STATE.gamePhase = 'awaiting_dice_roll';
        window.GAME_STATE.pendingSnakeLadder = null;
        window.GAME_STATE.pendingAddRemoveTask = null;
        window.GAME_FUNCTIONS.saveState();
        
        window.showPage('board');
        
        // Instant scroll to player after returning to board
        scrollToPlayer(playerPosition, true);
        
        const rollDiceButton = document.getElementById('rollDice');
        rollDiceButton.textContent = '🎲 Roll Dice';
        rollDiceButton.disabled = false;
        rollDiceButton.onclick = null;
        rollDiceButton.onclick = rollDice;
    }
}

// Get current player position
export function getPlayerPosition() {
    return playerPosition;
}

// Set player position (for loading saved games)
export function setPlayerPosition(position) {
    playerPosition = position;
    currentSquare = position;
    
    // Place player on the square
    if (position > 0) {
        const square = document.getElementById(`square-${position}`);
        if (square) {
            square.appendChild(player);
            
            // Don't scroll on load - page starts at bottom by default
        }
    }
}

// Get pending snake/ladder
export function getPendingSnakeLadder() {
    return window.GAME_STATE.pendingSnakeLadder;
}

// Set pending snake/ladder (for loading saved games)
export function setPendingSnakeLadder(pending) {
    window.GAME_STATE.pendingSnakeLadder = pending;
}

// Clear pending snake/ladder
export function clearPendingSnakeLadder() {
    window.GAME_STATE.pendingSnakeLadder = null;
}

// Get player element
export function getPlayerElement() {
    return player;
}

// Reset player state
export function resetPlayerState() {
    playerPosition = 0;
    isRolling = false;
    currentSquare = 0;
    window.GAME_STATE.pendingSnakeLadder = null;
    window.GAME_STATE.gamePhase = 'awaiting_dice_roll';
    player.remove();
}

// Expose scrollToPlayer and scrollToBottom for use by main.js
export { scrollToPlayer, scrollToBottom };
