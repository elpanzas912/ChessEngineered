const PIECE_VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

const PST = {
    p: [0,0,0,0,0,0,0,0,  50,50,50,50,50,50,50,50,  10,10,20,30,30,20,10,10,  5,5,10,25,25,10,5,5,  0,0,0,20,20,0,0,0,  5,-5,-10,0,0,-10,-5,5,  5,10,10,-20,-20,10,10,5,  0,0,0,0,0,0,0,0],
    n: [-50,-40,-30,-30,-30,-30,-40,-50,  -40,-20,0,0,0,0,-20,-40,  -30,0,10,15,15,10,0,-30,  -30,5,15,20,20,15,5,-30,  -30,0,15,20,20,15,0,-30,  -30,5,10,15,15,10,5,-30,  -40,-20,0,5,5,0,-20,-40,  -50,-40,-30,-30,-30,-30,-40,-50],
    b: [-20,-10,-10,-10,-10,-10,-10,-20,  -10,0,0,0,0,0,0,-10,  -10,0,10,10,10,10,0,-10,  -10,5,5,10,10,5,5,-10,  -10,0,5,10,10,5,0,-10,  -10,10,10,10,10,10,10,-10,  -10,5,0,0,0,0,5,-10,  -20,-10,-10,-10,-10,-10,-10,-20],
    r: [0,0,0,0,0,0,0,0,  5,10,10,10,10,10,10,5,  -5,0,0,0,0,0,0,-5,  -5,0,0,0,0,0,0,-5,  -5,0,0,0,0,0,0,-5,  -5,0,0,0,0,0,0,-5,  -5,0,0,0,0,0,0,-5,  0,0,0,5,5,0,0,0],
    q: [-20,-10,-10,-5,-5,-10,-10,-20,  -10,0,0,0,0,0,0,-10,  -10,0,5,5,5,5,0,-10,  -5,0,5,5,5,5,0,-5,  0,0,5,5,5,5,0,-5,  -10,5,5,5,5,5,0,-10,  -10,0,5,0,0,0,0,-10,  -20,-10,-10,-5,-5,-10,-10,-20],
    k: [-30,-40,-40,-50,-50,-40,-40,-30,  -30,-40,-40,-50,-50,-40,-40,-30,  -30,-40,-40,-50,-50,-40,-40,-30,  -30,-40,-40,-50,-50,-40,-40,-30,  -20,-30,-30,-40,-40,-30,-30,-20,  -10,-20,-20,-20,-20,-20,-20,-10,  20,20,0,0,0,0,20,20,  20,30,10,0,0,10,30,20]
};

export function evaluatePosition(game) {
    if (!game) return 0;
    const board = game.board();
    let score = 0;
    let wPawns = [], bPawns = [];

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const sq = board[r][c];
            if (!sq) continue;
            const type = sq.type;
            const isW = sq.color === 'w';
            const sign = isW ? 1 : -1;

            score += sign * PIECE_VAL[type];

            const idx = (isW ? (7 - r) : r) * 8 + c;
            score += sign * PST[type][idx];

            if (type === 'p') {
                if (isW) wPawns.push(c); else bPawns.push(c);
            }
        }
    }

    for (const cols of [wPawns, bPawns]) {
        const sign = cols === wPawns ? 1 : -1;
        for (let c = 0; c < 8; c++) {
            const count = cols.filter(x => x === c).length;
            if (count > 1) score -= sign * 20 * (count - 1);
        }
    }

    const moves = game.moves({ verbose: true });
    let wMob = 0, bMob = 0;
    for (const m of moves) {
        if (m.color === 'w') wMob++; else bMob++;
    }
    score += (wMob - bMob) * 3;

    for (const color of ['w', 'b']) {
        const sign = color === 'w' ? 1 : -1;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const sq = board[r][c];
                if (sq && sq.type === 'k' && sq.color === color) {
                    let shield = 0;
                    const dir = color === 'w' ? -1 : 1;
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dir, nc = c + dc;
                        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                            const n = board[nr][nc];
                            if (n && n.type === 'p' && n.color === color) shield++;
                        }
                    }
                    score += sign * shield * 10;
                }
            }
        }
    }

    return score;
}

export function updateEvalBar() {
    const whiteEl = document.getElementById('evalBarWhite');
    const blackEl = document.getElementById('evalBarBlack');
    const scoreEl = document.getElementById('evalBarScore');
    if (!whiteEl || !blackEl || !scoreEl || !window.game) return;

    const evalScore = evaluatePosition(window.game);
    const pawnScore = evalScore / 100;

    const clamped = Math.max(-800, Math.min(800, evalScore));
    const whitePct = 50 + (clamped / 1600) * 50;
    const whiteHeight = Math.min(100, Math.max(0, whitePct));
    const blackHeight = 100 - whiteHeight;

    whiteEl.style.height = whiteHeight + '%';
    blackEl.style.height = blackHeight + '%';
    whiteEl.style.width = whiteHeight + '%';
    blackEl.style.width = blackHeight + '%';

    const displayScore = pawnScore >= 0 ? '+' + pawnScore.toFixed(1) : pawnScore.toFixed(1);
    scoreEl.textContent = displayScore;

    if (pawnScore > 0.5) {
        scoreEl.style.color = '#18181b';
    } else if (pawnScore < -0.5) {
        scoreEl.style.color = '#e4e4e7';
    } else {
        scoreEl.style.color = '#a1a1aa';
    }
}
