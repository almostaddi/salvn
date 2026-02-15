// Main entry point - orchestrates the game

// State management
import { 
    initializeState, 
    initializeGameFunctions,
    saveGameState, 
    loadGameState, 
    resetGameState 
} from './state/gameState.js';

// Board components
import { BoardRenderer } from './board/boardRenderer.js';
import { 
    rollDice, 
    onTaskComplete, 
    setPlayerPosition,
    resetPlayerState,
    animatePlayer
} from './board/playerMovement.js';

// Task system
import { loadTaskRegistry } from './tasks/taskSelector.js';
import { 
    loadAndDisplayTask,
    loadAndDisplaySnakeLadderTask,
    loadAndDisplayFinalChallenge
} from './tasks/taskLoader.js';

// UI components
import { initializeUI, restoreUIState } from './ui.js';

// Data
import { INSTRUCTION_SETS } from './data/instructionSets.js';

// Snakes and Ladders
import { 
    generateRandomSnakesAndLadders, 
    parseCustomSnakesLadders, 
    validateCustomSnakesLadders,
    formatSnakesLaddersForDisplay
} from './snakesLaddersGenerator.js';

// Game components
let boardRenderer;
let taskRegistryLoaded = false;

// Show/hide pages
function showPage(pageName) {
    console.log('🔄 Switching to page:', pageName);
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show target page
    const targetPage = document.getElementById(pageName + 'Page');
    if (targetPage) {
        targetPage.classList.add('active');
        console.log('✅ Now showing:', pageName);
    } else {
        console.error('❌ Page not found:', pageName + 'Page');
    }
    
    // Update body class and button text based on page
    const resetBtn = document.getElementById('resetBtn');
    if (pageName === 'home') {
        document.body.classList.add('on-home-page');
        document.body.classList.remove('show-fixed-buttons');
        resetBtn.textContent = '🔄 Reset Settings';
    } else {
        document.body.classList.remove('on-home-page');
        document.body.classList.add('show-fixed-buttons');
        resetBtn.textContent = '🔄 Reset';
    }
}

// Update classic radio button state based on board size
function updateClassicRadioState(boardSize) {
    const classicRadio = document.querySelector('input[name="snakesLaddersMode"][value="classic"]');
    if (!classicRadio) return;
    
    // Classic is always enabled (clickable)
    classicRadio.disabled = false;
    
    const label = classicRadio.parentElement;
    if (label) {
        label.style.opacity = '1';
        label.style.cursor = 'pointer';
    }
    
    // If board size changed from 100 and classic is selected, switch to random
    const isSize100 = boardSize === 100;
    if (!isSize100 && classicRadio.checked) {
        const randomRadio = document.querySelector('input[name="snakesLaddersMode"][value="random"]');
        if (randomRadio) {
            randomRadio.checked = true;
            handleSnakesLaddersModeChange('random');
        }
    }
}

// Validate and round board size
function validateBoardSize(input) {
    let value = parseInt(input.value);
    
    // Handle invalid/empty input
    if (isNaN(value) || input.value === '') {
        input.value = 100; // Default to 100
        value = 100;
    }
    
    // Enforce minimum of 10
    if (value < 10) {
        value = 10;
    }
    
    // Enforce maximum of 1000
    if (value > 1000) {
        value = 1000;
    }
    
    // Round to nearest 10
    value = Math.round(value / 10) * 10;
    
    // Ensure it's within bounds after rounding
    if (value < 10) {
        value = 10;
    }
    if (value > 1000) {
        value = 1000;
    }
    
    input.value = value;
    
    // Update game state
    window.GAME_STATE.totalSquares = value;
    
    // Update classic radio state
    updateClassicRadioState(value);
    
    if (boardRenderer && window.GAME_STATE.gameStarted) {
        boardRenderer.updateSize(value);
        boardRenderer.create();
    }
    
    saveGameState();
}

// Handle snakes and ladders mode change
function handleSnakesLaddersModeChange(mode) {
    window.GAME_STATE.snakesLaddersMode = mode;
    
    const customInputs = document.getElementById('customSnakesLaddersInputs');
    const customSnakesInput = document.getElementById('customSnakesInput');
    const customLaddersInput = document.getElementById('customLaddersInput');
    
    if (mode === 'custom') {
        // Show custom inputs
        customInputs.style.display = 'block';
        
        // Always populate with current values (either from state or empty)
        if (Object.keys(window.GAME_STATE.customSnakes).length > 0) {
            customSnakesInput.value = formatSnakesLaddersForDisplay(window.GAME_STATE.customSnakes);
        }
        if (Object.keys(window.GAME_STATE.customLadders).length > 0) {
            customLaddersInput.value = formatSnakesLaddersForDisplay(window.GAME_STATE.customLadders);
        }
    } else {
        // Hide custom inputs
        customInputs.style.display = 'none';
    }
    
    saveGameState();
}

