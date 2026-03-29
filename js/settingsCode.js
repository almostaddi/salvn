const SETTINGS_VERSION = 1;

const SET_MAP =    { dressup: 'a', anal: 'b', digging: 'c', teaseanddenial: 'd' };
const SET_UNMAP =  Object.fromEntries(Object.entries(SET_MAP).map(([k,v]) => [v,k]));

const TOY_MAP =    { pegs: 'a', silly_shirt: 'b', wristband: 'c', hand: 'd', vibe: 'e',
                     stick_a: 'f', metal_stick: 'g', tail: 'h', cage: 'i', stick_m: 'j' };
const TOY_UNMAP =  Object.fromEntries(Object.entries(TOY_MAP).map(([k,v]) => [v,k]));

const DIFF_MAP =   { easy: 'e', medium: 'm', hard: 'h' };
const DIFF_UNMAP = Object.fromEntries(Object.entries(DIFF_MAP).map(([k,v]) => [v,k]));

const PRON_MAP =   { 'he/him': 'a', 'she/her': 'b', 'they/them': 'c', 'it/its': 'd' };
const PRON_UNMAP = Object.fromEntries(Object.entries(PRON_MAP).map(([k,v]) => [v,k]));

const MODE_MAP =   { classic: 'c', random: 'r', custom: 'x' };
const MODE_UNMAP = Object.fromEntries(Object.entries(MODE_MAP).map(([k,v]) => [v,k]));

function encodeToyKey(key) {
    const idx = key.indexOf('_');
    return `${SET_MAP[key.substring(0, idx)] ?? key.substring(0, idx)}_${TOY_MAP[key.substring(idx + 1)] ?? key.substring(idx + 1)}`;
}

function decodeToyKey(key) {
    const idx = key.indexOf('_');
    return `${SET_UNMAP[key.substring(0, idx)] ?? key.substring(0, idx)}_${TOY_UNMAP[key.substring(idx + 1)] ?? key.substring(idx + 1)}`;
}

