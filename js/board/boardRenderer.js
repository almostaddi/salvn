// Board rendering — negative-margin connector approach (no transform / scale).
//
//  SQ    = 70 px  — visual face of every square
//  EXTRA =  9 px  — extra height added to edge-connector squares,
//                   cancelled by an equal negative margin so the row
//                   height perceived by the browser stays SQ px.
//
//  Connector types:
//    "up"           → bleed upward   → marginTop:    -EXTRA
//    "up-right"     → bleed upward   → marginTop:    -EXTRA
//    "down-left"    → bleed downward → marginBottom: -EXTRA
//    "down-left-tl" → bleed downward → marginBottom: -EXTRA

export class BoardRenderer {
    constructor(boardSize = 100) {
        this.boardElement = document.getElementById('board');
        this.totalSquares = boardSize;
        this.boardSize    = 10;           // squares per row — always 10
        this.snakes  = { 16:6,  47:26, 49:11, 56:53, 62:19,
                         64:60, 87:24, 93:73, 95:75, 98:78 };
        this.ladders = {  1:38,  4:14,  9:31, 21:42, 28:84,
                         36:44, 51:67, 71:91, 80:99 };

        this.SQ    = 70;
        this.EXTRA =  9;

        // Board natural width: 10 squares * SQ + 9 gaps * 2px
        // Keep in sync with #board gap (2px) in CSS
        this.BOARD_NATURAL_WIDTH = this.SQ * 10 + 2 * 9;
        this.MAX_SCALE = 0.9;

        this._scaleHandler = () => this.scale();
    }

    updateSize(newSize) {
        this.totalSquares = newSize;
    }

    create() {
        const totalRows = this.totalSquares / this.boardSize;

        // Ensure scale wrapper exists in DOM
        this._ensureWrapper();

        this.boardElement.innerHTML = '';

        // Strip any leftover inline styles
        this.boardElement.style.transform       = '';
        this.boardElement.style.transformOrigin = '';
        this.boardElement.style.paddingTop      = '';

        // Rows: top → bottom, highest numbers first
        for (let row = totalRows - 1; row >= 0; row--) {
            this.boardElement.appendChild(this._createRow(row));
        }

        // Apply scale immediately after building
        this.scale();

        // Listen for resize
        window.removeEventListener('resize', this._scaleHandler);
        window.addEventListener('resize', this._scaleHandler);
    }

    scale() {
        const wrapper = document.getElementById('boardScaleWrapper');
        if (!wrapper) return;

        const windowWidth = window.innerWidth;
        const rawScale = windowWidth / this.BOARD_NATURAL_WIDTH;
        const clampedScale = Math.min(this.MAX_SCALE, rawScale);

        wrapper.style.transform = `scale(${clampedScale})`;

        // When scaled down, the wrapper still occupies its natural size in
        // the document flow, leaving a gap above the board. We compensate
        // by pulling it up with a negative margin equal to the height lost.
        // Height lost = naturalHeight * (1 - scale)
        const naturalHeight = wrapper.offsetHeight;
        const heightLost = naturalHeight * (1 - clampedScale);
        wrapper.style.marginBottom = `-${heightLost}px`;
    }

    // ── private ──────────────────────────────────────────────────────────────

    _ensureWrapper() {
        // If the board is already inside a wrapper, do nothing
        if (this.boardElement.parentElement &&
            this.boardElement.parentElement.id === 'boardScaleWrapper') {
            return;
        }

        // Create wrapper and insert it where the board currently is
        const wrapper = document.createElement('div');
        wrapper.id = 'boardScaleWrapper';
        this.boardElement.parentNode.insertBefore(wrapper, this.boardElement);
        wrapper.appendChild(this.boardElement);
    }

    _createRow(rowIndex) {
        const row = document.createElement('div');
        row.className = 'board-row';

        const isLTR    = rowIndex % 2 === 0;
        const rowStart = rowIndex * this.boardSize + 1;

        for (let col = 0; col < this.boardSize; col++) {
            const num = isLTR
                ? rowStart + col
                : rowStart + (this.boardSize - 1 - col);
            row.appendChild(this._createSquare(num));
        }
        return row;
    }

    // Connector type for numbers ending in 0 or 1 (the "bend" squares).
    _connectorType(number) {
        if (number === this.totalSquares || number === 1) return null;

        const endsZero = number % 10 === 0;
        const endsOne  = number % 10 === 1;
        if (!endsZero && !endsOne) return null;

        const isOddDecade = Math.floor(number / 10) % 2 === 1;
        if (endsZero) return isOddDecade ? 'up-right'     : 'up';
        else          return isOddDecade ? 'down-left'    : 'down-left-tl';
    }

    _createSquare(number) {
        const isSnake  = !!this.snakes[number];
        const isLadder = !!this.ladders[number];
        const connType = this._connectorType(number);
        const { SQ, EXTRA } = this;

        const el = document.createElement('div');
        el.id             = `square-${number}`;
        el.dataset.number = number;

        // Class list
        const cls = ['square'];
        if (isSnake)  { cls.push('snake');  el.dataset.destination = `↓${this.snakes[number]}`; }
        if (isLadder) { cls.push('ladder'); el.dataset.destination = `↑${this.ladders[number]}`; }
        if (connType) { cls.push(`square-connector-${connType}`); }
        el.className = cls.join(' ');

        if (connType) {
            const isUp = connType === 'up' || connType === 'up-right';

            Object.assign(el.style, {
                width:          `${SQ}px`,
                minWidth:       `${SQ}px`,
                height:         `${SQ + EXTRA}px`,
                minHeight:      `${SQ + EXTRA}px`,
                marginTop:      isUp  ? `-${EXTRA}px` : '0',
                marginBottom:   isUp  ? '0'           : `-${EXTRA}px`,
                display:        'flex',
                alignItems:     isUp  ? 'flex-end'    : 'flex-start',
                justifyContent: 'center',
                position:       'relative',
                flexShrink:     '0',
            });

            const inner = document.createElement('div');
            inner.className = 'square-connector-inner';
            Object.assign(inner.style, {
                width:          `${SQ}px`,
                height:         `${SQ}px`,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                fontSize:       '24px',
                fontWeight:     'bold',
                position:       'relative',
                flexShrink:     '0',
            });
            inner.textContent = number;
            el.appendChild(inner);

        } else {
            Object.assign(el.style, {
                width:      `${SQ}px`,
                height:     `${SQ}px`,
                minWidth:   `${SQ}px`,
                flexShrink: '0',
            });
            el.textContent = number;
        }

        el.addEventListener('mouseenter', () => {
            el.style.filter    = 'brightness(1.12)';
            el.style.zIndex    = '10';
            el.style.boxShadow = '0 8px 16px rgba(0,0,0,0.35)';
        });
        el.addEventListener('mouseleave', () => {
            el.style.filter    = '';
            el.style.zIndex    = '';
            el.style.boxShadow = '';
        });

        return el;
    }
}
