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
import { ScaleManager   } from './board/scaleManager.js'; 
import { 
    rollDice, 
    onTaskComplete, 
    setPlayerPosition,
    resetPlayerState,
    animatePlayer,
    scrollToPlayer,
    scrollToBottom,
    waitForBoard
} from './board/playerMovement.js';

// Task system
import { loadTaskRegistry } from './tasks/taskSelector.js';
import './tasks/addRemoveTasks.js';
import { 
    loadAndDisplayTask,
    loadAndDisplaySnakeLadderTask,
    loadAndDisplayFinalChallenge,
    restoreVNState
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
let scaleManager;
let taskRegistryLoaded = false;

// ── Page transition helpers ──────────────────────────────────────────────────
//
// The fundamental problem: .page elements use display:none / display:block.
// CSS opacity/transform transitions require the element to already be visible.
//
// Solution — "frozen overlay" technique:
//   1. Take a screenshot of the current page via html2canvas — OR, simpler:
//      capture its bounding box colour and create a fixed overlay div that
//      matches the viewport. The overlay itself fades out while the new page
//      plays its entrance animation underneath.
//   2. Switch the real pages instantly (display:none → display:block).
//   3. Remove the overlay after its fade-out animation ends.
//
// This means ZERO delay on the incoming page — transitions feel instant and
// smooth simultaneously.

// 'slide' triggers the board slide-in-from-bottom (set just before startGame calls showPage)
let _nextBoardAnim = null;

function showPage(pageName) {
    console.log('🔄 Switching to page:', pageName);

    const targetPageEl = document.getElementById(pageName + 'Page');
    if (!targetPageEl) {
        console.error('❌ Page not found:', pageName + 'Page');
        return;
    }

    const outgoing = document.querySelector('.page.active');
    const hasOutgoing = outgoing && outgoing !== targetPageEl;

    // ── 1. Hide instructions when leaving the task page ───────────────────
    const instructions = document.getElementById('instructions');
    if (instructions && pageName !== 'task') {
        instructions.classList.remove('active');
        console.log('🧹 Instructions hidden');
    }

    // ── 2. Show target page (outgoing stays visible in normal flow) ───────
    // Remove any leftover animation classes from a previous transition
    targetPageEl.classList.remove('page-entering-fade', 'page-entering-slide');
    targetPageEl.classList.add('active');

    // ── 3. Play entrance animation — new page overlays old one ───────────
    if (hasOutgoing) {
        const animClass = (pageName === 'board' && _nextBoardAnim === 'slide')
            ? 'page-entering-slide'
            : 'page-entering-fade';

        _nextBoardAnim = null;

        // Force reflow so browser registers the class addition as a new animation
        void targetPageEl.offsetWidth;

        targetPageEl.classList.add(animClass);

        // After animation: remove class + fixed positioning, hide outgoing page
        targetPageEl.addEventListener('animationend', () => {
            targetPageEl.classList.remove('page-entering-fade', 'page-entering-slide');
            // Now safe to hide the old page (it was hidden behind the animation)
            if (outgoing && outgoing !== targetPageEl) {
                outgoing.classList.remove('active');
            }
        }, { once: true });
    }

    // ── 4. Update body classes and button labels ──────────────────────────
    // Title is now inside pages, so we don't need to manipulate it
    
    const resetBtn = document.getElementById('resetBtn');
    if (pageName === 'home') {
        document.body.classList.add('on-home-page');
        document.body.classList.remove('show-fixed-buttons');
        if (resetBtn) resetBtn.textContent = '🔄 Reset Settings';
    } else {
        document.body.classList.remove('on-home-page');
        document.body.classList.add('show-fixed-buttons');
        if (resetBtn) resetBtn.textContent = '🔄 Reset';
    }

    console.log('✅ Now showing:', pageName);
}


// Update classic radio button state based on board size
function updateClassicRadioState(boardSize) {
    const classicRadio = document.querySelector('input[name="snakesLaddersMode"][value="classic"]');
    if (!classicRadio) return;
    
    classicRadio.disabled = false;
    
    const label = classicRadio.parentElement;
    if (label) {
        label.style.opacity = '1';
        label.style.cursor = 'pointer';
    }
    
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
    
    if (isNaN(value) || input.value === '') {
        input.value = 100;
        value = 100;
    }
    
    if (value < 10) value = 10;
    if (value > 1000) value = 1000;
    
    value = Math.round(value / 10) * 10;
    
    if (value < 10) value = 10;
    if (value > 1000) value = 1000;
    
    input.value = value;
    window.GAME_STATE.totalSquares = value;
    updateClassicRadioState(value);
    
    if (boardRenderer && window.GAME_STATE.gameStarted) {
        boardRenderer.updateSize(value);
        scaleManager.init();
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
        customInputs.style.display = 'block';
        
        if (Object.keys(window.GAME_STATE.customSnakes).length > 0) {
            customSnakesInput.value = formatSnakesLaddersForDisplay(window.GAME_STATE.customSnakes);
        }
        if (Object.keys(window.GAME_STATE.customLadders).length > 0) {
            customLaddersInput.value = formatSnakesLaddersForDisplay(window.GAME_STATE.customLadders);
        }
    } else {
        customInputs.style.display = 'none';
    }
    
    saveGameState();
}

// Custom task completion handler
function handleTaskCompletion() {
    window.GAME_STATE.currentInstruction = '';
    
    if (window.GAME_STATE.gamePhase === 'awaiting_snake_ladder_task') {
        const savedPending = window.GAME_STATE.pendingSnakeLadder;
        
        setPlayerPosition(savedPending.to);
        window.GAME_STATE.playerPosition = savedPending.to;
        
        const totalSquares = window.GAME_STATE.totalSquares || 100;
        
        if (savedPending.to === totalSquares) {
            window.GAME_STATE.gamePhase = 'awaiting_final_challenge';
            window.GAME_STATE.pendingSnakeLadder = null;
            saveGameState();
            
            showPage('task');
            window.displayFinalChallenge();
            return;
        }
        
        window.GAME_STATE.gamePhase = 'awaiting_normal_task';
        window.GAME_STATE.pendingSnakeLadder = null;
        saveGameState();
        
        showPage('board');
        
         const SLIDE_MS = 1050; // slightly longer than animation (0.55s)
         setTimeout(() => {
             waitForBoard(() => {
                 scrollToBottom();
             });
         }, SLIDE_MS);
        
        const rollDiceButton = document.getElementById('rollDice');
        rollDiceButton.textContent = '🚪 Enter';
        rollDiceButton.disabled = false;
        rollDiceButton.onclick = null;
        
        rollDiceButton.onclick = () => {
            showPage('task');
            window.displayRandomInstructionWithAddRemove(savedPending.addRemoveTask);
        };
    } else {
        window.GAME_STATE.gamePhase = 'awaiting_dice_roll';
        window.GAME_STATE.pendingSnakeLadder = null;
        window.GAME_STATE.pendingAddRemoveTask = null;
        saveGameState();
        
        showPage('board');
        
        waitForBoard(() => {
            scrollToPlayer(window.GAME_STATE.playerPosition, true);
        });
        
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
    
    initializeState();
    initializeGameFunctions(handleTaskCompletion);
    
    const savedState = loadGameState();
    
    // PRE-SET SLIDER DISPLAYS BEFORE SHOWING PAGE (prevents flash)
    if (savedState) {
        if (savedState.prizeSettings) {
            document.getElementById('fullPercent').textContent = savedState.prizeSettings.full.toFixed(1) + '%';
            document.getElementById('ruinPercent').textContent = savedState.prizeSettings.ruin.toFixed(1) + '%';
            document.getElementById('deniedPercent').textContent = savedState.prizeSettings.denied.toFixed(1) + '%';
            document.getElementById('fullSlider').value = savedState.prizeSettings.full;
            document.getElementById('ruinSlider').value = savedState.prizeSettings.ruin;
            document.getElementById('deniedSlider').value = savedState.prizeSettings.denied;
        }
        
        if (savedState.finalChallengeSettings) {
            document.getElementById('strokingPercent').textContent = savedState.finalChallengeSettings.stroking + '%';
            document.getElementById('vibePercent').textContent = savedState.finalChallengeSettings.vibe + '%';
            document.getElementById('analPercent').textContent = savedState.finalChallengeSettings.anal + '%';
            document.getElementById('strokingSlider').value = savedState.finalChallengeSettings.stroking;
            document.getElementById('vibeSlider').value = savedState.finalChallengeSettings.vibe;
            document.getElementById('analSlider').value = savedState.finalChallengeSettings.anal;
        }
        
        if (savedState.challengeTypesExpanded) {
            const toggleBtn = document.getElementById('toggleChallengeTypes');
            const container = document.getElementById('challengeTypesContainer');
            if (toggleBtn && container) {
                container.style.display = 'block';
                toggleBtn.innerHTML = '▼ Hide Challenge Types & Difficulty';
            }
        }
    }
    
    const initialBoardSize = savedState?.totalSquares || 100;
    boardRenderer = new BoardRenderer(initialBoardSize);
    scaleManager  = new ScaleManager(boardRenderer);
    
    if (savedState && savedState.boardSnakes && savedState.boardLadders) {
        window.BOARD_SNAKES = savedState.boardSnakes;
        window.BOARD_LADDERS = savedState.boardLadders;
        boardRenderer.snakes = savedState.boardSnakes;
        boardRenderer.ladders = savedState.boardLadders;
        console.log('✅ Restored snakes/ladders from saved state');
    }
    
    scaleManager.init();
    
    if (savedState && savedState.gameStarted) {
        document.getElementById('turnCounter').textContent = `Turn: ${savedState.turnCount}`;
        document.getElementById('diceResult').textContent = savedState.diceResultText || 'Dice: -';
        
        const rollDiceButton = document.getElementById('rollDice');
        const phase = savedState.gamePhase || 'awaiting_dice_roll';
        
        if (phase === 'awaiting_normal_task' || 
            phase === 'awaiting_snake_ladder_task' || 
            phase === 'awaiting_snake_ladder_movement') {
            rollDiceButton.textContent = '🚪 Enter';
        } else {
            rollDiceButton.textContent = '🎲 Roll Dice';
        }
        
        if (savedState.playerPosition > 0) {
            setPlayerPosition(savedState.playerPosition);
        }
    }
    
    // Determine which page to show based on game phase
    let initialPage = 'home';
    if (savedState && savedState.gameStarted) {
        const phase = savedState.gamePhase || 'awaiting_dice_roll';
        
        if (savedState.currentInstruction && savedState.currentInstruction.trim() !== '') {
            initialPage = 'task';
        } else if (phase === 'awaiting_dice_roll' || 
                   phase === 'awaiting_normal_task' || 
                   phase === 'awaiting_snake_ladder_task' ||
                   phase === 'awaiting_snake_ladder_movement') {
            initialPage = 'board';
        } else {
            initialPage = 'board';
        }
    }
    
    console.log('📄 Initial page:', initialPage, '| Phase:', savedState?.gamePhase);
    
    // Show initial page WITHOUT animation (hard refresh / first load)
    // Call showPage but suppress the entrance animation by ensuring
    // there's no outgoing page (all pages are already hidden via CSS default)
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const initialPageEl = document.getElementById(initialPage + 'Page');
    if (initialPageEl) initialPageEl.classList.add('active');

    // Apply the same side-effects showPage normally handles
    const mainTitle = document.querySelector('h1');
    if (mainTitle) {
        mainTitle.style.display = (initialPage === 'task' || initialPage === 'board') ? 'none' : 'block';
    }
    const resetBtnInit = document.getElementById('resetBtn');
    if (initialPage === 'home') {
        document.body.classList.add('on-home-page');
        document.body.classList.remove('show-fixed-buttons');
        if (resetBtnInit) resetBtnInit.textContent = '🔄 Reset Settings';
    } else {
        document.body.classList.remove('on-home-page');
        document.body.classList.add('show-fixed-buttons');
        if (resetBtnInit) resetBtnInit.textContent = '🔄 Reset';
    }

    initializeUI();
    updateClassicRadioState(savedState?.totalSquares || 100);
    
    if (savedState?.snakesLaddersMode === 'custom') {
        const customInputs = document.getElementById('customSnakesLaddersInputs');
        if (customInputs) customInputs.style.display = 'block';
    }
    
    console.log('📦 Loading task registry...');
    const registry = await loadTaskRegistry();
    if (registry) {
        taskRegistryLoaded = true;
        console.log('✅ Task registry loaded');
    } else {
        console.warn('⚠️ Failed to load task registry - using fallback tasks');
    }
    
    setupEventListeners();
    
    if (savedState) {
        restoreSavedGame(savedState);
    }
    
    if (initialPage === 'board') {
        waitForBoard(() => {
            if (savedState && savedState.playerPosition > 0) {
                scrollToPlayer(savedState.playerPosition, true);
            } else {
                scrollToBottom();
            }
        });
    }
    
    console.log('✅ Game Initialized');
});

// Set up event listeners
function setupEventListeners() {
    document.getElementById('startButton').addEventListener('click', startGame);
    
    const boardSizeInput = document.getElementById('boardSizeSelect');
    
    boardSizeInput.addEventListener('keypress', function(e) {
        if (!/[0-9]/.test(e.key)) e.preventDefault();
    });
    
    boardSizeInput.addEventListener('input', function(e) {
        let value = parseInt(this.value);
        if (isNaN(value) || this.value === '') return;
        if (value > 1000) this.value = 1000;
        updateClassicRadioState(parseInt(this.value) || 100);
    });
    
    boardSizeInput.addEventListener('blur', function() {
        validateBoardSize(this);
    });
    
    boardSizeInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            validateBoardSize(this);
            this.blur();
        }
    });
    
    document.getElementById('playerNameInput').addEventListener('input', function() {
        window.GAME_STATE.playerName = this.value;
        saveGameState();
    });
    
    document.querySelectorAll('input[name="snakesLaddersMode"]').forEach(radio => {
        radio.addEventListener('change', function() {
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
    
    document.getElementById('snakesLaddersDifficulty').addEventListener('change', function() {
        window.GAME_STATE.snakesLaddersDifficulty = this.value;
        saveGameState();
    });
    
    document.getElementById('customSnakesInput').addEventListener('input', function() {
        window.GAME_STATE.customSnakes = parseCustomSnakesLadders(this.value);
        saveGameState();
    });
    
    document.getElementById('customLaddersInput').addEventListener('input', function() {
        window.GAME_STATE.customLadders = parseCustomSnakesLadders(this.value);
        saveGameState();
    });
    
    document.getElementById('generateCustomBtn').addEventListener('click', () => {
        window.generateAndPopulateCustom();
    });
    
    document.getElementById('resetBtn').addEventListener('click', () => {
        const isOnHomePage = document.body.classList.contains('on-home-page');
        if (isOnHomePage) {
            document.getElementById('resetSettingsModal').classList.add('active');
        } else {
            document.getElementById('resetModal').classList.add('active');
        }
    });
    
    document.getElementById('patchNotesBtn').addEventListener('click', () => {
        document.getElementById('patchNotesModal').classList.add('active');
    });
    
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.remove('active');
        });
    });
    
    document.getElementById('confirmReset').addEventListener('click', resetGame);
    document.getElementById('cancelReset').addEventListener('click', () => {
        document.getElementById('resetModal').classList.remove('active');
    });
    
    document.getElementById('confirmResetSettings').addEventListener('click', () => {
        resetSettings();
        document.getElementById('resetSettingsModal').classList.remove('active');
    });
    document.getElementById('cancelResetSettings').addEventListener('click', () => {
        document.getElementById('resetSettingsModal').classList.remove('active');
    });
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
}

