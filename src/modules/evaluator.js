const PIECE_VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const EVAL_API_URL = 'https://chess-api.com/v1';
const EVAL_DEPTH = 8;
const EVAL_THINK_MS = 50;

let requestTimer = null;
let activeRequest = null;
let requestSeq = 0;
let lastFen = null;

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

    return score / 100;
}

function getMateScore(mate) {
    const sign = mate >= 0 ? 1 : -1;
    return sign * (100 - Math.min(99, Math.abs(mate)));
}

function formatScore(score, mate = null) {
    if (mate !== null && mate !== undefined) {
        const absMate = Math.abs(Number(mate));
        return `${Number(mate) >= 0 ? '+' : '-'}M${absMate}`;
    }

    return score >= 0 ? `+${score.toFixed(1)}` : score.toFixed(1);
}

function normalizeApiScore(data) {
    if (data?.mate !== null && data?.mate !== undefined) {
        return getMateScore(Number(data.mate));
    }

    if (Number.isFinite(Number(data?.eval))) {
        return Number(data.eval);
    }

    if (Number.isFinite(Number(data?.centipawns))) {
        return Number(data.centipawns) / 100;
    }

    return null;
}

function renderEval(score, options = {}) {
    const barEl = document.getElementById('evalBar');
    const whiteEl = document.getElementById('evalBarWhite');
    const blackEl = document.getElementById('evalBarBlack');
    const scoreEl = document.getElementById('evalBarScore');
    if (!barEl || !whiteEl || !blackEl || !scoreEl) return;

    const clamped = Math.max(-10, Math.min(10, score));
    const whitePct = Math.max(3, Math.min(97, 50 + (clamped / 10) * 45));
    const blackPct = 100 - whitePct;

    barEl.style.setProperty('--white-pct', `${whitePct}%`);
    barEl.style.setProperty('--black-pct', `${blackPct}%`);
    whiteEl.style.removeProperty('height');
    blackEl.style.removeProperty('height');
    whiteEl.style.removeProperty('width');
    blackEl.style.removeProperty('width');

    scoreEl.textContent = options.label || formatScore(score, options.mate);
    scoreEl.classList.toggle('is-fallback', Boolean(options.fallback));
    scoreEl.classList.toggle('is-loading', Boolean(options.loading));
}

async function fetchApiEval(fen, seq) {
    if (activeRequest) activeRequest.abort();

    activeRequest = new AbortController();
    const controller = activeRequest;

    try {
        const response = await fetch(EVAL_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fen,
                variants: 1,
                depth: EVAL_DEPTH,
                maxThinkingTime: EVAL_THINK_MS
            }),
            signal: controller.signal
        });

        if (!response.ok) throw new Error(`Eval API ${response.status}`);

        const data = await response.json();
        if (seq !== requestSeq) return;

        const score = normalizeApiScore(data);
        if (score === null) throw new Error('Missing eval score');

        renderEval(score, { mate: data.mate });
    } catch (e) {
        if (e.name === 'AbortError' || seq !== requestSeq) return;
        renderEval(fallbackEvaluate(window.game), { fallback: true });
    }
}

export function evaluatePosition(game) {
    return fallbackEvaluate(game);
}

export function updateEvalBar() {
    if (!window.game) return;

    const fen = window.game.fen();
    if (fen === lastFen) return;
    lastFen = fen;

    clearTimeout(requestTimer);
    const seq = ++requestSeq;
    renderEval(fallbackEvaluate(window.game), { loading: true });

    requestTimer = setTimeout(() => {
        fetchApiEval(fen, seq);
    }, 120);
}
