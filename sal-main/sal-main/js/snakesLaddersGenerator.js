// Snakes and Ladders generation logic with difficulty presets

// Difficulty presets
// Note: ALL percentages are based on BOARD SIZE for consistency
// - Minimums use Math.ceil() to round UP (5% of 100 = 5.0 → 5 squares)
// - Maximums use Math.floor() to round DOWN (50% of 100 = 50.0 → 50 squares)
// - Math.max(1, ...) ensures at least 1 square movement on tiny boards
// - Absolute limits ensure snakes don't go below square 1, ladders don't exceed board
//
// Snakes/Ladders per row are MULTIPLIED by number of rows to get total count
// Example: 1.5 snakes per row × 10 rows = 15 total snakes to place
//
// Examples for 100-square board (10 rows):
// Easy: 10 ladders (1×10), 20 snakes (2×10), minJump=10, maxJump=50, minFall=5, maxFall=30
// Medium: 10 ladders (1×10), 10 snakes (1×10), minJump=5, maxJump=40, minFall=5, maxFall=40
// Hard: 10 ladders (1×10), 20 snakes (2×10), minJump=5, maxJump=30, minFall=10, maxFall=50
//
// Placement is controlled by maxAnyPerRow limit (not by generation targets)
const DIFFICULTY_PRESETS = {
    easy: {
        minJumpPercent: 10,
        minFallPercent: 5,
        maxJumpPercent: 50,
        maxFallPercent: 30,
        snakesPerRow: 1,
        laddersPerRow: 2,
        maxAnyPerRow: 4
    },
    medium: {
        minJumpPercent: 5,
        minFallPercent: 5,
        maxJumpPercent: 40,
        maxFallPercent: 40,
        snakesPerRow: 1,
        laddersPerRow: 1,
        maxAnyPerRow: 3
    },
    hard: {
        minJumpPercent: 5,
        minFallPercent: 10,
        maxJumpPercent: 30,
        maxFallPercent: 50,
        snakesPerRow: 2,
        laddersPerRow: 1,
        maxAnyPerRow: 4
    }
};

// Generate random snakes and ladders based on board size and difficulty
export function generateRandomSnakesAndLadders(totalSquares, difficulty = 'medium') {
    const preset = DIFFICULTY_PRESETS[difficulty] || DIFFICULTY_PRESETS.medium;
    
    const numRows = totalSquares / 10;
    const snakes = {};
    const ladders = {};
    
    // Calculate total snakes and ladders to generate
    const totalSnakesToGenerate = Math.round(preset.snakesPerRow * numRows);
    const totalLaddersToGenerate = Math.round(preset.laddersPerRow * numRows);
    
    // Track used "from" squares (can only be start of one special)
    const usedFromSquares = new Set([1, totalSquares]); // Reserve start and finish
    
    // Track used "to" squares (prefer not to reuse, but allow if necessary)
    const usedToSquares = new Set();
    
    // CRITICAL: Also track ALL squares that are part of any snake/ladder
    // A square cannot be both a destination AND a start
    const allUsedSquares = new Set([1, totalSquares]);
    
    // Track count per row
    const anyPerRow = Array(numRows).fill(0);
    
    // Generate snakes (try to place totalSnakesToGenerate snakes anywhere on board)
    let snakesPlaced = 0;
    let attempts = 0;
    const maxAttempts = totalSnakesToGenerate * 20; // Give plenty of attempts
    
    while (snakesPlaced < totalSnakesToGenerate && attempts < maxAttempts) {
        attempts++;
        
        // Pick a random row
        // Exception: 10-square boards can have snakes on first row (only 1 row otherwise)
        // All other boards: exclude first row for snakes
        const minRow = (totalSquares === 10) ? 0 : 1;
        const rowIndex = Math.floor(Math.random() * (numRows - minRow)) + minRow;
        const rowStart = rowIndex * 10 + 1;
        const rowEnd = rowStart + 9;
        
        const snake = generateSnake(
            totalSquares,
            rowStart,
            rowEnd,
            preset,
            usedFromSquares,
            usedToSquares,
            allUsedSquares,
            anyPerRow,
            numRows
        );
        
        if (snake) {
            snakes[snake.from] = snake.to;
            usedFromSquares.add(snake.from);
            usedToSquares.add(snake.to);
            allUsedSquares.add(snake.from);
            allUsedSquares.add(snake.to);
            
            const fromRow = Math.floor((snake.from - 1) / 10);
            anyPerRow[fromRow]++;
            snakesPlaced++;
        }
    }
    
    // Generate ladders (try to place totalLaddersToGenerate ladders anywhere on board)
    let laddersPlaced = 0;
    attempts = 0;
    
    while (laddersPlaced < totalLaddersToGenerate && attempts < maxAttempts) {
        attempts++;
        
        // Pick a random row (excluding last row - no ladders there)
        const rowIndex = Math.floor(Math.random() * (numRows - 1)); // rows 0 to numRows-2
        const rowStart = rowIndex * 10 + 1;
        const rowEnd = rowStart + 9;
        
        const ladder = generateLadder(
            totalSquares,
            rowStart,
            rowEnd,
            preset,
            usedFromSquares,
            usedToSquares,
            allUsedSquares,
            anyPerRow,
            numRows
        );
        
        if (ladder) {
            ladders[ladder.from] = ladder.to;
            usedFromSquares.add(ladder.from);
            usedToSquares.add(ladder.to);
            allUsedSquares.add(ladder.from);
            allUsedSquares.add(ladder.to);
            
            const fromRow = Math.floor((ladder.from - 1) / 10);
            anyPerRow[fromRow]++;
            laddersPlaced++;
        }
    }
    
    console.log(`Generated ${snakesPlaced}/${totalSnakesToGenerate} snakes and ${laddersPlaced}/${totalLaddersToGenerate} ladders`);
    
    return { snakes, ladders };
}