// ── Paste this function into main.js BEFORE the startGame() function ──────
// Then call logGameStateOnStart() at the END of startGame(), just before
// the console.log('🎮 Game Started!') line.

function logGameStateOnStart() {
    const gs = window.GAME_STATE;
    const conditions = window.getConditions ? window.getConditions() : null;

    console.group('%c🎲 GAME STARTED — Full State Dump', 'font-size:16px;font-weight:bold;color:#667eea');

    // ── Player ──────────────────────────────────────────────────────────────
    console.group('%c👤 Player', 'font-weight:bold;color:#51cf66');
    console.log('Name:', gs.playerName);
    console.log('Pronouns:', gs.playerPronouns);
    console.log('Body type flags:', gs.bodyType);
    if (window.getPlayerBodyParts) {
        const playerParts = [...window.getPlayerBodyParts()];
        console.log('Available body parts (player has):', playerParts);
    }
    console.groupEnd();

    // ── Board ────────────────────────────────────────────────────────────────
    console.group('%c🎯 Board', 'font-weight:bold;color:#4facfe');
    console.log('Total squares:', gs.totalSquares);
    console.log('Snakes/Ladders mode:', gs.snakesLaddersMode);
    console.log('Snakes/Ladders difficulty:', gs.snakesLaddersDifficulty);
    console.log('Snakes:', window.BOARD_SNAKES);
    console.log('Ladders:', window.BOARD_LADDERS);
    console.groupEnd();

    // ── Selected Sets ────────────────────────────────────────────────────────
    console.group('%c🎮 Selected Instruction Sets', 'font-weight:bold;color:#f59f0b');
    console.log('Sets:', gs.selectedSets);
    console.groupEnd();

    // ── Toys ─────────────────────────────────────────────────────────────────
    console.group('%c🧸 Toys', 'font-weight:bold;color:#ff6b6b');

    const toyChecked   = gs.toyChecked    || {};
    const toySetEnable = gs.toySetEnabled || {};
    const toyQty       = gs.toyQuantities  || {};
    const toyDiff      = gs.toyDifficulties || {};
    const toyMod       = gs.toyModifiers    || {};

    // Build a combined view grouped by toyId
    const toyRows = {};
    for (const [key, qty] of Object.entries(toyQty)) {
        const idx = key.indexOf('_');
        const setId = key.substring(0, idx);
        const toyId = key.substring(idx + 1);
        if (!toyRows[toyId]) toyRows[toyId] = [];
        toyRows[toyId].push({
            toyKey: key,
            setId,
            qty,
            checked: toyChecked[toyId] !== false,
            setEnabled: toySetEnable[key] !== false,
            difficulty: toyDiff[key] || 'medium',
            addChance: toyMod[key]?.addChance ?? '—',
            removeChance: toyMod[key]?.removeChance ?? '—',
        });
    }

    for (const [toyId, rows] of Object.entries(toyRows)) {
        const isChecked = toyChecked[toyId] !== false;
        console.group(`%c${isChecked ? '✅' : '❌'} ${toyId}`, 'font-weight:bold');
        rows.forEach(r => {
            const active = r.checked && r.setEnabled;
            console.log(
                `%c${active ? '▶' : '▷'} [${r.setId}]  qty:${r.qty}  diff:${r.difficulty}  add:${r.addChance}%  remove:${r.removeChance}%  setEnabled:${r.setEnabled}`,
                active ? 'color:#333' : 'color:#aaa'
            );
        });
        console.groupEnd();
    }

    console.log('Cage worn at start:', gs.cageWorn);
    console.log('Cage locked:', gs.cageLocked);
    console.groupEnd();

    // ── Body Part State ────────────────────────────────────────────────────
    console.group('%c🦴 Body Part State (initial)', 'font-weight:bold;color:#a78bfa');
    const bodyParts = gs.bodyPartState || {};
    for (const [key, part] of Object.entries(bodyParts)) {
        const items = part.items || [];
        const playerHas = window.playerHasBodyPart ? window.playerHasBodyPart(key) : '?';
        console.log(
            `${playerHas ? '✅' : '🚫'} ${key.padEnd(4)}:`,
            items.length > 0 ? items : '(empty)'
        );
    }
    console.groupEnd();

    // ── Free Body Parts ────────────────────────────────────────────────────
    console.group('%c🆓 Free Body Parts (empty + player has)', 'font-weight:bold;color:#51cf66');
    if (conditions && window.getPlayerBodyParts) {
        const allParts = ['Mo', 'Ba', 'Bu', 'As', 'Ni', 'Ha', 'Bo', 'Pe', 'Pu', 'Br'];
        const playerParts = [...window.getPlayerBodyParts()];
        const freeParts = allParts.filter(bp => playerParts.includes(bp) && conditions.bodyPartEmpty(bp));
        console.log('Free parts:', freeParts);
    } else {
        console.log('(conditions not available)');
    }
    console.groupEnd();

    // ── Prize & Challenge Settings ────────────────────────────────────────
    console.group('%c🏆 Prize & Final Challenge Settings', 'font-weight:bold;color:#ffd93d');
    console.log('Prize probabilities:', gs.prizeSettings);
    console.log('Final challenge weights:', gs.finalChallengeSettings);
    console.log('Challenge types enabled:', gs.finalChallengeTypes);
    console.log('Challenge difficulties:', gs.finalChallengeDifficulties);
    console.log('Modifiers (CE/PF):', gs.finalChallengeModifiers);
    console.log('Modifier chances:', gs.finalChallengeModifierChances);
    console.groupEnd();

    // ── Available Toys (task selector perspective) ────────────────────────
    console.group('%c🔍 Available Toys for Task Selection', 'font-weight:bold;color:#4facfe');
    if (conditions) {
        const available = {};
        for (const setId of gs.selectedSets) {
            for (const [key, enabled] of Object.entries(toySetEnable)) {
                if (!enabled) continue;
                const idx = key.indexOf('_');
                const set = key.substring(0, idx);
                const tid = key.substring(idx + 1);
                if (set !== setId) continue;
                if (toyChecked[tid] === false) continue;
                const total = toyQty[key] || 1;
                const inUse = conditions.countToy(tid);
                const avail = total - inUse;
                if (available[tid] === undefined || available[tid] < avail) {
                    available[tid] = avail;
                }
            }
        }
        console.table(
            Object.entries(available).map(([id, qty]) => ({
                toyId: id,
                totalQty: toyQty[Object.keys(toyQty).find(k => k.endsWith('_' + id))] || qty,
                inUse: conditions.countToy(id),
                availableForTasks: qty,
            }))
        );
    }
    console.groupEnd();

    console.groupEnd(); // end top-level group
}

