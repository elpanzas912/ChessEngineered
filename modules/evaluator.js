const PIECE_VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const ENGINE_SCRIPT_URL = new URL('../lib/stockfish/stockfish-18-lite-single.js', import.meta.url);
const ENGINE_WASM_URL = new URL('../lib/stockfish/stockfish-18-lite-single.wasm', import.meta.url);
const ENGINE_DEPTH = 10;

let engine = null;
let engineReady = false;
let engineFailed = false;
let pendingFen = null;
let lastFen = null;
let activeTurn = 'w';
let latestScore = 0;
let requestTimer = null;
let startupTimer = null;

function getEngineUrl() {
    const url = new URL(ENGINE_SCRIPT_URL.href);
    url.hash = `${ENGINE_WASM_URL.href},worker`;
    return url;
}

function fallbackEvaluate(game) {
    if (!game) return 0;
    const board = game.board();
    let score = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const sq = board[r][c];
            if (!sq) continue;
            score += (sq.color === 'w' ? 1 : -1) * PIECE_VAL[sq.type];
        }
    }
    return score;
}

function getMateScore(mate) {
    const sign = mate >= 0 ? 1 : -1;
    return sign * (10000 - Math.min(9900, Math.abs(mate) * 100));
}

function parseEngineScore(line) {
    const cp = line.match(/\bscore cp (-?\d+)/);
    if (cp) return Number(cp[1]);

    const mate = line.match(/\bscore mate (-?\d+)/);
    if (mate) return getMateScore(Number(mate[1]));

    return null;
}

function ensureEngine() {
    if (engine || engineFailed) return;

    try {
        engine = new Worker(getEngineUrl());
        startupTimer = setTimeout(() => {
            if (engineReady || engineFailed) return;
            engineFailed = true;
            try { engine?.terminate(); } catch (e) {}
            engine = null;
            renderEval(fallbackEvaluate(window.game), true);
        }, 12000);
        engine.onmessage = event => {
            const line = String(event.data || '');
            if (line === 'uciok') {
                engine.postMessage('setoption name Hash value 16');
                engine.postMessage('isready');
                return;
            }
            if (line === 'readyok') {
                engineReady = true;
                clearTimeout(startupTimer);
                if (pendingFen) analyzeFen(pendingFen);
                return;
            }

            const score = parseEngineScore(line);
            if (score === null) return;

            latestScore = activeTurn === 'b' ? -score : score;
            renderEval(latestScore, false);
        };
        engine.onerror = () => {
            engineFailed = true;
            clearTimeout(startupTimer);
            engine = null;
            renderEval(fallbackEvaluate(window.game), true);
        };
        engine.postMessage('uci');
    } catch (e) {
        engineFailed = true;
        renderEval(fallbackEvaluate(window.game), true);
    }
}

function analyzeFen(fen) {
    if (!fen) return;
    ensureEngine();
    pendingFen = fen;

    if (!engine || !engineReady) {
        renderEval(latestScore, false, '...');
        return;
    }

    pendingFen = null;
    lastFen = fen;
    activeTurn = fen.split(' ')[1] || 'w';
    engine.postMessage('stop');
    engine.postMessage(`position fen ${fen}`);
    engine.postMessage(`go depth ${ENGINE_DEPTH}`);
}

function formatScore(score) {
    if (Math.abs(score) > 9000) {
        const mate = Math.max(1, Math.round((10000 - Math.abs(score)) / 100));
        return `${score > 0 ? '+' : '-'}M${mate}`;
    }

    const pawns = score / 100;
    return pawns >= 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
}

function renderEval(score, isFallback = false, labelOverride = null) {
    const barEl = document.getElementById('evalBar');
    const whiteEl = document.getElementById('evalBarWhite');
    const blackEl = document.getElementById('evalBarBlack');
    const scoreEl = document.getElementById('evalBarScore');
    if (!barEl || !whiteEl || !blackEl || !scoreEl) return;

    const clamped = Math.max(-1000, Math.min(1000, score));
    const whitePct = Math.max(3, Math.min(97, 50 + (clamped / 1000) * 45));
    const blackPct = 100 - whitePct;

    barEl.style.setProperty('--white-pct', `${whitePct}%`);
    barEl.style.setProperty('--black-pct', `${blackPct}%`);
    whiteEl.style.removeProperty('height');
    blackEl.style.removeProperty('height');
    whiteEl.style.removeProperty('width');
    blackEl.style.removeProperty('width');

    scoreEl.textContent = labelOverride || formatScore(score);
    scoreEl.classList.toggle('is-fallback', isFallback);
}

export function evaluatePosition(game) {
    return fallbackEvaluate(game);
}

export function updateEvalBar() {
    if (!window.game) return;
    const fen = window.game.fen();

    clearTimeout(requestTimer);
    requestTimer = setTimeout(() => {
        if (fen === lastFen && engineReady) return;
        analyzeFen(fen);
    }, 80);
}