// Custom task completion handler
function handleTaskCompletion() {
    // Clear current instruction when returning to board
    window.GAME_STATE.currentInstruction = '';
    
    // Check what phase we're in
    if (window.GAME_STATE.gamePhase === 'awaiting_snake_ladder_task') {
        // Just completed snake/ladder task, move piece immediately
        const savedPending = window.GAME_STATE.pendingSnakeLadder;
        
        // Move player to destination instantly (no animation)
        setPlayerPosition(savedPending.to);
        window.GAME_STATE.playerPosition = savedPending.to;
        
        const totalSquares = window.GAME_STATE.totalSquares || 100;
        
        // Check if final square after snake/ladder
        if (savedPending.to === totalSquares) {
            // STATE: Ready for final challenge
            window.GAME_STATE.gamePhase = 'awaiting_final_challenge';
            window.GAME_STATE.pendingSnakeLadder = null;
            saveGameState();
            
            showPage('task');
            window.displayFinalChallenge();
            return;
        }
        
        // STATE: Waiting to show normal task at destination
        window.GAME_STATE.gamePhase = 'awaiting_normal_task';
        window.GAME_STATE.pendingSnakeLadder = null;
        saveGameState();
        
        // Return to board with Enter button
        showPage('board');
        const rollDiceButton = document.getElementById('rollDice');
        rollDiceButton.textContent = '🚪 Enter';
        rollDiceButton.disabled = false;
        rollDiceButton.onclick = null;
        
        rollDiceButton.onclick = () => {
            showPage('task');
            window.displayRandomInstructionWithAddRemove(savedPending.addRemoveTask);
        };
    } else {
        // Completed normal task, ready for next roll
        // STATE: Ready for dice roll
        window.GAME_STATE.gamePhase = 'awaiting_dice_roll';
        window.GAME_STATE.pendingSnakeLadder = null;
        window.GAME_STATE.pendingAddRemoveTask = null;
        saveGameState();
        
        showPage('board');
        const rollDiceButton = document.getElementById('rollDice');
        rollDiceButton.textContent = '🎲 Roll Dice';
        rollDiceButton.disabled = false;
        rollDiceButton.onclick = null;
        rollDiceButton.onclick = rollDice;
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎲 Snakes and Ladders - Initializing...');
    
    // Initialize state FIRST
    initializeState();
    initializeGameFunctions(handleTaskCompletion);
    
    // Load saved game state
    const savedState = loadGameState();
    
    // PRE-SET SLIDER DISPLAYS BEFORE SHOWING PAGE (prevents flash)
    if (savedState) {
        // Prize sliders
        if (savedState.prizeSettings) {
            document.getElementById('fullPercent').textContent = savedState.prizeSettings.full.toFixed(1) + '%';
            document.getElementById('ruinPercent').textContent = savedState.prizeSettings.ruin.toFixed(1) + '%';
            document.getElementById('deniedPercent').textContent = savedState.prizeSettings.denied.toFixed(1) + '%';
            document.getElementById('fullSlider').value = savedState.prizeSettings.full;
            document.getElementById('ruinSlider').value = savedState.prizeSettings.ruin;
            document.getElementById('deniedSlider').value = savedState.prizeSettings.denied;
        }
        
        // Final challenge sliders
        if (savedState.finalChallengeSettings) {
            document.getElementById('strokingPercent').textContent = savedState.finalChallengeSettings.stroking + '%';
            document.getElementById('vibePercent').textContent = savedState.finalChallengeSettings.vibe + '%';
            document.getElementById('analPercent').textContent = savedState.finalChallengeSettings.anal + '%';
            document.getElementById('strokingSlider').value = savedState.finalChallengeSettings.stroking;
            document.getElementById('vibeSlider').value = savedState.finalChallengeSettings.vibe;
            document.getElementById('analSlider').value = savedState.finalChallengeSettings.anal;
        }
    }
    
    // Initialize board EARLY (before showing page)
    const initialBoardSize = savedState?.totalSquares || 100;
    boardRenderer = new BoardRenderer(initialBoardSize);
    boardRenderer.create();
    
    // PRE-SET UI elements BEFORE showing page to prevent flash
    if (savedState && savedState.gameStarted) {
        // Update turn counter and dice result immediately
        document.getElementById('turnCounter').textContent = `Turn: ${savedState.turnCount}`;
        document.getElementById('diceResult').textContent = savedState.diceResultText || 'Dice: -';
        
        // Update button text based on phase
        const rollDiceButton = document.getElementById('rollDice');
        const phase = savedState.gamePhase || 'awaiting_dice_roll';
        
        if (phase === 'awaiting_normal_task' || 
            phase === 'awaiting_snake_ladder_task' || 
            phase === 'awaiting_snake_ladder_movement') {
            rollDiceButton.textContent = '🚪 Enter';
        } else {
            rollDiceButton.textContent = '🎲 Roll Dice';
        }
        
        // PRE-POSITION the player piece (before showing page)
        if (savedState.playerPosition > 0) {
            setPlayerPosition(savedState.playerPosition);
        }
    }
    
    // Determine which page to show based on game phase
    let initialPage = 'home'; // Default
    if (savedState && savedState.gameStarted) {
        const phase = savedState.gamePhase || 'awaiting_dice_roll';
        
        if (savedState.currentInstruction && savedState.currentInstruction.trim() !== '') {
            // Currently showing a task
            initialPage = 'task';
        } else if (phase === 'awaiting_dice_roll' || 
                   phase === 'awaiting_normal_task' || 
                   phase === 'awaiting_snake_ladder_task' ||
                   phase === 'awaiting_snake_ladder_movement') {
            // On board, waiting for some action
            initialPage = 'board';
        } else {
            // Default to board if game started
            initialPage = 'board';
        }
    }
    
    console.log('📄 Initial page:', initialPage, '| Phase:', savedState?.gamePhase);
    
    // Show the correct page immediately (after UI is pre-set)
    showPage(initialPage);

    // Set initial body class for button positioning
    if (initialPage === 'home') {
        document.body.classList.add('on-home-page');
    } else {
        document.body.classList.remove('on-home-page');
    }
    
    // Initialize UI
    initializeUI();
    
    // Initialize classic radio state based on board size
    updateClassicRadioState(savedState?.totalSquares || 100);
    
    // Initialize custom snakes/ladders display if custom mode is selected
    if (savedState?.snakesLaddersMode === 'custom') {
        const customInputs = document.getElementById('customSnakesLaddersInputs');
        if (customInputs) {
            customInputs.style.display = 'block';
        }
    }
    
    // Load task registry
    console.log('📦 Loading task registry...');
    const registry = await loadTaskRegistry();
    if (registry) {
        taskRegistryLoaded = true;
        console.log('✅ Task registry loaded');
    } else {
        console.warn('⚠️ Failed to load task registry - using fallback tasks');
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Restore saved game if exists
    if (savedState) {
        restoreSavedGame(savedState);
    }
    
    console.log('✅ Game Initialized');
});

// Set up event listeners
function setupEventListeners() {
    // Start game button
    document.getElementById('startButton').addEventListener('click', startGame);
    
    // Board size input
    const boardSizeInput = document.getElementById('boardSizeSelect');
    
    // Prevent non-numeric input
    boardSizeInput.addEventListener('keypress', function(e) {
        // Only allow numbers
        if (!/[0-9]/.test(e.key)) {
            e.preventDefault();
        }
    });
    
    // Enforce min/max while typing or using arrow keys
    boardSizeInput.addEventListener('input', function(e) {
        let value = parseInt(this.value);
        
        // Allow empty during typing
        if (isNaN(value) || this.value === '') {
            return;
        }
        
        // Cap at maximum
        if (value > 1000) {
            this.value = 1000;
        }
        
        // Don't enforce minimum during typing (wait for blur)
        // This allows user to type "5" on their way to "50"
        
        // Update classic radio state immediately based on input value
        updateClassicRadioState(parseInt(this.value) || 100);
    });
    
    // Validate and round on blur (when user clicks away)
    boardSizeInput.addEventListener('blur', function() {
        validateBoardSize(this);
    });
    
    // Validate and round on Enter key
    boardSizeInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            validateBoardSize(this);
            this.blur(); // Remove focus
        }
    });
    
    // Player name input
    document.getElementById('playerNameInput').addEventListener('input', function() {
        window.GAME_STATE.playerName = this.value;
        saveGameState();
    });
    
    // Snakes and Ladders mode radio buttons
    document.querySelectorAll('input[name="snakesLaddersMode"]').forEach(radio => {
        radio.addEventListener('change', function() {
            // If Classic is selected and board size is not 100, change it to 100
            if (this.value === 'classic') {
                const boardSizeInput = document.getElementById('boardSizeSelect');
                if (boardSizeInput && parseInt(boardSizeInput.value) !== 100) {
                    boardSizeInput.value = 100;
                    validateBoardSize(boardSizeInput);
                }
            }
            handleSnakesLaddersModeChange(this.value);
        });
    });
    
    // Snakes and Ladders difficulty dropdown
    document.getElementById('snakesLaddersDifficulty').addEventListener('change', function() {
        window.GAME_STATE.snakesLaddersDifficulty = this.value;
        saveGameState();
    });
    
    // Custom snakes and ladders inputs
    document.getElementById('customSnakesInput').addEventListener('input', function() {
        window.GAME_STATE.customSnakes = parseCustomSnakesLadders(this.value);
        saveGameState();
    });
    
    document.getElementById('customLaddersInput').addEventListener('input', function() {
        window.GAME_STATE.customLadders = parseCustomSnakesLadders(this.value);
        saveGameState();
    });
    
    // Generate custom button
    document.getElementById('generateCustomBtn').addEventListener('click', () => {
        window.generateAndPopulateCustom();
    });
    
    // Reset button - check which page we're on
    document.getElementById('resetBtn').addEventListener('click', () => {
        const isOnHomePage = document.body.classList.contains('on-home-page');
        if (isOnHomePage) {
            // On home page - show reset settings modal
            document.getElementById('resetSettingsModal').classList.add('active');
        } else {
            // On board/task page - show reset game modal
            document.getElementById('resetModal').classList.add('active');
        }
    });
    
    // Patch notes button
    document.getElementById('patchNotesBtn').addEventListener('click', () => {
        document.getElementById('patchNotesModal').classList.add('active');
    });
    
    // Modal close buttons
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.remove('active');
        });
    });
    
    // Reset game modal buttons
    document.getElementById('confirmReset').addEventListener('click', resetGame);
    document.getElementById('cancelReset').addEventListener('click', () => {
        document.getElementById('resetModal').classList.remove('active');
    });
    
    // Reset settings modal buttons
    document.getElementById('confirmResetSettings').addEventListener('click', () => {
        resetSettings();
        document.getElementById('resetSettingsModal').classList.remove('active');
    });
    document.getElementById('cancelResetSettings').addEventListener('click', () => {
        document.getElementById('resetSettingsModal').classList.remove('active');
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
    
    // Window resize - rescale board
    window.addEventListener('resize', () => {
        if (boardRenderer) {
            boardRenderer.scale();
        }
    });
}

// Start game
function startGame() {
    // Validate instruction sets
    const selectedSets = window.GAME_STATE.selectedSets;
    if (selectedSets.length === 0) {
        alert('⚠️ Please select at least one instruction set before starting!');
        return;
    }
    
    // Validate toys
    const hasToys = Object.values(window.GAME_STATE.toyQuantities).some(qty => qty > 0);
    const hasCheckedToys = Object.values(window.GAME_STATE.toyChecked).some(checked => checked);
    
    if (!hasToys || !hasCheckedToys) {
        alert('⚠️ Please select at least one toy before starting!');
        return;
    }
    
    // Validate player name
    const playerName = document.getElementById('playerNameInput').value.trim();
    if (!playerName) {
        alert('⚠️ Please enter your name before starting!');
        return;
    }
    
    // Validate task registry
    if (!taskRegistryLoaded) {
        alert('⚠️ Task system is still loading. Please wait a moment and try again.');
        return;
    }
    
    // Get board size - validate it first
    const boardSizeInput = document.getElementById('boardSizeSelect');
    validateBoardSize(boardSizeInput);
    const boardSize = parseInt(boardSizeInput.value);
    
    // Set player name and board size
    window.GAME_STATE.playerName = playerName;
    window.GAME_STATE.totalSquares = boardSize;
    boardRenderer.updateSize(boardSize);
    
    // Generate or apply snakes and ladders based on mode
    const mode = window.GAME_STATE.snakesLaddersMode;
    
    if (mode === 'classic') {
        // Use classic snakes and ladders (only for 100-square board)
        window.BOARD_SNAKES = {16:6, 47:26, 49:11, 56:53, 62:19, 64:60, 87:24, 93:73, 95:75, 98:78};
        window.BOARD_LADDERS = {1:38, 4:14, 9:31, 21:42, 28:84, 36:44, 51:67, 71:91, 80:99};
    } else if (mode === 'random') {
        // Generate random snakes and ladders with selected difficulty
        const difficulty = window.GAME_STATE.snakesLaddersDifficulty || 'medium';
        const generated = generateRandomSnakesAndLadders(boardSize, difficulty);
        window.BOARD_SNAKES = generated.snakes;
        window.BOARD_LADDERS = generated.ladders;
        console.log(`Generated random snakes/ladders (${difficulty}):`, window.BOARD_SNAKES, window.BOARD_LADDERS);
    } else if (mode === 'custom') {
        // Use custom snakes and ladders
        window.BOARD_SNAKES = { ...window.GAME_STATE.customSnakes };
        window.BOARD_LADDERS = { ...window.GAME_STATE.customLadders };
        
        // Validate custom configuration
        const errors = validateCustomSnakesLadders(
            window.BOARD_SNAKES, 
            window.BOARD_LADDERS, 
            boardSize
        );
        
        if (errors.length > 0) {
            alert('⚠️ Custom snakes/ladders have errors:\n\n' + errors.join('\n'));
            // Don't start the game or set gameStarted flag
            return;
        }
        
        console.log('Using custom snakes:', window.BOARD_SNAKES);
        console.log('Using custom ladders:', window.BOARD_LADDERS);
    }
    
    // Only set gameStarted AFTER all validation passes
    window.GAME_STATE.gameStarted = true;
    window.GAME_STATE.gamePhase = 'awaiting_dice_roll';
    
    // Update board renderer with new snakes/ladders
    boardRenderer.snakes = window.BOARD_SNAKES;
    boardRenderer.ladders = window.BOARD_LADDERS;
    
    // Handle cage "start worn" option
    if (window.GAME_STATE.cageWorn && window.GAME_STATE.toyChecked['cage']) {
        window.addToyToBodyPart('Pe', 'cage');
    }
    
    // Create board with selected size
    boardRenderer.create();
    
    // Show board page
    showPage('board');
    
    // Reset turn counter
    window.GAME_STATE.turnCount = 0;
    document.getElementById('turnCounter').textContent = 'Turn: 0';
    document.getElementById('diceResult').textContent = 'Dice: -';
    window.GAME_STATE.diceResultText = 'Dice: -';
    
    // ✅ FIX: Reset roll dice button to initial state
    const rollDiceButton = document.getElementById('rollDice');
    rollDiceButton.textContent = '🎲 Roll Dice';
    rollDiceButton.disabled = false;
    rollDiceButton.onclick = null;
    rollDiceButton.onclick = rollDice;
    
    // Save state
    saveGameState();
    
    console.log('🎮 Game Started!');
}

// Restore saved game
function restoreSavedGame(state) {
    console.log('💾 Restoring saved game...', state);
    console.log('📍 Game phase:', state.gamePhase);
    
    // Restore UI state
    restoreUIState(state);
    
    // If game was in progress, restore board
    if (state.gameStarted) {
        // Note: Board already created and player already positioned in DOMContentLoaded
        
        const rollDiceButton = document.getElementById('rollDice');
        const phase = state.gamePhase || 'awaiting_dice_roll';
        
        // Restore based on game phase
        if (state.currentInstruction && state.currentInstruction.trim() !== '') {
            // Was viewing a task - restore it
            const instructions = document.getElementById('instructions');
            instructions.innerHTML = state.currentInstruction;
            instructions.classList.add('active');
            
            // Re-attach the continue button event handler
            const continueButton = instructions.querySelector('#continueButton');
            if (continueButton) {
                continueButton.onclick = () => {
                    if (window.GAME_FUNCTIONS && window.GAME_FUNCTIONS.completeTask) {
                        window.GAME_FUNCTIONS.completeTask();
                    }
                };
            }
        } else if (phase === 'awaiting_snake_ladder_task') {
            // Waiting to show snake/ladder task
            // Button text already set to Enter
            rollDiceButton.disabled = false;
            
            // Highlight destination
            if (state.pendingSnakeLadder) {
                const destSquare = document.getElementById(`square-${state.pendingSnakeLadder.to}`);
                if (destSquare) {
                    destSquare.classList.add(
                        state.pendingSnakeLadder.type === 'snake' ? 'snake-destination' : 'ladder-destination'
                    );
                }
                
                rollDiceButton.onclick = () => {
                    // Don't remove highlight yet - keep it until we move
                    showPage('task');
                    window.displaySnakeLadderTask(
                        state.pendingSnakeLadder.type,
                        state.pendingSnakeLadder.from,
                        state.pendingSnakeLadder.to
                    );
                };
            }
        } else if (phase === 'awaiting_normal_task') {
            // Waiting to show normal task
            // Button text already set to Enter
            rollDiceButton.disabled = false;
            rollDiceButton.onclick = () => {
                showPage('task');
                window.displayRandomInstructionWithAddRemove(state.pendingAddRemoveTask);
            };
        } else {
            // awaiting_dice_roll or default
            // Button text already set to Roll Dice
            rollDiceButton.disabled = false;
            rollDiceButton.onclick = rollDice;
        }
        
        console.log('✅ Game restored');
    }
}

// Reset game (only resets game progress, keeps settings)
function resetGame() {
    console.log('🔄 Resetting game...');
    
    // Only reset game progress state, not settings
    window.GAME_STATE.gameStarted = false;
    window.GAME_STATE.playerPosition = 0;
    window.GAME_STATE.turnCount = 0;
    window.GAME_STATE.turnCountBySet = {};
    window.GAME_STATE.turnCountByToy = {};
    window.GAME_STATE.lastSelectedSet = {};
    window.GAME_STATE.completedOnlyOnceTasks = {};
    window.GAME_STATE.forceNextTask = null;
    window.GAME_STATE.scheduledTasks = [];
    window.GAME_STATE.disabledTasks = new Set();
    window.GAME_STATE.taskWeights = {};
    window.GAME_STATE.customFlags = {};
    window.GAME_STATE.currentInstruction = '';
    window.GAME_STATE.diceResultText = 'Dice: -';
    window.GAME_STATE.pendingSnakeLadder = null;
    window.GAME_STATE.gamePhase = 'awaiting_dice_roll';
    
    // Reset body part state
    window.GAME_STATE.bodyPartState = {
        Mo: { name: "Mo", items: [] },
        Ba: { name: "Ba", items: [] },
        Bu: { name: "Bu", items: [] },
        As: { name: "As", items: [] },
        Ni: { name: "Ni", items: [] },
        Ha: { name: "Ha", items: [] },
        Bo: { name: "Bo", items: [] },
        Pe: { name: "Pe", items: [] }
    };
    
    // Reset player state
    resetPlayerState();
    
    // Reset UI elements (but keep settings)
    document.getElementById('turnCounter').textContent = 'Turn: 0';
    document.getElementById('diceResult').textContent = 'Dice: -';
    document.getElementById('testJumpInput').value = '';
    
    // Reset roll dice button
    const rollDiceButton = document.getElementById('rollDice');
    rollDiceButton.textContent = '🎲 Roll Dice';
    rollDiceButton.disabled = false;
    rollDiceButton.onclick = null;
    rollDiceButton.onclick = rollDice;
    
    // Clear instructions
    const instructions = document.getElementById('instructions');
    instructions.classList.remove('active');
    instructions.innerHTML = '';
    
    // Save state
    saveGameState();
    
    // Close modal
    document.getElementById('resetModal').classList.remove('active');
    
    // Show home page
    showPage('home');
    
    console.log('✅ Game reset complete');
}

// Reset settings (resets all settings to defaults)
function resetSettings() {
    console.log('🔄 Resetting settings...');
    
    // Clear localStorage completely
    resetGameState();
    resetPlayerState();
    
    // Reset ALL UI elements to defaults
    document.getElementById('playerNameInput').value = '';
    document.getElementById('boardSizeSelect').value = '100';
    
    // Reset instruction set checkboxes
    document.querySelectorAll('#instructionSetCheckboxes input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
    
    // Reset prize sliders to defaults
    window.GAME_STATE.prizeSettings = { full: 33, ruin: 33, denied: 34 };
    
    // Reset final challenge sliders to defaults
    window.GAME_STATE.finalChallengeSettings = { stroking: 33, vibe: 33, anal: 34 };
    
    // Reset final challenge types
    window.GAME_STATE.finalChallengeTypes = {
        stroking_icyhot: false,
        stroking_icewater: false,
        stroking_ktb: false,
        stroking_ballsqueeze: false,
        stroking_2finger: false,
        vibe_icyhot: false,
        vibe_icewater: false,
        anal_vibe: false
    };
    
    // Reset final challenge difficulties
    window.GAME_STATE.finalChallengeDifficulties = {
        stroking: 'medium',
        vibe: 'medium',
        anal: 'medium'
    };
    
    // Reset final challenge modifier chances
    window.GAME_STATE.finalChallengeModifierChances = {
        stroking_icyhot: 10,
        stroking_icewater: 10,
        stroking_ktb: 10,
        stroking_ballsqueeze: 10,
        stroking_2finger: 10,
        vibe_icyhot: 10,
        vibe_icewater: 10,
        anal_vibe: 10,
        ce: 10,
        pf: 10
    };
    
    // Reset final challenge modifiers (CE, PF)
    window.GAME_STATE.finalChallengeModifiers = {
        ce: false,
        pf: false
    };
    
    // Reset snakes/ladders mode and difficulty
    const classicRadio = document.querySelector('input[name="snakesLaddersMode"][value="classic"]');
    if (classicRadio) classicRadio.checked = true;
    handleSnakesLaddersModeChange('classic');
    
    const difficultyDropdown = document.getElementById('snakesLaddersDifficulty');
    if (difficultyDropdown) difficultyDropdown.value = 'medium';
    window.GAME_STATE.snakesLaddersDifficulty = 'medium';
    
    // Reset all final challenge checkboxes
    ['stroking_icyhot', 'stroking_icewater', 'stroking_ktb', 'stroking_ballsqueeze', 'stroking_2finger',
     'vibe_icyhot', 'vibe_icewater', 'anal_vibe'].forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) checkbox.checked = false;
    });
    
    // Reset modifier checkboxes (CE, PF)
    ['ce', 'pf'].forEach(mod => {
        const checkbox = document.getElementById(`modifier_${mod}`);
        if (checkbox) checkbox.checked = false;
    });
    
    // Reset all modifier chance inputs
    ['stroking_icyhot', 'stroking_icewater', 'stroking_ktb', 'stroking_ballsqueeze', 'stroking_2finger',
     'vibe_icyhot', 'vibe_icewater', 'anal_vibe', 'ce', 'pf'].forEach(id => {
        const input = document.getElementById(`${id}_chance`);
        if (input) input.value = 10;
    });
    
    // Reset final challenge difficulty dropdowns
    ['stroking', 'vibe', 'anal'].forEach(type => {
        const dropdown = document.getElementById(`${type}Difficulty`);
        if (dropdown) dropdown.value = 'medium';
    });
    
    // Update prize slider displays
    document.getElementById('fullPercent').textContent = '33%';
    document.getElementById('ruinPercent').textContent = '33%';
    document.getElementById('deniedPercent').textContent = '34%';
    document.getElementById('fullSlider').value = 33;
    document.getElementById('ruinSlider').value = 33;
    document.getElementById('deniedSlider').value = 34;
    
    // Update final challenge slider displays
    document.getElementById('strokingPercent').textContent = '33%';
    document.getElementById('vibePercent').textContent = '33%';
    document.getElementById('analPercent').textContent = '34%';
    document.getElementById('strokingSlider').value = 33;
    document.getElementById('vibeSlider').value = 33;
    document.getElementById('analSlider').value = 34;
    
    // Re-initialize UI completely
    initializeUI();
    
    console.log('✅ Settings reset complete');
}

// Expose showPage globally for other modules
window.showPage = showPage;

// Expose snakes/ladders functions globally
window.handleSnakesLaddersModeChange = handleSnakesLaddersModeChange;
window.formatSnakesLaddersForDisplay = formatSnakesLaddersForDisplay;

// Expose task display functions globally for compatibility
window.displayRandomInstruction = async () => {
    const task = window.selectNextTask();
    if (task) {
        await loadAndDisplayTask(task);
    }
};

window.displayRandomInstructionWithAddRemove = async (addRemoveTask) => {
    const task = window.selectNextTask();
    if (task) {
        await loadAndDisplayTask(task, addRemoveTask);
    }
};

window.displaySnakeLadderTask = loadAndDisplaySnakeLadderTask;
window.displayFinalChallenge = loadAndDisplayFinalChallenge;
