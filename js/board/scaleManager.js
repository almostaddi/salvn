// ScaleManager — computes a single `scale` value from the viewport
// and applies it to the board (via BoardRenderer) and the controls bar.
//
// It is completely self-contained: it reads DOM measurements once on
// init, then recalculates on every resize.  It deliberately touches
// ONLY #board, #controls, and #gameContainer — the menu and task pages
// are never touched.

export class ScaleManager {
    constructor(boardRenderer) {
        this.renderer = boardRenderer;

        // ── Constants (all unscaled / scale-1 px) ──────────────────────

        // Controls bar unscaled dimensions
        this.CTRL_H          = 70;   // approx natural height of the controls bar
        this.CTRL_PADDING_V  = 10;   // top + bottom padding (each)
        this.CTRL_PADDING_H  = 20;   // left + right padding (each)
        this.CTRL_GAP        = 20;   // gap between control items
        this.OUTER_PADDING   = 16;   // page-level horizontal padding each side

        // After how many px of available height should we start scaling?
        // (board natural height + controls natural height + some breathing room)
        this._onResizeBound = this._onResize.bind(this);
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

        const { SQ, EXTRA, ROW_GAP, COL_GAP,
                NATURAL_BOARD_W, NATURAL_BOARD_H } = this.renderer;

        // Available width (minus outer page padding)
        const availW = vw - this.OUTER_PADDING * 2;

        // Available height for the board portion
        // (viewport minus controls bar, with a little breathing room)
        const ctrlNaturalH = this.CTRL_H;
        const availH = vh - ctrlNaturalH - 24; // 24px breathing room

        // Scale = fit the board inside available W and available H
        const scaleW = availW / NATURAL_BOARD_W;
        const scaleH = availH / NATURAL_BOARD_H;
        const scale  = Math.min(scaleW, scaleH);

        // Don't shrink below 0.25 — board becomes unusable
        const s = Math.max(0.25, scale);

        // Store on renderer so _createSquare uses it
        this.renderer.scale = s;

        // ── Apply to board ────────────────────────────────────────────
        this.renderer.create();

        // ── Apply to controls bar ────────────────────────────────────
        this._styleControls(s);

        // ── Centre the board page vertically ─────────────────────────
        this._styleBoardPage(s);
    }

    _styleControls(s) {
        const controls = document.getElementById('controls');
        if (!controls) return;

        const paddingV = Math.round(this.CTRL_PADDING_V * s);
        const paddingH = Math.round(this.CTRL_PADDING_H * s);
        const gap      = Math.round(this.CTRL_GAP * s);

        Object.assign(controls.style, {
            padding: `${paddingV}px ${paddingH}px`,
            gap:     `${gap}px`,
        });

        // Scale the font / padding of each child button / input / div
        const diceResult  = document.getElementById('diceResult');
        const rollDice    = document.getElementById('rollDice');
        const turnCounter = document.getElementById('turnCounter');
        const jumpInput   = document.getElementById('testJumpInput');

        if (diceResult) {
            diceResult.style.fontSize    = `${Math.round(18 * s)}px`;
            diceResult.style.padding     = `${Math.round(8*s)}px ${Math.round(16*s)}px`;
            diceResult.style.minWidth    = `${Math.round(100 * s)}px`;
            diceResult.style.borderRadius= `${Math.round(12*s)}px`;
        }
        if (rollDice) {
            rollDice.style.padding   = `${Math.round(10*s)}px ${Math.round(30*s)}px`;
            rollDice.style.fontSize  = `${Math.round(16*s)}px`;
            rollDice.style.borderRadius = '50px';
        }
        if (turnCounter) {
            turnCounter.style.fontSize    = `${Math.round(16*s)}px`;
            turnCounter.style.padding     = `${Math.round(8*s)}px ${Math.round(16*s)}px`;
            turnCounter.style.borderRadius= `${Math.round(12*s)}px`;
        }
        if (jumpInput) {
            jumpInput.style.width    = `${Math.round(80 * s)}px`;
            jumpInput.style.padding  = `${Math.round(6*s)}px`;
            jumpInput.style.fontSize = `${Math.round(13*s)}px`;
        }

        // Also scale the player piece
        const player = document.querySelector('.player');
        if (player) {
            const size = Math.round(30 * s);
            player.style.width  = `${size}px`;
            player.style.height = `${size}px`;
        }
    }

    _styleBoardPage(s) {
        const gameContainer = document.getElementById('gameContainer');
        if (!gameContainer) return;

        // Account for scaled controls bar height so the board
        // sits centred in the remaining space above it.
        const ctrlH = Math.round(this.CTRL_H * s);
        Object.assign(gameContainer.style, {
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            minHeight:      `calc(100vh - ${ctrlH}px)`,
            paddingBottom:  `${ctrlH + 8}px`,
        });
    }
}
