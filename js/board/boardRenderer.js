// Board rendering and layout - compensates for upward transforms
export class BoardRenderer {
    constructor(boardSize = 100) {
        this.boardElement = document.getElementById('board');
        this.totalSquares = boardSize;
        this.boardSize = 10; // Always 10 squares per row
        this.snakes = {16:6, 47:26, 49:11, 56:53, 62:19, 64:60, 87:24, 93:73, 95:75, 98:78};
        this.ladders = {1:38, 4:14, 9:31, 21:42, 28:84, 36:44, 51:67, 71:91, 80:99};
    }
    
    // Update total squares (for board size changes)
    updateSize(newSize) {
        this.totalSquares = newSize;
    }
    
    // Calculate maximum shift amount for the entire board
    getMaxShiftAmount() {
        // The highest numbered square has the most shift
        const maxShift = this.getShiftAmount(this.totalSquares);
        return maxShift;
    }
    
    // Create the board
    create() {
        const totalRows = this.totalSquares / this.boardSize;
        this.boardElement.innerHTML = ''; // Clear existing board
        
        // Calculate max shift and add as padding-top to prevent overflow
        const maxShift = this.getMaxShiftAmount();
        this.boardElement.style.paddingTop = `${maxShift}px`;
        
        console.log(`Board padding-top: ${maxShift}px (compensates for upward transforms)`);
        
        // Generate rows from top to bottom
        for (let row = totalRows - 1; row >= 0; row--) {
            this.createRow(row);
        }
        
        // Scale board to fit window
        setTimeout(() => this.scale(), 50);
    }
    
    // Create a single row
    createRow(rowIndex) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'board-row';
        
        // Determine direction (alternating left-to-right, right-to-left)
        const isLeftToRight = rowIndex % 2 === 0;
        const rowStartNum = rowIndex * this.boardSize + 1;
        
        for (let col = 0; col < this.boardSize; col++) {
            const squareNum = isLeftToRight ? 
                rowStartNum + col : 
                rowStartNum + (this.boardSize - 1 - col);
            
            const square = this.createSquare(squareNum);
            rowDiv.appendChild(square);
        }
        
        this.boardElement.appendChild(rowDiv);
    }
    
    // Calculate dynamic shift amount in pixels
    getShiftAmount(number) {
        const startShiftAt = 12;
        if (number < startShiftAt) {
            return 0;
        }
        
        // Calculate shift level
        const shiftLevel = Math.floor((number - startShiftAt) / 10) + 1;
        
        // 9px per level
        return shiftLevel * 9;
    }
    
    // Determine if a square needs a connector and what type
    getConnectorType(number) {
        const isFinish = number === this.totalSquares;
        
        // No connectors for finish square or square 1
        if (isFinish || number === 1) {
            return null;
        }
        
        const endsWithZero = number % 10 === 0;
        const endsWithOne = number % 10 === 1;
        
        if (!endsWithZero && !endsWithOne) {
            return null; // No connector needed
        }
        
        const decade = Math.floor(number / 10);
        const isOddDecade = decade % 2 === 1;
        
        if (endsWithZero) {
            // Numbers ending in 0 connect upward
            return isOddDecade ? 'up-right' : 'up';
        } else {
            // Numbers ending in 1 connect downward
            return isOddDecade ? 'down-left' : 'down-left-tl';
        }
    }
    
    // Create a single square
    createSquare(number) {
        const square = document.createElement('div');
        
        // Calculate shift amount
        const shiftAmount = this.getShiftAmount(number);
        
        // Base classes
        let baseClass = 'square';
        
        // Check for snakes and ladders
        const isSnake = this.snakes[number];
        const isLadder = this.ladders[number];
        
        if (isSnake) {
            baseClass += ' snake';
            square.setAttribute('data-destination', '↓' + this.snakes[number]);
        } else if (isLadder) {
            baseClass += ' ladder';
            square.setAttribute('data-destination', '↑' + this.ladders[number]);
        }
        
        square.className = baseClass;
        square.id = `square-${number}`;
        square.setAttribute('data-number', number);
        
        // Determine connector type
        const connectorType = this.getConnectorType(number);
        
        if (connectorType) {
            // Add connector class
            const connectorClass = `square-connector-${connectorType}`;
            square.className = `${baseClass} ${connectorClass}`;
            
            // Create inner div for connector
            const inner = document.createElement('div');
            inner.className = 'square-connector-inner';
            inner.textContent = number;
            square.appendChild(inner);
        } else {
            // Regular square - just add number as text content
            square.textContent = number;
        }
        
        // Apply inline transform for shift
        if (shiftAmount > 0) {
            square.style.transform = `translateY(-${shiftAmount}px)`;
            
            // Add hover handlers to maintain shift while hovering
            square.addEventListener('mouseenter', function() {
                this.style.transform = `translateY(-${shiftAmount}px) scale(1.1)`;
            });
            square.addEventListener('mouseleave', function() {
                this.style.transform = `translateY(-${shiftAmount}px)`;
            });
        }
        
        return square;
    }
    
    // Scale board to fit window WIDTH only (allow vertical scroll)
    scale() {
        // Reset scale to get natural dimensions
        this.boardElement.style.transform = 'scale(1)';
        this.boardElement.style.transformOrigin = 'top center';
        
        const boardWidth = this.boardElement.scrollWidth;
        
        // Get available width
        const windowWidth = window.innerWidth - 40; // 20px padding on each side
        
        // Calculate scale based on WIDTH only
        const scaleX = windowWidth / boardWidth;
        
        // Clamp scale (don't scale up beyond 100%, minimum 50%)
        const minScale = 0.5;
        const maxScale = 1.0;
        const scale = Math.max(Math.min(scaleX, maxScale), minScale);
        
        // Apply scale with top-center origin (board grows downward naturally)
        this.boardElement.style.transform = `scale(${scale})`;
        this.boardElement.style.transformOrigin = 'top center';
        
        console.log(`Board scaled to ${(scale * 100).toFixed(1)}% (width: ${boardWidth}px -> ${Math.round(boardWidth * scale)}px)`);
    }
}