export function exportSettingsCode() {
    const gs = window.GAME_STATE;
    const s = {};

    // ── Player info ────────────────────────────────────────────────────────
    if (gs.playerName)       s.n  = gs.playerName;
    if (gs.playerNicknames)  s.nn = gs.playerNicknames;
    if (gs.domName)          s.dn = gs.domName;

    const pronCode = PRON_MAP[gs.playerPronouns];
    if (pronCode && pronCode !== 'a') s.p = pronCode; // 'a' = he/him default

    // bodyType — only store non-default values
    // default: pe=true, pu=false, breasts=false, ba=true
    const bt = gs.bodyType || {};
    const btOut = {};
    if (bt.pe      === false) btOut.pe = false;
    if (bt.pu      === true)  btOut.pu = true;
    if (bt.breasts === true)  btOut.br = true;
    if (bt.ba      === false) btOut.ba = false;
    if (Object.keys(btOut).length) s.bt = btOut;

    // ── Board ──────────────────────────────────────────────────────────────
    if (gs.totalSquares && gs.totalSquares !== 100) s.sq = gs.totalSquares;

    const modeCode = MODE_MAP[gs.snakesLaddersMode];
    if (modeCode && modeCode !== 'c') s.m = modeCode;

    const diffCode = DIFF_MAP[gs.snakesLaddersDifficulty];
    if (diffCode && diffCode !== 'm') s.d = diffCode;

    if (gs.snakesLaddersMode === 'custom') {
        if (Object.keys(gs.customSnakes  || {}).length) s.cs = gs.customSnakes;
        if (Object.keys(gs.customLadders || {}).length) s.cl = gs.customLadders;
    }

    // ── Selected sets (only checked ones) ─────────────────────────────────
    const selectedSets = (gs.selectedSets || []);
    if (selectedSets.length) {
        s.ss = selectedSets.map(id => SET_MAP[id] ?? id);
    }

    // ── Toys — only store checked toys, only store set info for enabled sets ─
    const toyChecked    = gs.toyChecked    || {};
    const toySetEnabled = gs.toySetEnabled || {};
    const toyQuantities = gs.toyQuantities || {};
    const toyDifficulties = gs.toyDifficulties || {};
    const toyModifiers  = gs.toyModifiers  || {};

    const toys = {};

    for (const [toyId, checked] of Object.entries(toyChecked)) {
        if (!checked) continue; // skip unchecked toys entirely

        const toyCode = TOY_MAP[toyId] ?? toyId;
        const toyEntry = {};

        // Cage specific
        if (toyId === 'cage') {
            if (gs.cageWorn)   toyEntry.w = 1;
            if (gs.cageLocked) toyEntry.l = 1;
        }

        // Per-set info — only for enabled sets that are also selected
        const sets = {};
        for (const setId of selectedSets) {
            const toyKey = `${setId}_${toyId}`;
            if (toySetEnabled[toyKey] === false) continue; // skip disabled set/toy combos

            const setEntry = {};

            // Quantity — only if not default (1)
            const qty = toyQuantities[toyKey];
            if (qty && qty !== 1) setEntry.q = qty;

            // Difficulty — only if not default (medium)
            const diff = toyDifficulties[toyKey];
            if (diff && diff !== 'medium') setEntry.d = DIFF_MAP[diff] ?? diff;

            // Add/remove modifiers — only if toy has add/remove tasks
            // and only if values differ from defaults (add:10, remove:20)
            const mods = toyModifiers[toyKey];
            if (mods) {
                const modsOut = {};
                if (mods.addChance    !== undefined && mods.addChance    !== 10)  modsOut.a = mods.addChance;
                if (mods.removeChance !== undefined && mods.removeChance !== 20)  modsOut.r = mods.removeChance;
                if (Object.keys(modsOut).length) setEntry.m = modsOut;
            }

            const setCode = SET_MAP[setId] ?? setId;
            if (Object.keys(setEntry).length) sets[setCode] = setEntry;
        }

        if (Object.keys(sets).length) toyEntry.s = sets;
        toys[toyCode] = toyEntry;
    }

    if (Object.keys(toys).length) s.t = toys;

    // ── Prize settings — only if non-default ──────────────────────────────
    const ps = gs.prizeSettings || {};
    if (ps.full !== 33 || ps.ruin !== 33 || ps.denied !== 34) {
        s.pr = [ps.full, ps.ruin, ps.denied];
    }

    // ── Final challenge settings ───────────────────────────────────────────
    const fc = gs.finalChallengeSettings || {};
    if (fc.stroking !== 33 || fc.vibe !== 33 || fc.anal !== 34) {
        s.fc = [fc.stroking, fc.vibe, fc.anal];
    }

    // Final challenge difficulties — only if non-default
    const fcd = gs.finalChallengeDifficulties || {};
    const fcdOut = {};
    if (fcd.stroking && fcd.stroking !== 'medium') fcdOut.s = DIFF_MAP[fcd.stroking];
    if (fcd.vibe     && fcd.vibe     !== 'medium') fcdOut.v = DIFF_MAP[fcd.vibe];
    if (fcd.anal     && fcd.anal     !== 'medium') fcdOut.a = DIFF_MAP[fcd.anal];
    if (Object.keys(fcdOut).length) s.fcd = fcdOut;

    // Final challenge types — only store checked ones
    // And only include their chance if checked
    const fct  = gs.finalChallengeTypes         || {};
    const fcmc = gs.finalChallengeModifierChances || {};
    const fctOut = {};
    for (const [key, checked] of Object.entries(fct)) {
        if (!checked) continue;
        // Short key map for challenge types
        const shortKey = key
            .replace('stroking_', 's_')
            .replace('vibe_', 'v_')
            .replace('anal_', 'a_')
            .replace('icyhot', 'ih')
            .replace('icewater', 'iw')
            .replace('ballsqueeze', 'bs')
            .replace('2finger', '2f')
            .replace('ktb', 'k');
        const chance = fcmc[key];
        fctOut[shortKey] = (chance !== undefined && chance !== 10) ? chance : 1; // 1 = checked at default
    }
    if (Object.keys(fctOut).length) s.fct = fctOut;

    // Final challenge modifiers (CE, PF) — only if checked
    const fcm = gs.finalChallengeModifiers || {};
    const fcmOut = {};
    if (fcm.ce) {
        fcmOut.ce = (fcmc.ce !== undefined && fcmc.ce !== 10) ? fcmc.ce : 1;
    }
    if (fcm.pf) {
        fcmOut.pf = (fcmc.pf !== undefined && fcmc.pf !== 10) ? fcmc.pf : 1;
    }
    if (Object.keys(fcmOut).length) s.fcm = fcmOut;

    const payload = JSON.stringify({ v: SETTINGS_VERSION, s });
    return LZString.compressToEncodedURIComponent(payload);
}

