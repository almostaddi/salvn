export class ScaleManager {
    constructor(boardRenderer) {
        this.renderer = boardRenderer;

        this.CTRL_PADDING_V = 10;
        this.CTRL_PADDING_H = 20;
        this.CTRL_GAP       = 20;
        this.OUTER_PADDING  = 16;
        this.BOARD_MARGIN   = 12;

        this._onResizeBound = this._onResize.bind(this);
        this._ctrlObserver  = null;
    }

    _isMobile() {
        return window.innerWidth <= 660;
    }

    _getControlsHeight() {
        const controls = document.getElementById('controls');
        if (controls && controls.offsetHeight > 0) {
            return controls.offsetHeight;
        }
        return this._isMobile() ? 90 : 70;
    }

    init() {
        this._onResize();
        window.addEventListener('resize', this._onResizeBound);

        // Watch the controls bar for size changes (e.g. wrapping on narrow screens)
        // and re-run layout when it changes
        const controls = document.getElementById('controls');
        if (controls && window.ResizeObserver) {
            if (this._ctrlObserver) this._ctrlObserver.disconnect();
            this._ctrlObserver = new ResizeObserver(() => {
                this._styleBoardPage();
            });
            this._ctrlObserver.observe(controls);
        }
    }

    destroy() {
        window.removeEventListener('resize', this._onResizeBound);
        if (this._ctrlObserver) {
            this._ctrlObserver.disconnect();
            this._ctrlObserver = null;
        }
    }

    _onResize() {
        const isMobile = this._isMobile();

        // Style controls first so CSS has applied before we measure
        this._styleControls();

        // Defer measurement by one rAF so the browser has painted the controls
        requestAnimationFrame(() => {
            this._computeAndApply(isMobile);
        });
    }

    _computeAndApply(isMobile) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const ctrlH = this._getControlsHeight();

        const { NATURAL_BOARD_W, NATURAL_BOARD_H } = this.renderer;

        const outerPad = isMobile ? 4 : this.OUTER_PADDING;
        const availW = vw - outerPad * 2;
        const availH = vh - ctrlH - this.BOARD_MARGIN * 2;

        const scaleW = availW / NATURAL_BOARD_W;
        const scaleH = availH / NATURAL_BOARD_H;
        const scale  = Math.min(scaleW, scaleH);

        const minScale = isMobile ? 0.4 : 0.7;

        const numRows = this.renderer.totalSquares / 10;
        const maxScale = numRows <= 4 ? 1.0
                       : numRows <= 6 ? 1.2
                       : numRows <= 7 ? 1.4
                       : 3.0;

        const s = Math.max(minScale, Math.min(maxScale, scale));

        this.renderer.scale = s;
        this.renderer.create();

        // Re-place player piece after board rebuild
        const player = document.querySelector('.player');
        if (player) {
            const size = Math.round(30 * s);
            player.style.width     = `${size}px`;
            player.style.height    = `${size}px`;
            player.style.zIndex    = '20';
            player.style.position  = 'absolute';
            player.style.top       = '50%';
            player.style.left      = '50%';
            player.style.transform = 'translate(-50%, -50%)';
        }

        this._styleBoardPage();
    }

    _styleControls() {
        const controls = document.getElementById('controls');
        if (!controls) return;

        const isMobile = this._isMobile();

        if (isMobile) {
            // Clear any inline overrides — let board.css grid handle everything
            controls.style.padding = '';
            controls.style.gap     = '';

            ['diceResult', 'rollDice', 'turnCounter', 'testJumpInput'].forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                el.style.fontSize     = '';
                el.style.padding      = '';
                el.style.minWidth     = '';
                el.style.width        = '';
                el.style.borderRadius = '';
                el.style.whiteSpace   = '';
                el.style.boxSizing    = '';
            });

        } else {
            controls.style.padding = `${this.CTRL_PADDING_V}px ${this.CTRL_PADDING_H}px`;
            controls.style.gap     = `${this.CTRL_GAP}px`;

            const diceResult  = document.getElementById('diceResult');
            const rollDice    = document.getElementById('rollDice');
            const turnCounter = document.getElementById('turnCounter');
            const jumpInput   = document.getElementById('testJumpInput');

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
                jumpInput.style.width     = '80px';
                jumpInput.style.padding   = '6px';
                jumpInput.style.fontSize  = '13px';
                jumpInput.style.boxSizing = '';
            }
        }
    }

    _styleBoardPage() {
        const gameContainer = document.getElementById('gameContainer');
        if (!gameContainer) return;

        const ctrlH  = this._getControlsHeight();
        const availH = window.innerHeight - ctrlH - this.BOARD_MARGIN * 2;
        const boardH = this.renderer.NATURAL_BOARD_H * this.renderer.scale;
        const boardFitsInView = boardH <= availH;

        Object.assign(gameContainer.style, {
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: boardFitsInView ? 'center' : 'flex-start',
            minHeight:      `calc(100vh - ${ctrlH}px)`,
            paddingBottom:  `${ctrlH + this.BOARD_MARGIN}px`,
            paddingTop:     `${this.BOARD_MARGIN}px`,
        });
    }
}