// Generate a single snake
function generateSnake(totalSquares, rowStart, rowEnd, preset, usedFromSquares, usedToSquares, allUsedSquares, anyPerRow, numRows) {
    const attempts = 100;
    
    for (let attempt = 0; attempt < attempts; attempt++) {
        // Pick random "from" square in this row
        const from = Math.floor(Math.random() * 10) + rowStart;
        
        // CRITICAL: Skip if already used anywhere (as from OR to)
        if (allUsedSquares.has(from)) continue;
        
        // Check row limit
        const fromRow = Math.floor((from - 1) / 10);
        if (anyPerRow[fromRow] >= preset.maxAnyPerRow) continue;
        
        // Calculate fall range
        // Both min and max fall are percentages of BOARD SIZE (consistent across all snakes)
        const minFall = Math.max(1, Math.ceil(totalSquares * preset.minFallPercent / 100));
        const maxFall = Math.max(1, Math.floor(totalSquares * preset.maxFallPercent / 100));
        
        // Limit max fall by position (can't fall below square 1)
        const absoluteMaxFall = from - 1;
        const effectiveMaxFall = Math.min(maxFall, absoluteMaxFall);
        
        // Must fall at least minFall
        if (effectiveMaxFall < minFall) continue;
        
        // Pick random fall distance
        const fall = Math.floor(Math.random() * (effectiveMaxFall - minFall + 1)) + minFall;
        let to = from - fall;
        
        // If would go below square 1, adjust
        if (to < 1) {
            to = Math.max(1, from - effectiveMaxFall);
            if (to >= from) continue; // Can't create valid snake
        }
        
        // CRITICAL: Check if destination is already used anywhere
        if (allUsedSquares.has(to)) continue;
        
        // Prefer unused "to" squares
        if (!usedToSquares.has(to)) {
            // Found unused destination - use it
            return { from, to };
        }
    }
    
    // Second pass: allow reusing "to" squares (but still not if they're already a "from")
    for (let attempt = 0; attempt < attempts; attempt++) {
        const from = Math.floor(Math.random() * 10) + rowStart;
        
        // CRITICAL: Skip if already used anywhere
        if (allUsedSquares.has(from)) continue;
        
        const fromRow = Math.floor((from - 1) / 10);
        if (anyPerRow[fromRow] >= preset.maxAnyPerRow) continue;
        
        const minFall = Math.max(1, Math.ceil(totalSquares * preset.minFallPercent / 100));
        const maxFall = Math.max(1, Math.floor(totalSquares * preset.maxFallPercent / 100));
        
        // Limit max fall by position
        const absoluteMaxFall = from - 1;
        const effectiveMaxFall = Math.min(maxFall, absoluteMaxFall);
        
        if (effectiveMaxFall < minFall) {
            // No viable squares with min fall - pick highest available instead
            const highestFall = from - 1;
            if (highestFall >= 1 && !allUsedSquares.has(highestFall)) {
                return { from, to: highestFall };
            }
            continue;
        }
        
        const fall = Math.floor(Math.random() * (effectiveMaxFall - minFall + 1)) + minFall;
        let to = from - fall;
        
        if (to < 1) {
            to = Math.max(1, from - effectiveMaxFall);
            if (to >= from) {
                // Pick highest available
                to = from - 1;
                if (to < 1) continue;
            }
        }
        
        // CRITICAL: Still can't use a square that's already a "from"
        if (allUsedSquares.has(to)) continue;
        
        // Allow reusing "to" squares in second pass (destinations can be reused)
        return { from, to };
    }
    
    return null; // Could not place snake
}