// Start game
function startGame() {
    const selectedSets = window.GAME_STATE.selectedSets;
    if (selectedSets.length === 0) {
        alert('⚠️ Please select at least one instruction set before starting!');
        return;
    }
    
    const hasToys = Object.values(window.GAME_STATE.toyQuantities).some(qty => qty > 0);
    const hasCheckedToys = Object.values(window.GAME_STATE.toyChecked).some(checked => checked);
    
    if (!hasToys || !hasCheckedToys) {
        alert('⚠️ Please select at least one toy before starting!');
        return;
    }
    
    const playerName = document.getElementById('playerNameInput').value.trim();
    if (!playerName) {
        alert('⚠️ Please enter your name before starting!');
        return;
    }
    
    if (!taskRegistryLoaded) {
        alert('⚠️ Task system is still loading. Please wait a moment and try again.');
        return;
    }
    
    const boardSizeInput = document.getElementById('boardSizeSelect');
    validateBoardSize(boardSizeInput);
    const boardSize = parseInt(boardSizeInput.value);
    
    window.GAME_STATE.playerName = playerName;
    window.GAME_STATE.totalSquares = boardSize;
    boardRenderer.updateSize(boardSize);
    
    const mode = window.GAME_STATE.snakesLaddersMode;
    
    if (mode === 'classic') {
        window.BOARD_SNAKES = {16:6, 47:26, 49:11, 56:53, 62:19, 64:60, 87:24, 93:73, 95:75, 98:78};
        window.BOARD_LADDERS = {1:38, 4:14, 9:31, 21:42, 28:84, 36:44, 51:67, 71:91, 80:99};
    } else if (mode === 'random') {
        const difficulty = window.GAME_STATE.snakesLaddersDifficulty || 'medium';
        const generated = generateRandomSnakesAndLadders(boardSize, difficulty);
        window.BOARD_SNAKES = generated.snakes;
        window.BOARD_LADDERS = generated.ladders;
        console.log(`Generated random snakes/ladders (${difficulty}):`, window.BOARD_SNAKES, window.BOARD_LADDERS);
    } else if (mode === 'custom') {
        window.BOARD_SNAKES = { ...window.GAME_STATE.customSnakes };
        window.BOARD_LADDERS = { ...window.GAME_STATE.customLadders };
        
        const errors = validateCustomSnakesLadders(
            window.BOARD_SNAKES, 
            window.BOARD_LADDERS, 
            boardSize
        );
        
        if (errors.length > 0) {
            alert('⚠️ Custom snakes/ladders have errors:\n\n' + errors.join('\n'));
            return;
        }
    }
    
    window.GAME_STATE.boardSnakes = window.BOARD_SNAKES;
    window.GAME_STATE.boardLadders = window.BOARD_LADDERS;
    
    window.GAME_STATE.gameStarted = true;
    window.GAME_STATE.gamePhase = 'awaiting_dice_roll';
    
    boardRenderer.snakes = window.BOARD_SNAKES;
    boardRenderer.ladders = window.BOARD_LADDERS;
    
    if (window.GAME_STATE.cageWorn && window.GAME_STATE.toyChecked['cage']) {
        window.addToyToBodyPart('Pe', 'cage');
    }
    
    // Create the board first (still hidden on home page)
    boardRenderer.create();
    scaleManager.init();
    
    window.GAME_STATE.turnCount = 0;
    document.getElementById('turnCounter').textContent = 'Turn: 0';
    document.getElementById('diceResult').textContent = 'Dice: -';
    window.GAME_STATE.diceResultText = 'Dice: -';
    
    const rollDiceButton = document.getElementById('rollDice');
    rollDiceButton.textContent = '🎲 Roll Dice';
    rollDiceButton.disabled = false;
    rollDiceButton.onclick = null;
    rollDiceButton.onclick = rollDice;
    
    saveGameState();
    
   // Hide home page BEFORE scrolling to prevent visible snap
   document.getElementById('homePage').style.visibility = 'hidden';
   
   // Pre-scroll document to the bottom so when boardPage slides in
   // the board is already at the correct position.
   // The slide-in animation covers the full viewport so no snap is visible.
   window.scrollTo(0, document.body.scrollHeight + 99999);

   _nextBoardAnim = 'slide';
   showPage('board');
   
   // Restore visibility after transition starts (won't be visible anyway due to animation overlay)
   setTimeout(() => {
       const homePage = document.getElementById('homePage');
       if (homePage) homePage.style.visibility = '';
   }, 50);

   // After the slide animation completes, confirm scroll is at bottom.
   setTimeout(() => {
       waitForBoard(() => {
           scrollToBottom();
       });
   }, 1100);
    
    logGameStateOnStart();
}

