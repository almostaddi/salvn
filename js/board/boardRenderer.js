// Board rendering with responsive scaling.
//
// All pixel values are multiplied by `scale` so the board fills the
// available viewport without any CSS transform trickery.
//
// Base dimensions (scale = 1):
//   SQ      = 64 px  — square face
//   EXTRA   =  7 px  — connector bleed (negative-margin technique)
//   ROW_GAP = EXTRA * 2  — gap between rows so bleed doesn't overlap
//   COL_GAP = 2 px       — gap between squares in a row

export class BoardRenderer {
    constructor(boardSize = 100) {
        this.boardElement  = document.getElementById('board');
        this.totalSquares  = boardSize;
        this.boardSize     = 10;       // squares per row — always 10

        this.snakes  = { 16:6,  47:26, 49:11, 56:53, 62:19,
                         64:60, 87:24, 93:73, 95:75, 98:78 };
        this.ladders = {  1:38,  4:14,  9:31, 21:42, 28:84,
                         36:44, 51:67, 71:91, 80:99 };

        // Base dimensions (unscaled)
        this.SQ      = 64;
        this.EXTRA   = 7;
        this.ROW_GAP = this.EXTRA * 2.3;   // 14
        this.COL_GAP = 2;

        // Current scale (updated by ScaleManager)
        this.scale = 1;

        // Compute natural dimensions for current board size
        this._computeNaturalDimensions();
    }

    // ── Compute natural (scale=1) board dimensions ────────────────────────
    _computeNaturalDimensions() {
        const cols = this.boardSize;
        const rows = this.totalSquares / this.boardSize;

        // No border/padding since we removed them from the board element
        this.NATURAL_BOARD_W = cols * this.SQ
            + (cols - 1) * this.COL_GAP;

        this.NATURAL_BOARD_H = rows * this.SQ
            + Math.max(0, rows - 1) * this.ROW_GAP;
    }

    updateSize(newSize) {
        this.totalSquares = newSize;
        this._computeNaturalDimensions();
    }

    // ── Public: (re)create the board at the current scale ─────────────────

    create() {
        const s = this.scale;
        const { SQ, EXTRA, ROW_GAP, COL_GAP } = this;
        const totalRows = this.totalSquares / this.boardSize;

        this.boardElement.innerHTML = '';

        this.boardElement.style.transform       = '';
        this.boardElement.style.transformOrigin = '';
        this.boardElement.style.paddingTop      = '';

        Object.assign(this.boardElement.style, {
            display:        'flex',
            flexDirection:  'column',
            gap:            `${ROW_GAP * s}px`,
            alignItems:     'flex-start',
            background:     'transparent',
            // No border, no padding, no box-shadow — clean look on gradient bg
            padding:        '0',
            border:         'none',
            borderRadius:   '0',
            boxShadow:      'none',
            margin:         '0 auto',
        });

        for (let row = totalRows - 1; row >= 0; row--) {
            this.boardElement.appendChild(this._createRow(row, s));
        }
    }

    // ── Private helpers ────────────────────────────────────────────────────

    _createRow(rowIndex, s) {
        const row = document.createElement('div');
        row.className = 'board-row';
        Object.assign(row.style, {
            display:        'flex',
            flexDirection:  'row',
            gap:            `${this.COL_GAP * s}px`,
            alignItems:     'flex-end',
            background:     'transparent',
        });

        const isLTR    = rowIndex % 2 === 0;
        const rowStart = rowIndex * this.boardSize + 1;

        for (let col = 0; col < this.boardSize; col++) {
            const num = isLTR
                ? rowStart + col
                : rowStart + (this.boardSize - 1 - col);
            row.appendChild(this._createSquare(num, s));
        }
        return row;
    }

    _connectorType(number) {
        if (number === this.totalSquares || number === 1) return null;
        const endsZero = number % 10 === 0;
        const endsOne  = number % 10 === 1;
        if (!endsZero && !endsOne) return null;
        const isOddDecade = Math.floor(number / 10) % 2 === 1;
        if (endsZero) return isOddDecade ? 'up-right'     : 'up';
        else          return isOddDecade ? 'down-left'    : 'down-left-tl';
    }