// Generate a single ladder
function generateLadder(totalSquares, rowStart, rowEnd, preset, usedFromSquares, usedToSquares, allUsedSquares, anyPerRow, numRows) {
    const attempts = 100;
    
    for (let attempt = 0; attempt < attempts; attempt++) {
        // Pick random "from" square in this row
        const from = Math.floor(Math.random() * 10) + rowStart;
        
        // CRITICAL: Skip if already used anywhere (as from OR to)
        if (allUsedSquares.has(from)) continue;
        
        // Check row limit
        const fromRow = Math.floor((from - 1) / 10);
        if (anyPerRow[fromRow] >= preset.maxAnyPerRow) continue;
        
        // Calculate jump range (percentages of total board size)
        // Always round UP for minimums to ensure meaningful movement
        const minJump = Math.max(1, Math.ceil(totalSquares * preset.minJumpPercent / 100));
        // Always round DOWN for maximums to stay within bounds
        const maxJump = Math.max(1, Math.floor(totalSquares * preset.maxJumpPercent / 100));
        
        // Ensure we don't go past the last square
        const absoluteMaxJump = totalSquares - from;
        const effectiveMaxJump = Math.min(maxJump, absoluteMaxJump);
        
        // Must jump at least minJump
        if (effectiveMaxJump < minJump) {
            // No viable squares with min jump - pick highest available instead
            const highestJump = totalSquares - from;
            if (highestJump >= 1) {
                const to = from + highestJump;
                if (to <= totalSquares && to > from && to !== totalSquares && !allUsedSquares.has(to)) {
                    if (!usedToSquares.has(to)) {
                        return { from, to };
                    }
                }
            }
            continue;
        }
        
        // Pick random jump distance
        const jump = Math.floor(Math.random() * (effectiveMaxJump - minJump + 1)) + minJump;
        let to = from + jump;
        
        // Don't land on final square
        if (to === totalSquares) {
            to = totalSquares - 1;
        }
        
        // Ensure valid
        if (to > totalSquares || to <= from) continue;
        
        // CRITICAL: Check if destination is already used anywhere
        if (allUsedSquares.has(to)) continue;
        
        // Prefer unused "to" squares
        if (!usedToSquares.has(to)) {
            // Found unused destination - use it
            return { from, to };
        }
    }
    
    // Second pass: allow reusing "to" squares (but still not if they're already a "from")
    for (let attempt = 0; attempt < attempts; attempt++) {
        const from = Math.floor(Math.random() * 10) + rowStart;
        
        // CRITICAL: Skip if already used anywhere
        if (allUsedSquares.has(from)) continue;
        
        const fromRow = Math.floor((from - 1) / 10);
        if (anyPerRow[fromRow] >= preset.maxAnyPerRow) continue;
        
        const minJump = Math.max(1, Math.ceil(totalSquares * preset.minJumpPercent / 100));
        const maxJump = Math.max(1, Math.floor(totalSquares * preset.maxJumpPercent / 100));
        const absoluteMaxJump = totalSquares - from;
        const effectiveMaxJump = Math.min(maxJump, absoluteMaxJump);
        
        if (effectiveMaxJump < minJump) {
            // Pick highest available
            const to = totalSquares - 1; // Don't use final square
            if (to > from && !allUsedSquares.has(to)) {
                return { from, to };
            }
            continue;
        }
        
        const jump = Math.floor(Math.random() * (effectiveMaxJump - minJump + 1)) + minJump;
        let to = from + jump;
        
        if (to === totalSquares) {
            to = totalSquares - 1;
        }
        
        if (to > totalSquares || to <= from) continue;
        
        // CRITICAL: Still can't use a square that's already used
        if (allUsedSquares.has(to)) continue;
        
        // Allow reusing "to" squares in second pass (destinations can be reused)
        return { from, to };
    }
    
    return null; // Could not place ladder
}

// Parse custom snakes/ladders string
export function parseCustomSnakesLadders(text) {
    try {
        // Remove whitespace
        text = text.trim();
        
        // Remove curly braces if present (for backwards compatibility)
        text = text.replace(/^\{/, '').replace(/\}$/, '');
        
        if (!text) return {};
        
        const result = {};
        const pairs = text.split(',');
        
        for (const pair of pairs) {
            const [from, to] = pair.split(':').map(s => parseInt(s.trim()));
            if (!isNaN(from) && !isNaN(to)) {
                result[from] = to;
            }
        }
        
        return result;
    } catch (e) {
        console.error('Failed to parse custom snakes/ladders:', e);
        return {};
    }
}