// Restore saved game
function restoreSavedGame(state) {
    console.log('💾 Restoring saved game...', state);
    console.log('📍 Game phase:', state.gamePhase);
    
    restoreUIState(state);
    
    if (state.gameStarted) {
        const rollDiceButton = document.getElementById('rollDice');
        const phase = state.gamePhase || 'awaiting_dice_roll';
        
        if (state.currentInstruction && state.currentInstruction.trim() !== '') {
            restoreVNState();
            
        } else if (phase === 'awaiting_snake_ladder_task') {
            rollDiceButton.disabled = false;
            
            if (state.pendingSnakeLadder) {
                const destSquare = document.getElementById(`square-${state.pendingSnakeLadder.to}`);
                if (destSquare) {
                    destSquare.classList.add(
                        state.pendingSnakeLadder.type === 'snake' ? 'snake-destination' : 'ladder-destination'
                    );
                }
                
                rollDiceButton.onclick = () => {
                    showPage('task');
                    window.displaySnakeLadderTask(
                        state.pendingSnakeLadder.type,
                        state.pendingSnakeLadder.from,
                        state.pendingSnakeLadder.to
                    );
                };
            }
        } else if (phase === 'awaiting_normal_task') {
            rollDiceButton.disabled = false;
            rollDiceButton.onclick = () => {
                showPage('task');
                window.displayRandomInstructionWithAddRemove(state.pendingAddRemoveTask);
            };
        } else {
            rollDiceButton.disabled = false;
            rollDiceButton.onclick = rollDice;
        }
        
        console.log('✅ Game restored');
    }
}