    _createSquare(number, s) {
        const { SQ, EXTRA } = this;
        const sq    = SQ    * s;
        const extra = EXTRA * s;

        const isSnake  = !!this.snakes[number];
        const isLadder = !!this.ladders[number];
        const connType = this._connectorType(number);

        const CONNECTOR_CFG = {
            'up':           { borderBottomLeftRadius:  20, direction: 'up'   },
            'up-right':     { borderBottomRightRadius: 20, direction: 'up'   },
            'down-left':    { borderTopRightRadius:    20, direction: 'down' },
            'down-left-tl': { borderTopLeftRadius:     20, direction: 'down' },
        };
        const connCfg = connType ? CONNECTOR_CFG[connType] : null;
        const isUp    = connCfg?.direction === 'up';
        const isDown  = connCfg?.direction === 'down';

        const isFinal   = number === this.totalSquares;
        const SNAKE_BG  = 'var(--danger-gradient,  linear-gradient(135deg,#ff6b6b 0%,#ee5a6f 100%))';
        const LADDER_BG = 'var(--success-gradient, linear-gradient(135deg,#51cf66 0%,#37b24d 100%))';
        const FINAL_BG  = 'linear-gradient(135deg,#ffd700 0%,#ffaa00 100%)';
        const BASE_BG   = 'var(--bg-primary, #ffffff)';
        const bg        = isFinal ? FINAL_BG : isSnake ? SNAKE_BG : isLadder ? LADDER_BG : BASE_BG;
        const fg        = (isFinal || isSnake || isLadder) ? 'var(--button-text,#fff)' : 'var(--text-primary,#333)';

        const el = document.createElement('div');
        el.id             = `square-${number}`;
        el.className      = 'square';
        el.dataset.number = number;

        Object.assign(el.style, {
            width:        `${sq}px`,
            height:       `${connCfg ? sq + extra : sq}px`,
            minWidth:     `${sq}px`,
            position:     'relative',
            background:   bg,
            border:       isFinal
                ? `${Math.max(1, 3 * s)}px solid #ffd700`
                : `${Math.max(1, 3 * s)}px solid var(--text-primary,#333)`,
            borderRadius: `${4 * s}px`,
            ...(connCfg && {
                borderTopLeftRadius:     `${(connCfg.borderTopLeftRadius     ?? 4) * s}px`,
                borderTopRightRadius:    `${(connCfg.borderTopRightRadius    ?? 4) * s}px`,
                borderBottomLeftRadius:  `${(connCfg.borderBottomLeftRadius  ?? 4) * s}px`,
                borderBottomRightRadius: `${(connCfg.borderBottomRightRadius ?? 4) * s}px`,
            }),
            marginTop:    isUp   ? `${-extra}px` : '0',
            marginBottom: isDown ? `${-extra}px` : '0',
            flexShrink:   '0',
            cursor:       'default',
            transition:   'filter 0.15s, box-shadow 0.15s, outline 0.15s',
            userSelect:   'none',
            boxShadow:    `0 ${2*s}px ${6*s}px rgba(0,0,0,0.15)`,
            scrollMarginTop: '100px',
        });

        // ── Content zone (the visible SQ×SQ face) ────────────────────────
        const content = document.createElement('div');
        Object.assign(content.style, {
            position:       'absolute',
            top:            isUp ? `${extra}px` : '0',
            left:           '0',
            width:          `${sq}px`,
            height:         `${sq}px`,
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            zIndex:         '1',
            pointerEvents:  'none',
        });

        // Final square star emoji — centered
        if (isFinal) {
            const star = document.createElement('span');
            Object.assign(star.style, {
                position:       'absolute',
                top:            '50%',
                left:           '50%',
                transform:      'translate(-50%, -50%)',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                fontSize:       `${sq * 0.72}px`,
                lineHeight:     '1',
                opacity:        '0.55',
                pointerEvents:  'none',
                userSelect:     'none',
            });
            star.textContent = '⭐';
            content.appendChild(star);
        }

        // Emoji watermark — centered
        if (!isFinal && (isSnake || isLadder)) {
            const emoji = document.createElement('span');
            Object.assign(emoji.style, {
                position:       'absolute',
                top:            '50%',
                left:           '50%',
                transform:      'translate(-50%, -50%)',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                fontSize:       `${sq * 0.72}px`,
                lineHeight:     '1',
                opacity:        '0.55',
                pointerEvents:  'none',
                userSelect:     'none',
            });
            emoji.textContent = isSnake ? '🐍' : '🪜';
            content.appendChild(emoji);
        }

        // Number label — top of content zone, above emoji
        const numLabel = document.createElement('span');
        Object.assign(numLabel.style, {
            fontSize:   `${sq * 0.3}px`,
            fontWeight: 'bold',
            color:      fg,
            lineHeight: '1',
            position:   'relative',
            zIndex:     '2',
            // Push number to top so it doesn't fight the centered emoji
            alignSelf:  'center',
            marginTop:  `${sq * 0.05}px`,
        });
        numLabel.textContent = number;
        content.appendChild(numLabel);

        // Destination badge (↓6, ↑38, etc.) — bottom of content zone
        if (!isFinal && (isSnake || isLadder)) {
            const dest = isSnake
                ? `↓${this.snakes[number]}`
                : `↑${this.ladders[number]}`;
            const badge = document.createElement('span');
            Object.assign(badge.style, {
                position:     'absolute',
                bottom:       `${sq * 0.06}px`,
                left:         '50%',
                transform:    'translateX(-50%)',
                fontSize:     `${sq * 0.16}px`,
                lineHeight:   '1.2',
                background:   'rgba(0,0,0,0.65)',
                color:        '#fff',
                padding:      `${1*s}px ${4*s}px`,
                borderRadius: `${4*s}px`,
                whiteSpace:   'nowrap',
                pointerEvents:'none',
                zIndex:       '3',
            });
            badge.textContent = dest;
            content.appendChild(badge);
        }

        el.appendChild(content);

        // ── Hover ──────────────────────────────────────────────────────────
        el.addEventListener('mouseenter', () => {
            el.style.filter    = 'brightness(1.12)';
            el.style.zIndex    = '10';
            el.style.boxShadow = `0 ${8*s}px ${16*s}px rgba(0,0,0,0.35)`;

            // Highlight destination square on snake/ladder hover
            if (isSnake) {
                const destNum = this.snakes[number];
                const destEl = document.getElementById(`square-${destNum}`);
                if (destEl) {
                    destEl.dataset.hoverHighlight = 'snake';
                    destEl.style.outline = `${Math.max(2, 3*s)}px solid #ff4444`;
                    destEl.style.outlineOffset = '0px';
                    destEl.style.zIndex = '9';
                }
            } else if (isLadder) {
                const destNum = this.ladders[number];
                const destEl = document.getElementById(`square-${destNum}`);
                if (destEl) {
                    destEl.dataset.hoverHighlight = 'ladder';
                    destEl.style.outline = `${Math.max(2, 3*s)}px solid #37b24d`;
                    destEl.style.outlineOffset = '0px';
                    destEl.style.zIndex = '9';
                }
            }
        });

        el.addEventListener('mouseleave', () => {
            el.style.filter    = '';
            el.style.zIndex    = '';
            el.style.boxShadow = `0 ${2*s}px ${6*s}px rgba(0,0,0,0.15)`;

            // Remove destination highlight
            if (isSnake) {
                const destNum = this.snakes[number];
                const destEl = document.getElementById(`square-${destNum}`);
                if (destEl && destEl.dataset.hoverHighlight === 'snake') {
                    delete destEl.dataset.hoverHighlight;
                    destEl.style.outline = '';
                    destEl.style.outlineOffset = '';
                    destEl.style.zIndex = '';
                }
            } else if (isLadder) {
                const destNum = this.ladders[number];
                const destEl = document.getElementById(`square-${destNum}`);
                if (destEl && destEl.dataset.hoverHighlight === 'ladder') {
                    delete destEl.dataset.hoverHighlight;
                    destEl.style.outline = '';
                    destEl.style.outlineOffset = '';
                    destEl.style.zIndex = '';
                }
            }
        });

        return el;
    }
}
