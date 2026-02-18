// ScaleManager — computes a single `scale` value from the viewport
// and applies it to the board (via BoardRenderer) and the controls bar.
//
// Key design decisions:
//   - Scale fits the board into available viewport space (minus controls)
//   - Controls bar is ALWAYS rendered at scale=1 (fixed size, never scales)
//   - No whitespace: board is centred in remaining space after controls

export class ScaleManager {
    constructor(boardRenderer) {
        this.renderer = boardRenderer;

        // ── Controls bar constants (always at scale=1, never scaled) ──────
        this.CTRL_H         = 88;   // natural height of the controls bar (increased)
        this.CTRL_PADDING_V = 12;   // top + bottom padding each
        this.CTRL_PADDING_H = 20;   // left + right padding each
        this.CTRL_GAP       = 20;   // gap between items
        this.OUTER_PADDING  = 16;   // page-level horizontal padding each side
        this.BOARD_MARGIN   = 12;   // breathing room around the board
        this.BOARD_SCALE_FACTOR = 0.88; // Shrink board to 88% of max fit

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

        const { NATURAL_BOARD_W, NATURAL_BOARD_H } = this.renderer;

        // Available space for the board
        const availW = vw - this.OUTER_PADDING * 2;
        const availH = vh - this.CTRL_H - this.BOARD_MARGIN * 2;

        // Scale = fit board inside available W and H, maintaining aspect ratio
        const scaleW = availW / NATURAL_BOARD_W;
        const scaleH = availH / NATURAL_BOARD_H;
        const scale  = Math.min(scaleW, scaleH);

        // Apply board scale factor to make it slightly smaller
        const s = Math.max(0.2, Math.min(3.0, scale * this.BOARD_SCALE_FACTOR));

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

        Object.assign(controls.style, {
            padding: `${this.CTRL_PADDING_V}px ${this.CTRL_PADDING_H}px`,
            gap:     `${this.CTRL_GAP}px`,
        });

        // Larger sizes for all control elements
        const diceResult  = document.getElementById('diceResult');
        const rollDice    = document.getElementById('rollDice');
        const turnCounter = document.getElementById('turnCounter');
        const jumpInput   = document.getElementById('testJumpInput');

        if (diceResult) {
            diceResult.style.fontSize     = '20px';
            diceResult.style.padding      = '10px 20px';
            diceResult.style.minWidth     = '120px';
            diceResult.style.borderRadius = '14px';
        }
        if (rollDice) {
            rollDice.style.padding      = '13px 36px';
            rollDice.style.fontSize     = '19px';
            rollDice.style.borderRadius = '50px';
        }
        if (turnCounter) {
            turnCounter.style.fontSize     = '20px';
            turnCounter.style.padding      = '10px 20px';
            turnCounter.style.borderRadius = '14px';
        }
        if (jumpInput) {
            jumpInput.style.width    = '90px';
            jumpInput.style.padding  = '8px';
            jumpInput.style.fontSize = '15px';
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

        Object.assign(gameContainer.style, {
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            minHeight:      `calc(100vh - ${this.CTRL_H}px)`,
            paddingBottom:  `${this.CTRL_H + this.BOARD_MARGIN}px`,
            paddingTop:     `${this.BOARD_MARGIN}px`,
        });
    }
}