export function importSettingsCode(code) {
    let payload;
    try {
        const decompressed = LZString.decompressFromEncodedURIComponent(code.trim());
        if (!decompressed) throw new Error('null');
        payload = JSON.parse(decompressed);
    } catch {
        return { success: false, error: 'Invalid code — could not be read.' };
    }

    if (!payload.v || !payload.s) {
        return { success: false, error: 'Invalid code — missing data.' };
    }
    if (payload.v > SETTINGS_VERSION) {
        return { success: false, error: 'Code was made with a newer version of the game.' };
    }

    const s   = payload.s;
    const gs  = window.GAME_STATE;

    // ── Player info ────────────────────────────────────────────────────────
    gs.playerName       = s.n  || '';
    gs.playerNicknames  = s.nn || '';
    gs.domName          = s.dn || '';
    gs.playerPronouns   = PRON_UNMAP[s.p] ?? 'he/him';

    // bodyType — start from defaults, apply overrides
    gs.bodyType = { pe: true, pu: false, breasts: false, ba: true };
    if (s.bt) {
        if (s.bt.pe !== undefined) gs.bodyType.pe      = s.bt.pe;
        if (s.bt.pu !== undefined) gs.bodyType.pu      = s.bt.pu;
        if (s.bt.br !== undefined) gs.bodyType.breasts = s.bt.br;
        if (s.bt.ba !== undefined) gs.bodyType.ba      = s.bt.ba;
    }

    // ── Board ──────────────────────────────────────────────────────────────
    gs.totalSquares          = s.sq ?? 100;
    gs.snakesLaddersMode     = MODE_UNMAP[s.m] ?? 'classic';
    gs.snakesLaddersDifficulty = DIFF_UNMAP[s.d] ?? 'medium';
    gs.customSnakes          = s.cs || {};
    gs.customLadders         = s.cl || {};

    // ── Selected sets ──────────────────────────────────────────────────────
    gs.selectedSets = (s.ss || []).map(c => SET_UNMAP[c] ?? c);

    // ── Toys ───────────────────────────────────────────────────────────────
    // Reset all toy state first
    gs.toyChecked     = {};
    gs.toySetEnabled  = {};
    gs.toyQuantities  = {};
    gs.toyDifficulties = {};
    gs.toyModifiers   = {};
    gs.cageWorn       = false;
    gs.cageLocked     = false;

    const toys = s.t || {};
    for (const [toyCode, toyEntry] of Object.entries(toys)) {
        const toyId = TOY_UNMAP[toyCode] ?? toyCode;

        // Mark as checked
        gs.toyChecked[toyId] = true;

        // Cage specific
        if (toyId === 'cage') {
            gs.cageWorn   = !!toyEntry.w;
            gs.cageLocked = !!toyEntry.l;
        }

        // Per-set info
        const sets = toyEntry.s || {};
        for (const setId of gs.selectedSets) {
            const setCode = SET_MAP[setId] ?? setId;
            const toyKey  = `${setId}_${toyId}`;
            const setEntry = sets[setCode] || {};

            // Everything present = enabled
            gs.toySetEnabled[toyKey]   = true;
            gs.toyQuantities[toyKey]   = setEntry.q ?? 1;
            gs.toyDifficulties[toyKey] = DIFF_UNMAP[setEntry.d] ?? 'medium';

            const mods = setEntry.m || {};
            gs.toyModifiers[toyKey] = {
                addChance:    mods.a ?? 10,
                removeChance: mods.r ?? 20,
            };
        }
    }

    // Any toy not in the export is unchecked — already handled by reset above

    // ── Prize settings ─────────────────────────────────────────────────────
    if (s.pr) {
        gs.prizeSettings = { full: s.pr[0], ruin: s.pr[1], denied: s.pr[2] };
    } else {
        gs.prizeSettings = { full: 33, ruin: 33, denied: 34 };
    }

    // ── Final challenge ────────────────────────────────────────────────────
    if (s.fc) {
        gs.finalChallengeSettings = { stroking: s.fc[0], vibe: s.fc[1], anal: s.fc[2] };
    } else {
        gs.finalChallengeSettings = { stroking: 33, vibe: 33, anal: 34 };
    }

    // Difficulties
    const fcd = s.fcd || {};
    gs.finalChallengeDifficulties = {
        stroking: DIFF_UNMAP[fcd.s] ?? 'medium',
        vibe:     DIFF_UNMAP[fcd.v] ?? 'medium',
        anal:     DIFF_UNMAP[fcd.a] ?? 'medium',
    };

    // Challenge types — reset all to false first, then apply checked ones
    const FCT_SHORT_TO_KEY = {
        's_ih': 'stroking_icyhot',  's_iw': 'stroking_icewater',
        's_k':  'stroking_ktb',     's_bs': 'stroking_ballsqueeze',
        's_2f': 'stroking_2finger', 'v_ih': 'vibe_icyhot',
        'v_iw': 'vibe_icewater',    'a_v':  'anal_vibe',
    };

    gs.finalChallengeTypes = {
        stroking_icyhot: false, stroking_icewater: false, stroking_ktb: false,
        stroking_ballsqueeze: false, stroking_2finger: false,
        vibe_icyhot: false, vibe_icewater: false, anal_vibe: false
    };
    gs.finalChallengeModifierChances = {
        stroking_icyhot: 10, stroking_icewater: 10, stroking_ktb: 10,
        stroking_ballsqueeze: 10, stroking_2finger: 10,
        vibe_icyhot: 10, vibe_icewater: 10, anal_vibe: 10,
        ce: 10, pf: 10
    };

    const fct = s.fct || {};
    for (const [shortKey, val] of Object.entries(fct)) {
        const fullKey = FCT_SHORT_TO_KEY[shortKey];
        if (!fullKey) continue;
        gs.finalChallengeTypes[fullKey] = true;
        if (val !== 1) gs.finalChallengeModifierChances[fullKey] = val;
    }

    // Modifiers (CE, PF)
    gs.finalChallengeModifiers = { ce: false, pf: false };
    const fcm = s.fcm || {};
    if (fcm.ce) {
        gs.finalChallengeModifiers.ce = true;
        if (fcm.ce !== 1) gs.finalChallengeModifierChances.ce = fcm.ce;
    }
    if (fcm.pf) {
        gs.finalChallengeModifiers.pf = true;
        if (fcm.pf !== 1) gs.finalChallengeModifierChances.pf = fcm.pf;
    }

    gs.challengeTypesExpanded = false;
    gs.setDetailsExpanded     = false;

    return { success: true };
}