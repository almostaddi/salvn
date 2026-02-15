// Import modules
import { initializeBoard, resetBoard } from './board/boardRenderer.js';
import { initializePlayer } from './board/playerMovement.js';
import { loadSettings, saveSettings, resetSettings } from './settings/settingsManager.js';
import { showModal, hideModal } from './ui/modalManager.js';
import { initializeTaskSystem } from './tasks/taskSelector.js';

// Global state
let gameState = {
    settings: null,
    board: null,
    player: null
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 Game initializing...');
    
    // Load settings
    gameState.settings = loadSettings();
    console.log('⚙️ Settings loaded:', gameState.settings);
    
    // Populate settings form
    populateSettingsForm();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize task system
    initializeTaskSystem();
    
    // Show home page
    showPage('home');
    
    console.log('✅ Game initialized');
});

// Populate settings form with saved values
function populateSettingsForm() {
    const settings = gameState.settings;
    document.getElementById('playerName').value = settings.playerName;
    document.getElementById('gridSize').value = settings.gridSize;
    document.getElementById('numSnakes').value = settings.numSnakes;
    document.getElementById('numLadders').value = settings.numLadders;
}

// Show/hide pages
function showPage(pageName) {
    console.log('🔄 Switching to page:', pageName);
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // CRITICAL FIX: Also hide instructions container when switching away from task page
    const instructions = document.getElementById('instructions');
    if (instructions && pageName !== 'task') {
        instructions.classList.remove('active');
        console.log('🧹 Instructions hidden');
    }
    
    // Show target page
    const targetPage = document.getElementById(pageName + 'Page');
    if (targetPage) {
        targetPage.classList.add('active');
        console.log('✅ Now showing:', pageName);
    } else {
        console.error('❌ Page not found:', pageName + 'Page');
    }
    
    // Hide/show title and adjust body based on page
    const mainTitle = document.querySelector('h1');
    if (pageName === 'task') {
        // Task page: hide title, remove padding, prevent scroll
        if (mainTitle) mainTitle.style.display = 'none';
        document.body.classList.add('showing-task');
    } else {
        // Other pages: show title, restore padding
        if (mainTitle) mainTitle.style.display = 'block';
        document.body.classList.remove('showing-task');
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

// Setup all event listeners
function setupEventListeners() {
    // Start game button
    document.getElementById('startGame').addEventListener('click', startNewGame);
    
    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => {
        const currentPage = document.querySelector('.page.active').id.replace('Page', '');
        if (currentPage === 'home') {
            // On home page - reset settings
            showModal('resetSettingsModal');
        } else {
            // On board page - reset game
            showModal('resetModal');
        }
    });
    
    // Patch notes button
    document.getElementById('patchNotesBtn').addEventListener('click', () => {
        showModal('patchNotesModal');
    });
    
    // Reset modal - confirm reset game
    document.getElementById('confirmReset').addEventListener('click', () => {
        hideModal('resetModal');
        resetBoard();
        showPage('home');
    });
    
    document.getElementById('cancelReset').addEventListener('click', () => {
        hideModal('resetModal');
    });
    
    // Reset settings modal - confirm reset settings
    document.getElementById('confirmResetSettings').addEventListener('click', () => {
        hideModal('resetSettingsModal');
        resetSettings();
        gameState.settings = loadSettings();
        populateSettingsForm();
        alert('⚙️ Settings have been reset to defaults!');
    });
    
    document.getElementById('cancelResetSettings').addEventListener('click', () => {
        hideModal('resetSettingsModal');
    });
    
    // Close modals
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                hideModal(modal.id);
            }
        });
    });
    
    // Close modal on background click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal(modal.id);
            }
        });
    });
}

// Start new game
function startNewGame() {
    console.log('🎲 Starting new game...');
    
    // Get settings from form
    const settings = {
        playerName: document.getElementById('playerName').value || 'Player',
        gridSize: parseInt(document.getElementById('gridSize').value) || 10,
        numSnakes: parseInt(document.getElementById('numSnakes').value) || 5,
        numLadders: parseInt(document.getElementById('numLadders').value) || 5
    };
    
    // Validate settings
    if (settings.gridSize < 5 || settings.gridSize > 15) {
        alert('⚠️ Grid size must be between 5 and 15!');
        return;
    }
    
    if (settings.numSnakes < 0 || settings.numSnakes > 10) {
        alert('⚠️ Number of snakes must be between 0 and 10!');
        return;
    }
    
    if (settings.numLadders < 0 || settings.numLadders > 10) {
        alert('⚠️ Number of ladders must be between 0 and 10!');
        return;
    }
    
    // Save settings
    gameState.settings = settings;
    saveSettings(settings);
    
    // Initialize board and player
    gameState.board = initializeBoard(settings);
    gameState.player = initializePlayer(settings);
    
    // Show board page
    showPage('board');
    
    console.log('✅ Game started!');
}

// Export functions for use in other modules
export { showPage, gameState };