// Validate custom snakes/ladders
export function validateCustomSnakesLadders(snakes, ladders, totalSquares) {
    const errors = [];
    const allFromSquares = new Set();
    const allToSquares = new Set();
    const allUsedSquares = new Set();
    
    // Check snakes
    for (const [from, to] of Object.entries(snakes)) {
        const fromNum = parseInt(from);
        const toNum = parseInt(to);
        
        if (fromNum < 1 || fromNum > totalSquares) {
            errors.push(`Snake from ${fromNum} is out of bounds (1-${totalSquares})`);
        }
        if (toNum < 1 || toNum > totalSquares) {
            errors.push(`Snake to ${toNum} is out of bounds (1-${totalSquares})`);
        }
        if (toNum >= fromNum) {
            errors.push(`Snake ${fromNum}→${toNum} must go down, not up`);
        }
        if (fromNum === totalSquares) {
            errors.push(`Snake cannot start on final square ${totalSquares}`);
        }
        if (allFromSquares.has(fromNum)) {
            errors.push(`Square ${fromNum} is used as the start of multiple specials`);
        }
        if (allUsedSquares.has(fromNum)) {
            errors.push(`Square ${fromNum} cannot be both a destination and a start (destination from another special conflicts)`);
        }
        if (allUsedSquares.has(toNum)) {
            errors.push(`Square ${toNum} is used multiple times (cannot be destination for multiple specials)`);
        }
        
        allFromSquares.add(fromNum);
        allToSquares.add(toNum);
        allUsedSquares.add(fromNum);
        allUsedSquares.add(toNum);
    }
    
    // Check ladders
    for (const [from, to] of Object.entries(ladders)) {
        const fromNum = parseInt(from);
        const toNum = parseInt(to);
        
        if (fromNum < 1 || fromNum > totalSquares) {
            errors.push(`Ladder from ${fromNum} is out of bounds (1-${totalSquares})`);
        }
        if (toNum < 1 || toNum > totalSquares) {
            errors.push(`Ladder to ${toNum} is out of bounds (1-${totalSquares})`);
        }
        if (toNum <= fromNum) {
            errors.push(`Ladder ${fromNum}→${toNum} must go up, not down`);
        }
        if (fromNum === totalSquares) {
            errors.push(`Ladder cannot start on final square ${totalSquares}`);
        }
        if (toNum === totalSquares) {
            errors.push(`Ladder cannot land on final square ${totalSquares}`);
        }
        if (allFromSquares.has(fromNum)) {
            errors.push(`Square ${fromNum} is used as the start of multiple specials`);
        }
        if (allUsedSquares.has(fromNum)) {
            errors.push(`Square ${fromNum} cannot be both a destination and a start (destination from another special conflicts)`);
        }
        if (allUsedSquares.has(toNum)) {
            errors.push(`Square ${toNum} is used multiple times (cannot be destination for multiple specials)`);
        }
        
        allFromSquares.add(fromNum);
        allToSquares.add(toNum);
        allUsedSquares.add(fromNum);
        allUsedSquares.add(toNum);
    }
    
    return errors;
}

// Format snakes/ladders for display in textarea
export function formatSnakesLaddersForDisplay(obj) {
    if (!obj || Object.keys(obj).length === 0) return '';
    
    const pairs = Object.entries(obj)
        .map(([from, to]) => `${from}:${to}`)
        .join(', ');
    
    return pairs;
}

// Generate and populate custom fields
export function generateAndPopulateCustom() {
    // Get current board size
    const boardSize = parseInt(document.getElementById('boardSizeSelect').value) || 100;
    
    // Get current difficulty setting from the dropdown
    const difficultyDropdown = document.getElementById('snakesLaddersDifficulty');
    const difficulty = difficultyDropdown ? difficultyDropdown.value : 'medium';
    
    // Generate snakes and ladders with selected difficulty
    const { snakes, ladders } = generateRandomSnakesAndLadders(boardSize, difficulty);
    
    // Format and populate the textareas
    document.getElementById('customSnakesInput').value = formatSnakesLaddersForDisplay(snakes);
    document.getElementById('customLaddersInput').value = formatSnakesLaddersForDisplay(ladders);
    
    // Update game state
    window.GAME_STATE.customSnakes = snakes;
    window.GAME_STATE.customLadders = ladders;
    
    // Save state
    if (window.GAME_FUNCTIONS && window.GAME_FUNCTIONS.saveState) {
        window.GAME_FUNCTIONS.saveState();
    }
    
    console.log('Generated custom snakes/ladders:', { snakes, ladders, difficulty });
}

// Expose globally
window.generateAndPopulateCustom = generateAndPopulateCustom;
