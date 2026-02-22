// ScaleManager — computes a single `scale` value from the viewport
// and applies it to the board (via BoardRenderer) and the controls bar.
//
// Key design decisions:
//   - Scale fits the board into available viewport space (minus controls)
//   - Controls bar is ALWAYS rendered at scale=1 (fixed size, never scales)
//   - No whitespace: board is centred in remaining space after controls
//   - On mobile: uses a lower minimum scale (0.4) and mobile-optimised controls height

export class ScaleManager {
    constructor(boardRenderer) {
        this.renderer = boardRenderer;

        // ── Controls bar constants (always at scale=1, never scaled) ──────
        this.CTRL_H         = 70;   // natural height of the controls bar (desktop)
        this.CTRL_H_MOBILE  = 90;   // taller controls on mobile (2-row grid)
        this.CTRL_PADDING_V = 10;   // top + bottom padding each
        this.CTRL_PADDING_H = 20;   // left + right padding each
        this.CTRL_GAP       = 20;   // gap between items
        this.OUTER_PADDING  = 16;   // page-level horizontal padding each side
        this.BOARD_MARGIN   = 12;   // breathing room around the board

        this._onResizeBound = this._onResize.bind(this);
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    _isMobile() {
        return window.innerWidth <= 600;
    }

    _getControlsHeight() {
        return this._isMobile() ? this.CTRL_H_MOBILE : this.CTRL_H;
    }

    // ── Public ─────────────────────────────────────────────────────────────

    init() {
        this._onResize();
        window.addEventListener('resize', this._onResizeBound);
    }

    destroy() {
        window.removeEventListener('resize', this._onResizeBound);
    }

    // ── Private ────────────────────────────────────────────────────────────

    _onResize() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const isMobile = this._isMobile();
        const ctrlH = this._getControlsHeight();

        const { NATURAL_BOARD_W, NATURAL_BOARD_H } = this.renderer;

        // Available space for the board
        // On mobile, use the full width with minimal padding
        const outerPad = isMobile ? 4 : this.OUTER_PADDING;
        const availW = vw - outerPad * 2;
        const availH = vh - ctrlH - this.BOARD_MARGIN * 2;

        // Scale = fit board inside available W and H, maintaining aspect ratio
        const scaleW = availW / NATURAL_BOARD_W;
        const scaleH = availH / NATURAL_BOARD_H;
        const scale  = Math.min(scaleW, scaleH);

        // Scale limits:
        // - Mobile: min 0.4 (smaller min allows more scrolling on very large boards)
        // - Desktop: min 0.7 (keeps boards readable)
        // - Max 3.0: Small boards can scale up for visibility
        const minScale = isMobile ? 0.4 : 0.7;
        const s = Math.max(minScale, Math.min(3.0, scale));

        // Store on renderer so _createSquare uses it
        this.renderer.scale = s;

        // ── Rebuild board at new scale ──────────────────────────────────
        this.renderer.create();

        // ── Controls bar: always fixed size (scale=1), never changes ───
        this._styleControls();

        // ── Centre the board in available space above controls bar ──────
        this._styleBoardPage();
    }

    // Controls bar is ALWAYS at fixed (scale=1) size
    _styleControls() {
        const controls = document.getElementById('controls');
        if (!controls) return;

        const isMobile = this._isMobile();

        // Always use fixed padding/gap regardless of board scale
        Object.assign(controls.style, {
            padding: isMobile
                ? '8px 10px'
                : `${this.CTRL_PADDING_V}px ${this.CTRL_PADDING_H}px`,
            gap: isMobile ? '6px' : `${this.CTRL_GAP}px`,
        });

        // Fixed sizes for all control elements
        const diceResult  = document.getElementById('diceResult');
        const rollDice    = document.getElementById('rollDice');
        const turnCounter = document.getElementById('turnCounter');
        const jumpInput   = document.getElementById('testJumpInput');

        if (isMobile) {
            // Mobile: compact sizes optimised for the 2-row grid in board.css
            if (diceResult) {
                diceResult.style.fontSize     = '13px';
                diceResult.style.padding      = '6px 10px';
                diceResult.style.minWidth     = '0';
                diceResult.style.borderRadius = '10px';
                diceResult.style.whiteSpace   = 'nowrap';
            }
            if (rollDice) {
                rollDice.style.padding      = '10px 8px';
                rollDice.style.fontSize     = '14px';
                rollDice.style.borderRadius = '25px';
                rollDice.style.width        = '100%';
            }
            if (turnCounter) {
                turnCounter.style.fontSize     = '13px';
                turnCounter.style.padding      = '6px 10px';
                turnCounter.style.borderRadius = '10px';
                turnCounter.style.whiteSpace   = 'nowrap';
            }
            if (jumpInput) {
                jumpInput.style.width    = '100%';
                jumpInput.style.padding  = '8px 6px';
                jumpInput.style.fontSize = '14px';
                jumpInput.style.boxSizing = 'border-box';
            }
        } else {
            // Desktop: original sizes
            if (diceResult) {
                diceResult.style.fontSize     = '18px';
                diceResult.style.padding      = '8px 16px';
                diceResult.style.minWidth     = '100px';
                diceResult.style.borderRadius = '12px';
                diceResult.style.whiteSpace   = '';
            }
            if (rollDice) {
                rollDice.style.padding      = '10px 30px';
                rollDice.style.fontSize     = '16px';
                rollDice.style.borderRadius = '50px';
                rollDice.style.width        = '';
            }
            if (turnCounter) {
                turnCounter.style.fontSize     = '16px';
                turnCounter.style.padding      = '8px 16px';
                turnCounter.style.borderRadius = '12px';
                turnCounter.style.whiteSpace   = '';
            }
            if (jumpInput) {
                jumpInput.style.width    = '80px';
                jumpInput.style.padding  = '6px';
                jumpInput.style.fontSize = '13px';
                jumpInput.style.boxSizing = '';
            }
        }

        // Player piece scales with board
        const player = document.querySelector('.player');
        if (player) {
            const s = this.renderer.scale;
            const size = Math.round(30 * s);
            player.style.width     = `${size}px`;
            player.style.height    = `${size}px`;
            player.style.zIndex    = '20';
            player.style.position  = 'absolute';
            player.style.top       = '50%';
            player.style.left      = '50%';
            player.style.transform = 'translate(-50%, -50%)';
        }
    }

    _styleBoardPage() {
        const gameContainer = document.getElementById('gameContainer');
        if (!gameContainer) return;

        const ctrlH = this._getControlsHeight();

        // Board sits centred in the space above the fixed controls bar
        Object.assign(gameContainer.style, {
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'flex-start',
            minHeight:      `calc(100vh - ${ctrlH}px)`,
            paddingBottom:  `${ctrlH + this.BOARD_MARGIN}px`,
            paddingTop:     `${this.BOARD_MARGIN}px`,
        });
    }
}