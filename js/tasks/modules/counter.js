// js/tasks/modules/counter.js
// General-purpose live counter for VN task stages.
//
// ── Usage ─────────────────────────────────────────────────────────────────────
//
//   import Counter from '../modules/counter.js';
//
//   const counter = new Counter({ label: 'Spanks given' });
//
//   // In your stage:
//   leftModule: {
//       title: 'Progress',
//       content: (data) => counter.html(data.count, data.target)
//   },
//   buttons: [
//       {
//           text: '▶ Press',
//           type: 'choice',
//           execute(data) {
//               data.count++;
//               counter.update(data.count, data.target);
//           },
//           nextStage: null
//       },
//       { text: '✓ Done', type: 'next', nextStage: 'next_stage' }
//   ]
//
// No onMount wiring needed — buttons are found lazily on the first update() call.
//
// ── Options ───────────────────────────────────────────────────────────────────
//
//   new Counter({
//       label:           'Pegs on Ba',
//       barColor:        'linear-gradient(to right, #51cf66, #37b24d)',
//       tickButtonIndex: 0,                                  // default 0
//       doneButtonIndex: 1,                                  // default 1
//       tickLabel:       (c, t) => `🖇️ Attach Peg (${c}/${t})`,
//       tickDoneLabel:   (t)    => `✓ All Done (${t}/${t})`,
//       canDone:         (c, t) => c >= t,                   // default: must reach target
//   })

export default class Counter {
    constructor(opts = {}) {
        this._label    = opts.label           ?? 'Complete';
        this._barColor = opts.barColor        ?? 'linear-gradient(to right, #667eea, #764ba2)';
        this._tickIdx  = opts.tickButtonIndex ?? 0;
        this._doneIdx  = opts.doneButtonIndex ?? 1;
        this._tickLabel  = opts.tickLabel     ?? ((c, t) => `▶ ${c}/${t}`);
        this._tickDone   = opts.tickDoneLabel ?? ((t)    => `✓ ${t}/${t}`);
        this._canDone    = opts.canDone       ?? ((c, t) => c >= t);
    }

    // ── HTML ──────────────────────────────────────────────────────────────────

    /** Returns panel HTML. Use as leftModule.content(data). */
    html(current, target) {
        const c   = current ?? 0;
        const t   = target  ?? 0;
        const pct = t > 0 ? Math.round((c / t) * 100) : 0;
        return `
            <div style="text-align:center; padding:20px;">
                <div style="font-size:48px; font-weight:bold; color:#667eea;">
                    ${c}/${t}
                </div>
                <div style="margin-top:10px; font-size:14px; color:#666;">
                    ${this._label}
                </div>
                <div style="
                    width:100%; height:10px;
                    background:#e9ecef; border-radius:5px;
                    margin-top:15px; overflow:hidden;">
                    <div style="
                        width:${pct}%; height:100%;
                        background:${this._barColor};
                        transition:width 0.3s ease;"></div>
                </div>
            </div>`;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Refresh the panel and sync both buttons.
     * Buttons are looked up fresh each call — no caching, no timing issues.
     * Call this from your tick button's execute(data) after mutating the count.
     */
    update(current, target) {
        this._refreshPanel(current, target);
        this._syncTick(current, target);
        this._syncDone(current, target);
    }

    // ── Private ───────────────────────────────────────────────────────────────

    _buttons() {
        const area = document.querySelector('.vn-button-area');
        if (!area) return [];
        return Array.from(area.querySelectorAll('button'));
    }

    _refreshPanel(current, target) {
        const el = document.querySelector('.vn-left-module .vn-module-content');
        if (el) el.innerHTML = this.html(current, target);
    }

    _syncTick(current, target) {
        const btn = this._buttons()[this._tickIdx];
        if (!btn) return;
        const exhausted = current >= target;
        btn.textContent = exhausted
            ? this._tickDone(target)
            : this._tickLabel(current, target);
        btn.disabled = exhausted;
    }

    _syncDone(current, target) {
        const btn = this._buttons()[this._doneIdx];
        if (!btn) return;
        btn.disabled = !this._canDone(current, target);
    }
}