// Reset game (only resets game progress, keeps settings)
function resetGame() {
    console.log('🔄 Resetting game...');
    
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
    window.GAME_STATE.vnState = null;
    window.GAME_STATE.boardSnakes = {};
    window.GAME_STATE.boardLadders = {};
    
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
    
    resetPlayerState();
    
    document.getElementById('turnCounter').textContent = 'Turn: 0';
    document.getElementById('diceResult').textContent = 'Dice: -';
    document.getElementById('testJumpInput').value = '';
    
    const rollDiceButton = document.getElementById('rollDice');
    rollDiceButton.textContent = '🎲 Roll Dice';
    rollDiceButton.disabled = false;
    rollDiceButton.onclick = null;
    rollDiceButton.onclick = rollDice;
    
    const instructions = document.getElementById('instructions');
    instructions.classList.remove('active');
    instructions.innerHTML = '';
    
    saveGameState();
    
    document.getElementById('resetModal').classList.remove('active');
    
    showPage('home');
    
    console.log('✅ Game reset complete');
}

// Reset settings (resets all settings to defaults)
function resetSettings() {
    console.log('🔄 Resetting settings...');
    
    resetGameState();
    resetPlayerState();
    
    document.getElementById('playerNameInput').value = '';
    document.getElementById('boardSizeSelect').value = '100';
    
    // FIX ISSUE 2: Force immediate layout recalculation
    const buttonContainer = document.getElementById('buttoncontainer');
    if (buttonContainer) {
        // Force reflow by reading offsetHeight
        void buttonContainer.offsetHeight;
    }
    
    document.querySelectorAll('#instructionSetCheckboxes input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
    
    window.GAME_STATE.prizeSettings = { full: 33, ruin: 33, denied: 34 };
    window.GAME_STATE.finalChallengeSettings = { stroking: 33, vibe: 33, anal: 34 };
    
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
    
    window.GAME_STATE.finalChallengeDifficulties = {
        stroking: 'medium',
        vibe: 'medium',
        anal: 'medium'
    };
    
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
    
    window.GAME_STATE.finalChallengeModifiers = { ce: false, pf: false };
    
    const classicRadio = document.querySelector('input[name="snakesLaddersMode"][value="classic"]');
    if (classicRadio) classicRadio.checked = true;
    handleSnakesLaddersModeChange('classic');
    
    const difficultyDropdown = document.getElementById('snakesLaddersDifficulty');
    if (difficultyDropdown) difficultyDropdown.value = 'medium';
    window.GAME_STATE.snakesLaddersDifficulty = 'medium';
    
    ['stroking_icyhot', 'stroking_icewater', 'stroking_ktb', 'stroking_ballsqueeze', 'stroking_2finger',
     'vibe_icyhot', 'vibe_icewater', 'anal_vibe'].forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) checkbox.checked = false;
    });
    
    ['ce', 'pf'].forEach(mod => {
        const checkbox = document.getElementById(`modifier_${mod}`);
        if (checkbox) checkbox.checked = false;
    });
    
    ['stroking_icyhot', 'stroking_icewater', 'stroking_ktb', 'stroking_ballsqueeze', 'stroking_2finger',
     'vibe_icyhot', 'vibe_icewater', 'anal_vibe', 'ce', 'pf'].forEach(id => {
        const input = document.getElementById(`${id}_chance`);
        if (input) input.value = 10;
    });
    
    ['stroking', 'vibe', 'anal'].forEach(type => {
        const dropdown = document.getElementById(`${type}Difficulty`);
        if (dropdown) dropdown.value = 'medium';
    });
    
    document.getElementById('fullPercent').textContent = '33%';
    document.getElementById('ruinPercent').textContent = '33%';
    document.getElementById('deniedPercent').textContent = '34%';
    document.getElementById('fullSlider').value = 33;
    document.getElementById('ruinSlider').value = 33;
    document.getElementById('deniedSlider').value = 34;
    
    document.getElementById('strokingPercent').textContent = '33%';
    document.getElementById('vibePercent').textContent = '33%';
    document.getElementById('analPercent').textContent = '34%';
    document.getElementById('strokingSlider').value = 33;
    document.getElementById('vibeSlider').value = 33;
    document.getElementById('analSlider').value = 34;
    
    // Reinitialize UI to trigger fresh render with stable widths
    initializeUI();
    
    // Force another layout recalculation after initializeUI
    if (buttonContainer) {
        void buttonContainer.offsetHeight;
    }
    
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
