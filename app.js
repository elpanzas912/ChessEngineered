/**
 * ChessPeps MVP - Opening Trainer (Local)
 * cm-chessboard + chess.js, ES modules
 */

import {Chessboard, COLOR, INPUT_EVENT_TYPE, BORDER_TYPE, FEN} from "./lib/cm-chessboard-src/Chessboard.js";
import {Markers, MARKER_TYPE} from "./lib/cm-chessboard-src/extensions/markers/Markers.js";

// ── Globals ──
let db = {};
let board = null;
let game = null;
let trainer = null;
let pendingIncorrectMove = null;

const sounds = {
    move: new Audio('sounds/move.mp3'),
    capture: new Audio('sounds/capture.mp3')
};

function playMoveSound(move) {
    const isCapture = move && (move.captured || (move.san && move.san.includes('x')));
    const snd = isCapture ? sounds.capture : sounds.move;
    snd.currentTime = 0;
    snd.play().catch(e => {/* ignore autoplay restrictions */});
}

// Soft celebration chime using Web Audio API
function playCompletionSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (major arpeggio)
        const now = audioCtx.currentTime;
        notes.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.08, now + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.6);
            osc.start(now + i * 0.12);
            osc.stop(now + i * 0.12 + 0.6);
        });
    } catch (e) { /* ignore audio errors */ }
}

const stats = {
    linesDone: 0,
    movesMade: 0,
    attempts: 0,
    correct: 0
};

// ── Progress Persistence ──
// Use window.userProgress so non-module scripts can share the same object
window.userProgress = window.userProgress || {};
let currentUser = null;

function loadLocalProgress() {
    try {
        const stored = localStorage.getItem('chesspeps_progress');
        if (stored) {
            window.userProgress = JSON.parse(stored);
        }
    } catch (e) { /* ignore corrupt storage */ }
    try {
        const unlocked = localStorage.getItem('chesspeps_drill_unlocks');
        if (unlocked) {
            window.drillUnlocks = JSON.parse(unlocked);
        }
    } catch (e) { /* ignore corrupt storage */ }
}

function saveLocalProgress() {
    localStorage.setItem('chesspeps_progress', JSON.stringify(window.userProgress));
}

function getLineProgress(slug, linePgn) {
    return window.userProgress[slug]?.lines?.[linePgn] || {};
}

// ── Puzzle ELO System ──
const K_FACTOR = 32; // ELO K factor for puzzles

function getPuzzleELO() {
    return window.userProgress.puzzleELO || 1500;
}

function updatePuzzleELO(puzzleRating, score) {
    const playerRating = getPuzzleELO();
    const expectedScore = 1 / (1 + Math.pow(10, (puzzleRating - playerRating) / 400));
    const change = Math.round(K_FACTOR * (score - expectedScore));
    const newRating = Math.max(400, playerRating + change);
    window.userProgress.puzzleELO = newRating;
    saveLocalProgress();
    syncToCloud();
    return { change, newRating };
}

function findPuzzleInELORange(puzzles, elo, range = 150) {
    const candidates = puzzles.filter(p => Math.abs(p.Rating - elo) <= range);
    if (candidates.length === 0 && range < 1000) {
        return findPuzzleInELORange(puzzles, elo, range + 100);
    }
    return candidates;
}

function getLearnedLines(slug) {
    return window.userProgress[slug]?.learnedLines || [];
}

function markLineAsLearned(slug, linePgn) {
    if (!window.userProgress[slug]) window.userProgress[slug] = { lines: {}, learnedLines: [] };
    if (!window.userProgress[slug].learnedLines) window.userProgress[slug].learnedLines = [];
    if (!window.userProgress[slug].learnedLines.includes(linePgn)) {
        window.userProgress[slug].learnedLines.push(linePgn);
        saveLocalProgress();
        syncToCloud();
    }
}

function updateModeStats() {
    if (!trainer || !trainer.opening) return;
    const lines = trainer.opening.lines || [];
    const learned = getLearnedLines(trainer.slug);
    
    const learnStats = document.getElementById('learnStats');
    const practiceStats = document.getElementById('practiceStats');
    
    if (learnStats) {
        learnStats.textContent = `${learned.length}/${lines.length} lines discovered`;
    }
    if (practiceStats) {
        practiceStats.textContent = `${learned.length} lines perfected`;
    }
    
    // Unlock practice if we have learned lines
    const practiceBtn = document.getElementById('modePractice');
    if (practiceBtn) {
        if (learned.length > 0) {
            practiceBtn.classList.remove('locked');
            practiceBtn.disabled = false;
        } else {
            practiceBtn.classList.add('locked');
            practiceBtn.disabled = true;
        }
    }
    
    // Unlock drill/time at 3 lines learned
    const drillBtn = document.getElementById('modeDrill');
    if (drillBtn) {
        if (learned.length >= 3) {
            const wasLocked = drillBtn.disabled;
            drillBtn.classList.remove('locked');
            drillBtn.disabled = false;
            // Show unlock animation once per opening
            if (wasLocked && !window.drillUnlocks?.includes(trainer.slug)) {
                if (!window.drillUnlocks) window.drillUnlocks = [];
                window.drillUnlocks.push(trainer.slug);
                localStorage.setItem('chesspeps_drill_unlocks', JSON.stringify(window.drillUnlocks));
                const overlay = document.getElementById('unlockOverlay');
                if (overlay) {
                    setTimeout(() => overlay.classList.add('open'), 600);
                    // Fire confetti
                    if (typeof confetti !== 'undefined') {
                        confetti({
                            particleCount: 150,
                            spread: 100,
                            origin: { y: 0.6 },
                            colors: ['#fbbf24', '#ef4444', '#f97316']
                        });
                    }
                }
            }
        } else {
            drillBtn.classList.add('locked');
            drillBtn.disabled = true;
        }
    }
    const timeBtn = document.getElementById('modeTime');
    if (timeBtn) {
        if (learned.length >= 3) {
            timeBtn.classList.remove('locked');
            timeBtn.disabled = false;
        } else {
            timeBtn.classList.add('locked');
            timeBtn.disabled = true;
        }
    }
    // Unlock puzzles at 2 lines learned
    const puzzleBtn = document.getElementById('modePuzzles');
    if (puzzleBtn) {
        if (learned.length >= 2) {
            puzzleBtn.classList.remove('locked');
            puzzleBtn.disabled = false;
        } else {
            puzzleBtn.classList.add('locked');
            puzzleBtn.disabled = true;
        }
    }
}

function updateLineProgress(slug, linePgn, update) {
    if (!window.userProgress[slug]) window.userProgress[slug] = { lines: {} };
    if (!window.userProgress[slug].lines[linePgn]) window.userProgress[slug].lines[linePgn] = {};
    Object.assign(window.userProgress[slug].lines[linePgn], update);
    saveLocalProgress();
    syncToCloud();
}

async function syncToCloud() {
    const user = window.currentUser;
    const supabase = window.supabaseClient;
    if (!user || !supabase) {
        window.lastSyncError = 'No user or no supabase client';
        return;
    }
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ user_progress: window.userProgress, updated_at: new Date().toISOString() })
            .eq('id', user.id);
        if (error) {
            window.lastSyncError = error.message;
        } else {
            window.lastSyncError = null;
            window.lastSyncSuccess = Date.now();
        }
    } catch (e) {
        window.lastSyncError = e.message;
    }
}

// ── Load Database ──
fetch('data/openings.json')
    .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
    })
    .then(data => {
        db = data.openings || {};
        populateSelector();
        initApp();
    })
    .catch(err => {
        const fb = document.getElementById('feedback');
        if (fb) {
            fb.textContent = 'Error loading database: ' + err.message;
            fb.className = 'feedback error';
        }
    });

function populateSelector() {
    const sel = document.getElementById('openingSelect');
    if (!sel) return;
    const slugs = Object.keys(db).sort();
    for (const slug of slugs) {
        const opt = document.createElement('option');
        opt.value = slug;
        opt.textContent = db[slug].displayName || slug;
        sel.appendChild(opt);
    }
}

// ── Init ──
function initApp() {
    loadLocalProgress();
    game = new Chess();
    board = new Chessboard(document.getElementById('board'), {
        assetsUrl: "./lib/cm-chessboard-assets/",
        position: FEN.start,
        style: {
            pieces: { file: "pieces/staunty.svg", tileSize: 40 },
            cssClass: "default",
            borderType: BORDER_TYPE.none,
            animationDuration: 250
        },
        orientation: COLOR.white,
        extensions: [{class: Markers}]
    });

    const selectEl = document.getElementById('openingSelect');
    if (selectEl) {
        selectEl.addEventListener('change', onOpeningChange);
    }
    document.getElementById('btnNext').addEventListener('click', () => {
        if (!trainer) return;
        if (trainer.mode === 'puzzle') trainer.navigatePuzzleHistory(1);
        else trainer.nextLine();
    });
    const prevBtn = document.getElementById('btnPrev');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (!trainer) return;
            if (trainer.mode === 'puzzle') trainer.navigatePuzzleHistory(-1);
            else trainer.resetLine();
        });
    }
    const resetBtn = document.getElementById('btnReset');
    if (resetBtn) resetBtn.addEventListener('click', () => trainer && trainer.resetLine());
    document.getElementById('btnHint').addEventListener('click', () => trainer && trainer.showHint());
    const modeBtn = document.getElementById('btnMode');
    if (modeBtn) modeBtn.addEventListener('click', toggleMode);

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            trainer && trainer.nextLine();
        }
        if (e.code === 'KeyH') {
            trainer && trainer.showHint();
        }
    });

    window.addEventListener('resize', () => board && board.resize());

    // Auto-load from URL if slug present
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');
    if (slug && db[slug]) {
        trainer = new Trainer();
        window.trainer = trainer;
        trainer.loadOpening(slug);
        const nameEl = document.getElementById('openingName');
        if (nameEl) nameEl.textContent = db[slug].displayName;
    }
}

// ── Move Input Handler (cm-chessboard) ──
function moveInputHandler(event) {
    if (!trainer || trainer.completed) {
        return;
    }

    if (event.type === INPUT_EVENT_TYPE.moveInputStarted) {
        clearIncorrectCross();
        if (trainer.mode === 'puzzle' && trainer.historyIndex !== trainer.positionHistory.length - 1) {
            return false;
        }
        const piece = game.get(event.squareFrom);
        const playerColor = trainer.mode === 'puzzle' ? game.turn() : trainer.opening.playerSide;
        if (!piece || piece.color !== playerColor) {
            return false;
        }
        const moves = game.moves({ square: event.squareFrom, verbose: true });
        if (moves.length > 0) {
            event.chessboard.addLegalMovesMarkers(moves);
        }
        return moves.length > 0;
    }

    if (event.type === INPUT_EVENT_TYPE.movingOverSquare) {
        return;
    }

    if (event.type === INPUT_EVENT_TYPE.validateMoveInput) {
        event.chessboard.removeLegalMovesMarkers();
        const legalMoves = game.moves({ square: event.squareFrom, verbose: true });
        const isLegal = legalMoves.some(m => m.from === event.squareFrom && m.to === event.squareTo);
        if (!isLegal) {
            pendingIncorrectMove = null;
            return false;
        }
        const valid = trainer.validateMove(event.squareFrom, event.squareTo);
        if (!valid) {
            pendingIncorrectMove = { from: event.squareFrom, to: event.squareTo };
            return true;
        }
        pendingIncorrectMove = null;
        return true;
    }

    if (event.type === INPUT_EVENT_TYPE.moveInputFinished) {
        if (pendingIncorrectMove) {
            // Incorrect move: show X, wait, then enable input again
            showIncorrectCross(pendingIncorrectMove.to);
            // showFeedback('Try again!', 'error');
            setTimeout(() => {
                clearIncorrectCross();
                if (trainer && trainer.mode === 'puzzle' && trainer.currentPuzzle) {
                    // Stay on current puzzle position, snapback piece, then re-enable input
                    board.setPosition(game.fen(), true); // animated snapback
                    setTimeout(() => {
                        trainer.enableCurrentMoveInput();
                        trainer.updateHistoryButtons();
                    }, 300);
                } else {
                    board.setPosition(game.fen(), true); // animated snapback
                    setTimeout(() => {
                        if (trainer && !trainer.completed) {
                            const playerColor = trainer.opening.playerSide === 'w' ? COLOR.white : COLOR.black;
                            board.enableMoveInput(moveInputHandler, playerColor);
                        }
                    }, 300);
                }
                pendingIncorrectMove = null;
            }, 700);
            return;
        }
        if (event.legalMove) {
            trainer.applyMove(event.squareFrom, event.squareTo);
            event.chessboard.disableMoveInput();
            setTimeout(() => {
                trainer && trainer.playOpponentMoves();
            }, trainer.mode === 'drill' ? 250 : 500);
        }
    }

    if (event.type === INPUT_EVENT_TYPE.moveInputCanceled) {
        event.chessboard.removeLegalMovesMarkers();
        clearIncorrectCross();
    }
}

// ── Last Move Highlight ──
function highlightLastMove(from, to) {
    document.querySelectorAll('.cm-chessboard .square.last-move-from, .cm-chessboard .square.last-move-to').forEach(el => {
        el.classList.remove('last-move-from', 'last-move-to');
    });
    const fromEl = document.querySelector(`.cm-chessboard .square[data-square="${from}"]`);
    const toEl = document.querySelector(`.cm-chessboard .square[data-square="${to}"]`);
    if (fromEl) fromEl.classList.add('last-move-from');
    if (toEl) toEl.classList.add('last-move-to');
}

function clearLastMove() {
    document.querySelectorAll('.cm-chessboard .square.last-move-from, .cm-chessboard .square.last-move-to').forEach(el => {
        el.classList.remove('last-move-from', 'last-move-to');
    });
}

// ── Correct Move Checkmark ──
function showCorrectCheckmark(square) {
    clearCorrectCheckmark();
    if (!board || !board.view) return;
    const svg = board.view.svg;
    const point = board.view.squareToPoint(square);
    const size = board.view.squareWidth * 0.38;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "correct-checkmark");
    g.setAttribute("transform", `translate(${point.x}, ${point.y})`);

    // Green circle background
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    bg.setAttribute("cx", size / 2);
    bg.setAttribute("cy", size / 2);
    bg.setAttribute("r", size / 2);
    bg.setAttribute("fill", "#22c55e");
    g.appendChild(bg);

    // White checkmark
    const check = document.createElementNS("http://www.w3.org/2000/svg", "path");
    check.setAttribute("d", `M ${size*0.22},${size*0.52} L ${size*0.42},${size*0.72} L ${size*0.78},${size*0.30}`);
    check.setAttribute("stroke", "#fff");
    check.setAttribute("stroke-width", size * 0.13);
    check.setAttribute("fill", "none");
    check.setAttribute("stroke-linecap", "round");
    check.setAttribute("stroke-linejoin", "round");
    g.appendChild(check);

    svg.appendChild(g);
}

function clearCorrectCheckmark() {
    if (!board || !board.view || !board.view.svg) return;
    board.view.svg.querySelectorAll(".correct-checkmark").forEach(el => el.remove());
}

// ── Incorrect Move Cross ──
function showIncorrectCross(square) {
    clearIncorrectCross();
    if (!board || !board.view) return;
    const svg = board.view.svg;
    const point = board.view.squareToPoint(square);
    const size = board.view.squareWidth * 0.38;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "incorrect-cross");
    g.setAttribute("transform", `translate(${point.x}, ${point.y})`);

    // Red circle background
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    bg.setAttribute("cx", size / 2);
    bg.setAttribute("cy", size / 2);
    bg.setAttribute("r", size / 2);
    bg.setAttribute("fill", "#ca3331");
    g.appendChild(bg);

    // White X
    const xPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    xPath.setAttribute("d", `M ${size*0.28},${size*0.28} L ${size*0.72},${size*0.72} M ${size*0.72},${size*0.28} L ${size*0.28},${size*0.72}`);
    xPath.setAttribute("stroke", "#fff");
    xPath.setAttribute("stroke-width", size * 0.14);
    xPath.setAttribute("fill", "none");
    xPath.setAttribute("stroke-linecap", "round");
    g.appendChild(xPath);

    svg.appendChild(g);
}

function clearIncorrectCross() {
    if (!board || !board.view || !board.view.svg) return;
    board.view.svg.querySelectorAll(".incorrect-cross").forEach(el => el.remove());
}

// ── Hint Square Highlight ──
function highlightHintSquare(square) {
    clearHintSquare();
    const squareEl = document.querySelector(`.cm-chessboard .square[data-square="${square}"]`);
    if (squareEl) {
        squareEl.classList.add('hint-square');
    }
}

function clearHintSquare() {
    document.querySelectorAll('.cm-chessboard .square.hint-square').forEach(el => el.classList.remove('hint-square'));
}

// ── Trainer ──
class Trainer {
    constructor() {
        this.opening = null;
        this.slug = '';
        this.linePgn = null;
        this.lineName = '';
        this.moves = [];
        this.moveIndex = 0;
        this.mode = 'learn';
        this.completed = false;
        this.hintShown = false;
        this.wrongAttempts = 0;
        this.learnIndex = 0; // sequential index for learn mode
        this._playing = false; // guard against concurrent playOpponentMoves
        this.drillScore = 0; // current streak in drill mode
        this.timeScore = 0; // lines completed in time trial mode
        this.puzzleStreak = 0; // consecutive puzzles solved
        this.puzzles = []; // loaded puzzles for current opening
        this.currentPuzzle = null; // currently active puzzle
        this.puzzleIndex = 0; // index in puzzles array
        this.positionHistory = [];
        this.historyIndex = 0;
        this.playedSans = [];
    }

    loadOpening(slug) {
        this.slug = slug;
        this.opening = db[slug];
        if (!this.opening) return;

        const orientation = this.opening.playerSide === 'b' ? COLOR.black : COLOR.white;
        board.setOrientation(orientation);

        // Restore saved learn index and mode from dedicated localStorage key
        this.loadSessionState();

        renderLinesList();
        updateModeStats();
        this.nextLine();
    }

    saveSessionState() {
        // Use dedicated localStorage key to avoid conflicts with Supabase auth
        const key = `chesspeps_session_${this.slug}`;
        localStorage.setItem(key, JSON.stringify({
            learnIndex: this.learnIndex,
            mode: this.mode,
            linePgn: this.linePgn,
            lastVisited: Date.now()
        }));
    }

    loadSessionState() {
        const key = `chesspeps_session_${this.slug}`;
        try {
            const stored = localStorage.getItem(key);
            if (stored) {
                const saved = JSON.parse(stored);
                this.learnIndex = saved.learnIndex || 0;
                if (saved.mode) this.mode = saved.mode;
                return saved;
            }
        } catch (e) { /* ignore corrupt storage */ }
        return null;
    }

    nextLine() {
        const lines = this.opening.lines || [];
        if (!lines.length) return;

        if (this.mode === 'learn') {
            // Sequential order for learning
            if (this.learnIndex >= lines.length) {
                this.learnIndex = 0; // loop back to start
            }
            this.saveSessionState();
            this.loadLine(lines[this.learnIndex]);
        } else if (this.mode === 'practice' || this.mode === 'drill' || this.mode === 'time') {
            // Random from learned lines only
            const learned = getLearnedLines(this.slug);
            const available = lines.filter(l => learned.includes(l));
            if (!available.length) {
                // No lines learned yet, show message
                const instEl = document.getElementById('instruction');
                const bubbleText = document.querySelector('.instruction-text');
                const msg = 'Learn some lines first! Switch to Learn mode.';
                if (instEl) instEl.textContent = msg;
                if (bubbleText) bubbleText.textContent = msg;
                return;
            }
            const idx = Math.floor(Math.random() * available.length);
            this.loadLine(available[idx]);
        } else if (this.mode === 'puzzle') {
            this.loadNextPuzzle();
        }
    }

    loadLine(pgn) {
        // Hide completion overlay
        const overlay = document.getElementById('completionOverlay');
        if (overlay) overlay.classList.remove('open');
        
        this._playing = false;
        clearHintSquare();
        clearLastMove();
        clearCorrectCheckmark();
        clearIncorrectCross();
        this.hintShown = false;
        document.getElementById('btnHint').textContent = 'Hint';
        this.linePgn = pgn;
        this.lineName = (this.opening.lineNames || {})[pgn] || 'Unknown Line';
        this.moves = parsePgnToMoves(pgn);
        this.moveIndex = 0;
        this.completed = false;
        this.wrongAttempts = 0;

        game.reset();
        board.setPosition(game.fen(), true);

        updateLineHeader(this.lineName, this.opening.displayName);
        renderMoveHistory([]);
        updateProgress(0);
        renderLineDropdown();
        const prevBtn = document.getElementById('btnPrev');
        const nextBtn = document.getElementById('btnNext');
        if (prevBtn) prevBtn.disabled = false;
        if (nextBtn) nextBtn.disabled = false;

        this.playOpponentMoves();
        renderLinesList();
    }

    resetLine() {
        if (!this.linePgn) return;
        this.loadLine(this.linePgn);
    }

    async loadPuzzles() {
        if (this.puzzles.length > 0) return;
        try {
            const res = await fetch(`puzzles/${this.slug}.json`);
            if (!res.ok) return;
            this.puzzles = await res.json();
            // Shuffle puzzles
            for (let i = this.puzzles.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.puzzles[i], this.puzzles[j]] = [this.puzzles[j], this.puzzles[i]];
            }
        } catch (e) { /* silently fail */ }
    }

    async loadNextPuzzle(skipCount = 0) {
        await this.loadPuzzles();
        if (!this.puzzles.length) {
            const instEl = document.getElementById('instruction');
            const bubbleText = document.querySelector('.instruction-text');
            const msg = 'No puzzles available for this opening.';
            if (instEl) instEl.textContent = msg;
            if (bubbleText) bubbleText.textContent = msg;
            return;
        }

        if (skipCount >= this.puzzles.length) {
            const instEl = document.getElementById('instruction');
            const bubbleText = document.querySelector('.instruction-text');
            const msg = 'No playable puzzles available for this opening.';
            if (instEl) instEl.textContent = msg;
            if (bubbleText) bubbleText.textContent = msg;
            return;
        }
        
        // Find puzzle matching user's ELO
        const userELO = getPuzzleELO();
        let candidates = findPuzzleInELORange(this.puzzles, userELO);
        
        if (!candidates.length) {
            this.loadNextPuzzle(skipCount + 1);
            return;
        }
        
        // Avoid repeating the same puzzle consecutively when possible
        if (this.currentPuzzle && candidates.length > 1) {
            candidates = candidates.filter(p => p.id !== this.currentPuzzle.id);
        }
        
        // Pick random from candidates
        const puzzle = candidates[Math.floor(Math.random() * candidates.length)];
        this.currentPuzzle = puzzle;
        
        this.moves = parsePuzzleMoves(puzzle);
        if (!this.moves.length) {
            this.loadNextPuzzle(skipCount + 1);
            return;
        }
        this.moveIndex = 0;
        this.completed = false;
        this.wrongAttempts = 0;
        this.hintShown = false;
        this.positionHistory = [];
        this.historyIndex = 0;
        this.playedSans = [];
        
        // Set position from FEN
        game.load(puzzle.FEN);
        board.setPosition(game.fen(), true);
        this.recordPosition(null);
        
        // Determine orientation from FEN (who's turn)
        const turn = puzzle.FEN.split(' ')[1];
        const orientation = turn === 'b' ? COLOR.black : COLOR.white;
        board.setOrientation(orientation);
        
        // Update instruction
        const instEl = document.getElementById('instruction');
        const bubbleText = document.querySelector('.instruction-text');
        if (instEl) instEl.textContent = 'Solve the puzzle! Find the best move.';
        if (bubbleText) bubbleText.textContent = 'Solve the puzzle! Find the best move.';
        
        // Enable move input for the side to move
        const playerColor = turn === 'b' ? COLOR.black : COLOR.white;
        try { board.disableMoveInput(); } catch(e) {}
        board.enableMoveInput(moveInputHandler, playerColor);
        
        // Update UI
        if (typeof updatePuzzleUI === 'function') updatePuzzleUI();
        updateLineHeader('Puzzle', this.opening.displayName);
        updateProgress(0);
        renderMoveHistory([]);
        this.updateHistoryButtons();
    }

    resetCurrentPuzzle() {
        if (!this.currentPuzzle) return;

        this._playing = false;
        clearHintSquare();
        clearLastMove();
        clearCorrectCheckmark();
        clearIncorrectCross();
        this.hintShown = false;
        document.getElementById('btnHint').textContent = 'Hint';

        this.moveIndex = 0;
        this.completed = false;
        this.positionHistory = [];
        this.historyIndex = 0;
        this.playedSans = [];

        game.load(this.currentPuzzle.FEN);
        board.setPosition(game.fen(), true);
        this.recordPosition(null);

        const turn = this.currentPuzzle.FEN.split(' ')[1];
        const orientation = turn === 'b' ? COLOR.black : COLOR.white;
        board.setOrientation(orientation);

        const instEl = document.getElementById('instruction');
        const bubbleText = document.querySelector('.instruction-text');
        if (instEl) instEl.textContent = 'Solve the puzzle! Find the best move.';
        if (bubbleText) bubbleText.textContent = 'Solve the puzzle! Find the best move.';

        const playerColor = turn === 'b' ? COLOR.black : COLOR.white;
        try { board.disableMoveInput(); } catch(e) {}
        board.enableMoveInput(moveInputHandler, playerColor);

        updateLineHeader('Puzzle', this.opening.displayName);
        updateProgress(0);
        renderMoveHistory([]);
        this.updateHistoryButtons();
    }

    recordPosition(lastMove) {
        if (this.mode !== 'puzzle') return;

        this.positionHistory = this.positionHistory.slice(0, this.historyIndex + 1);
        this.positionHistory.push({
            fen: game.fen(),
            moveIndex: this.moveIndex,
            lastMove: lastMove ? { from: lastMove.from, to: lastMove.to } : null,
            sans: this.playedSans.slice()
        });
        this.historyIndex = this.positionHistory.length - 1;
        this.updateHistoryButtons();
    }

    navigatePuzzleHistory(direction) {
        if (this.mode !== 'puzzle' || !this.positionHistory.length) return;

        const nextIndex = Math.max(0, Math.min(this.positionHistory.length - 1, this.historyIndex + direction));
        if (nextIndex === this.historyIndex) return;

        this.historyIndex = nextIndex;
        const entry = this.positionHistory[this.historyIndex];
        try { board.disableMoveInput(); } catch(e) {}
        clearHintSquare();
        clearCorrectCheckmark();
        clearIncorrectCross();

        game.load(entry.fen);
        this.moveIndex = entry.moveIndex;
        board.setPosition(game.fen(), true);
        clearLastMove();
        if (entry.lastMove) highlightLastMove(entry.lastMove.from, entry.lastMove.to);
        renderMoveHistory(entry.sans);
        updateProgress(this.getProgress());
        this.updateInstruction();
        this.updateHistoryButtons();

        if (this.historyIndex === this.positionHistory.length - 1 && !this.completed) {
            this.enableCurrentMoveInput();
        }
    }

    updateHistoryButtons() {
        if (this.mode !== 'puzzle') return;
        const prevBtn = document.getElementById('btnPrev');
        const nextBtn = document.getElementById('btnNext');
        if (prevBtn) prevBtn.disabled = this.historyIndex <= 0;
        if (nextBtn) nextBtn.disabled = this.historyIndex >= this.positionHistory.length - 1;
    }

    enableCurrentMoveInput() {
        if (this.completed || this._playing) return;
        const playerColor = game.turn() === 'b' ? COLOR.black : COLOR.white;
        try { board.disableMoveInput(); } catch(e) {}
        board.enableMoveInput(moveInputHandler, playerColor);
    }

    playOpponentMoves() {
        if (this.completed || this._playing) return;
        this._playing = true;
        clearCorrectCheckmark();
        clearIncorrectCross();

        const finish = () => { this._playing = false; };
        const playNext = () => {
            if (this.moveIndex >= this.moves.length || this.completed) {
                updateProgress(this.getProgress());
                if (this.moveIndex >= this.moves.length) {
                    finish();
                    this.onComplete();
                } else {
                    finish();
                }
                return;
            }

            const next = this.moves[this.moveIndex];
            const side = game.turn();
            const isPuzzle = this.mode === 'puzzle';
            const isOpponentTurn = isPuzzle ? (this.moveIndex % 2 === 1) : (side !== this.opening.playerSide);

            if (isOpponentTurn) {
                const moveResult = game.move(next.san);
                if (!moveResult) {
                    finish();
                    return;
                }
                this.moveIndex++;
                board.setPosition(game.fen(), true);
                highlightLastMove(next.from, next.to);
                playMoveSound(moveResult);
                this.updateInstruction();
                if (isPuzzle) {
                    this.playedSans.push(moveResult.san);
                    this.recordPosition(next);
                    renderMoveHistory(this.playedSans);
                } else {
                    renderMoveHistory(game.history({ verbose: false }));
                }
                updateProgress(this.getProgress());
                
                // Continue with delay for animation visibility
                const delay = this.mode === 'drill' ? 200 : (isPuzzle ? 400 : 600);
                setTimeout(() => playNext(), delay);
            } else {
                finish();
                this.updateInstruction();
                if (isPuzzle) {
                    this.enableCurrentMoveInput();
                    this.updateHistoryButtons();
                } else {
                    const playerColor = this.opening.playerSide === 'w' ? COLOR.white : COLOR.black;
                    try { board.disableMoveInput(); } catch(e) {}
                    board.enableMoveInput(moveInputHandler, playerColor);
                }
                updateProgress(this.getProgress());
            }
        };

        playNext();
    }

    validateMove(from, to) {
        const expected = this.moves[this.moveIndex];
        if (!expected) return false;

        if (from === to) {
            return false; // same square, no feedback
        }

        // Check if this is even a legal chess move
        const legalMoves = game.moves({ square: from, verbose: true });
        const isLegal = legalMoves.some(m => m.from === from && m.to === to);
        if (!isLegal) {
            return false; // not a legal move, no feedback (e.g. clicked another piece)
        }

        if (expected.from !== from || expected.to !== to) {
            stats.attempts++;
            this.wrongAttempts++;
            if (this.mode === 'drill') {
                this.endDrillGame();
            } else if (this.mode === 'time') {
                // Reset current line in time mode
                this.resetLine();
            } else if (this.mode === 'puzzle') {
                this.puzzleStreak = 0;
                const puzzleRating = this.currentPuzzle?.Rating || 1500;
                const result = updatePuzzleELO(puzzleRating, 0);
                showFeedback(`${result.change} ELO`, 'error');
                if (typeof updatePuzzleUI === 'function') updatePuzzleUI();
                // Don't load next puzzle here; moveInputHandler will reset the current puzzle position
            }
            return false;
        }

        return true;
    }

    endDrillGame() {
        this.completed = true;
        const high = window.userProgress[this.slug]?.drillHighScore || 0;
        if (this.drillScore > high) {
            if (!window.userProgress[this.slug]) window.userProgress[this.slug] = {};
            window.userProgress[this.slug].drillHighScore = this.drillScore;
            saveLocalProgress();
            syncToCloud();
        }
        // Show game over overlay
        const overlay = document.getElementById('gameoverOverlay');
        const scoreEl = document.getElementById('gameoverScore');
        const highEl = document.getElementById('gameoverHigh');
        if (overlay) overlay.classList.add('open');
        if (scoreEl) scoreEl.textContent = `Score: ${this.drillScore}`;
        if (highEl) highEl.textContent = `High Score: ${Math.max(high, this.drillScore)}`;
    }

    applyMove(from, to) {
        clearHintSquare();
        this.hintShown = false;
        document.getElementById('btnHint').textContent = 'Hint';
        const expected = this.moves[this.moveIndex];
        if (!expected) return;

        stats.attempts++;
        stats.correct++;
        stats.movesMade++;

        const moveResult = game.move(expected.san);
        if (!moveResult) return;
        this.moveIndex++;
        if (this.mode === 'puzzle') {
            this.playedSans.push(moveResult.san);
        }
        highlightLastMove(expected.from, expected.to);
        showCorrectCheckmark(expected.to);
        playMoveSound(moveResult);

        if (this.mode === 'puzzle') {
            this.recordPosition(expected);
            renderMoveHistory(this.playedSans);
        } else {
            renderMoveHistory(game.history({ verbose: false }));
        }
        updateProgress(this.getProgress());

        const desc = this.findDescription();
        // const msg = desc ? 'Correct! ' + desc.substring(0, 50) + '...' : 'Correct!';
        // showFeedback(msg, 'success');
    }

    showHint() {
        if (this.completed) return;
        const exp = this.moves[this.moveIndex];
        if (!exp) return;

        if (this.hintShown) {
            // Second click: execute the move automatically
            clearHintSquare();
            this.hintShown = false;
            document.getElementById('btnHint').textContent = 'Hint';

            // In puzzle mode, using hint counts as a fail for ELO, but only plays the next move
            if (this.mode === 'puzzle') {
                this.puzzleStreak = 0;
                const puzzleRating = this.currentPuzzle?.Rating || 1500;
                const result = updatePuzzleELO(puzzleRating, 0);
                showFeedback(`${result.change} ELO`, 'error');
                if (typeof updatePuzzleUI === 'function') updatePuzzleUI();
                
                // Execute the correct move for visual feedback
                const moveResult = game.move(exp.san);
                if (moveResult) {
                    this.moveIndex++;
                    this.playedSans.push(moveResult.san);
                    board.setPosition(game.fen(), true);
                    highlightLastMove(exp.from, exp.to);
                    playMoveSound(moveResult);
                    this.recordPosition(exp);
                    renderMoveHistory(this.playedSans);
                    updateProgress(this.getProgress());
                    
                    // Play opponent response if any
                    if (this.moveIndex < this.moves.length) {
                        setTimeout(() => {
                            const opp = this.moves[this.moveIndex];
                            if (opp) {
                                const oppResult = game.move(opp.san);
                                if (oppResult) {
                                    this.moveIndex++;
                                    board.setPosition(game.fen(), true);
                                    highlightLastMove(opp.from, opp.to);
                                    playMoveSound(oppResult);
                                    this.playedSans.push(oppResult.san);
                                    renderMoveHistory(this.playedSans);
                                    updateProgress(this.getProgress());
                                    this.recordPosition(opp);
                                }
                            }
                            // Re-enable input so user can continue the puzzle
                            this.enableCurrentMoveInput();
                            this.updateHistoryButtons();
                        }, 600);
                        return;
                    }
                }
                // If no more moves after hint, puzzle is technically over but user already lost ELO
                // Just load next puzzle without awarding victory
                setTimeout(() => this.loadNextPuzzle(), 800);
                return;
            }

            const moveResult = game.move(exp.san);
            if (!moveResult) return;
            this.moveIndex++;
            board.setPosition(game.fen(), true);
            highlightLastMove(exp.from, exp.to);
            playMoveSound(moveResult);

            renderMoveHistory(game.history({ verbose: false }));
            updateProgress(this.getProgress());

            setTimeout(() => {
                this.playOpponentMoves();
            }, this.mode === 'drill' ? 250 : 500);
        } else {
            // First click: show hint square
            highlightHintSquare(exp.from);
            this.hintShown = true;
            document.getElementById('btnHint').textContent = 'Solve';
        }
    }

    updateInstruction() {
        const el = document.getElementById('instruction');
        const bubbleText = document.querySelector('.instruction-text');
        const desc = this.findDescription();
        const short = this.findShortDescription();

        const side = game.turn();
        const isUserTurn = side === this.opening.playerSide;
        let text;

        if (this.mode === 'drill') {
            text = `Streak: ${this.drillScore} — Get as many openings correct in a row as you can!`;
        } else if (this.mode === 'puzzle') {
            text = `Streak: ${this.puzzleStreak} — Solve the puzzle! Find the best move.`;
        } else if (isUserTurn) {
            if (desc) text = desc;
            else if (short) text = short;
            else text = "Your turn! Make the best move.";
        } else {
            if (desc) text = desc;
            else text = this.completed ? 'Line complete!' : "Think about the position...";
        }

        if (el) el.textContent = text;
        if (bubbleText) bubbleText.textContent = text;
    }

    findDescription() {
        const fen = game.fen();
        const descs = this.opening.descriptions || {};
        if (descs[fen]) return descs[fen];
        const prefix = fen.split(' ').slice(0, 4).join(' ');
        for (const [key, val] of Object.entries(descs)) {
            const kp = key.split(' ').slice(0, 4).join(' ');
            if (kp === prefix) return val;
        }
        return null;
    }

    findShortDescription() {
        const fen = game.fen();
        const shorts = this.opening.shortDescriptions || {};
        if (shorts[fen]) return shorts[fen];
        const prefix = fen.split(' ').slice(0, 4).join(' ');
        for (const [key, val] of Object.entries(shorts)) {
            const kp = key.split(' ').slice(0, 4).join(' ');
            if (kp === prefix) return val;
        }
        return null;
    }

    getProgress() {
        if (!this.moves.length) return 0;
        return (this.moveIndex / this.moves.length) * 100;
    }

    onComplete() {
        if (this.completed) return; // guard against double execution
        this.completed = true;
        
        // Drill mode: increment streak and immediately load next line
        if (this.mode === 'drill') {
            this.drillScore++;
            if (typeof updateDrillUI === 'function') updateDrillUI();
            // Brief flash then next line
            setTimeout(() => {
                this.nextLine();
            }, 400);
            return;
        }
        
        // Time mode: increment score and immediately load next line
        if (this.mode === 'time') {
            this.timeScore = (this.timeScore || 0) + 1;
            if (typeof updateTimeUI === 'function') updateTimeUI();
            setTimeout(() => {
                this.nextLine();
            }, 300);
            return;
        }
        
        // Puzzle mode: increment streak, update ELO, and load next puzzle
        if (this.mode === 'puzzle') {
            this.puzzleStreak++;
            const puzzleRating = this.currentPuzzle?.Rating || 1500;
            const result = updatePuzzleELO(puzzleRating, 1);
            if (typeof updatePuzzleUI === 'function') updatePuzzleUI();
            // Play success sound
            playCompletionSound();
            // Show ELO change feedback
            showFeedback(`+${result.change} ELO`, 'success');
            setTimeout(() => {
                this.nextLine();
            }, 600);
            return;
        }
        
        stats.linesDone++;
        updateStats();
        
        // Save progress
        const existing = getLineProgress(this.slug, this.linePgn);
        const isPerfect = this.wrongAttempts === 0;
        updateLineProgress(this.slug, this.linePgn, {
            completions: (existing.completions || 0) + 1,
            perfectAttempts: (existing.perfectAttempts || 0) + (isPerfect ? 1 : 0),
            lastAttemptTimestamp: Date.now(),
            confidence: Math.min(10, (existing.confidence || 0) + (isPerfect ? 2 : 1))
        });
        
        // Mark as learned (only in learn mode, and only if not already learned)
        if (this.mode === 'learn') {
            markLineAsLearned(this.slug, this.linePgn);
            this.learnIndex++;
            this.saveSessionState();
        }
        
        // Update mode stats
        updateModeStats();
        
        // Update progress bar to 100%
        updateProgress(100);
        
        // Update instruction
        const instEl = document.getElementById('instruction');
        if (instEl) instEl.textContent = 'Line complete!';
        const bubbleText = document.querySelector('.instruction-text');
        if (bubbleText) bubbleText.textContent = 'Line complete! Great job!';
        
        // Trigger confetti celebration from below the board
        playCompletionSound();
        if (typeof confetti !== 'undefined') {
            const boardEl = document.getElementById('board');
            let originX = 0.5;
            let originY = 1.1;
            if (boardEl) {
                const rect = boardEl.getBoundingClientRect();
                originX = (rect.left + rect.width / 2) / window.innerWidth;
                originY = (rect.bottom + 20) / window.innerHeight;
            }
            const count = 300;
            const defaults = {
                origin: { x: originX, y: originY },
                scalar: 1.8,
                gravity: 0.8,
                ticks: 250,
                colors: ['#a78bfa', '#8b5cf6', '#22c55e', '#fbbf24', '#f472b6', '#60a5fa']
            };

            function fire(particleRatio, opts) {
                confetti({
                    ...defaults,
                    ...opts,
                    particleCount: Math.floor(count * particleRatio)
                });
            }

            fire(0.3, { spread: 40, startVelocity: 65, angle: 90 });
            fire(0.25, { spread: 80, startVelocity: 55, angle: 90 });
            fire(0.3, { spread: 120, startVelocity: 45, angle: 90, decay: 0.92 });
            fire(0.15, { spread: 160, startVelocity: 30, angle: 90, decay: 0.94, scalar: 2.2 });
        }
        
        // Show completion overlay after a short delay
        setTimeout(() => {
            const overlay = document.getElementById('completionOverlay');
            const sub = document.getElementById('completionSub');
            if (overlay && sub) {
                const lineName = this.lineName || 'Unknown Line';
                const learnedCount = getLearnedLines(this.slug).length;
                const totalLines = this.opening.lines?.length || 0;
                const progressMsg = totalLines > 0 ? `(${learnedCount}/${totalLines} discovered)` : '';
                sub.textContent = `You completed "${lineName}"! ${isPerfect ? 'Perfect run! ' : ''}${progressMsg}`;
                overlay.classList.add('open');
            }
        }, 1200);
    }
}

// ── Helpers ──
function parsePuzzleMoves(puzzle) {
    const temp = new Chess(puzzle.FEN);
    const tokens = String(puzzle.Moves || '').split(/\s+/).filter(uci => /^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(uci));
    const moves = [];

    for (const uci of tokens) {
        const from = uci.substring(0, 2);
        const to = uci.substring(2, 4);
        const promotion = uci.length > 4 ? uci.substring(4, 5).toLowerCase() : undefined;
        const legalMove = temp.moves({ verbose: true }).find(move => (
            move.from === from &&
            move.to === to &&
            (!promotion || move.promotion === promotion)
        ));

        if (!legalMove) break;

        const moveResult = temp.move({
            from,
            to,
            ...(promotion ? { promotion } : {})
        });

        if (!moveResult) break;

        moves.push({
            from,
            to,
            promotion,
            san: moveResult.san,
            color: moveResult.color,
            fen: temp.fen()
        });
    }

    return moves;
}

function parsePgnToMoves(pgn) {
    const temp = new Chess();
    const clean = pgn.replace(/\d+\./g, ' ').trim();
    const tokens = clean.split(/\s+/).filter(t => t && !t.match(/^\d+$/));
    const moves = [];
    for (const token of tokens) {
        if (token.match(/^(1-0|0-1|1\/2|\*|\*\*)$/)) continue;
        const move = temp.move(token, { sloppy: true });
        if (move) {
            moves.push({
                san: move.san,
                from: move.from,
                to: move.to,
                color: move.color,
                fen: temp.fen()
            });
        }
    }
    return moves;
}

// ── UI ──
function onOpeningChange(e) {
    const slug = e.target.value;
    if (!slug) return;
    if (!trainer) trainer = new Trainer();
    window.trainer = trainer;
    trainer.loadOpening(slug);
    updateStats();
}

function renderLinesList() {
    const container = document.getElementById('linesList');
    if (!container) return;
    if (!trainer || !trainer.opening) {
        container.innerHTML = '<div class="empty">Select an opening</div>';
        return;
    }
    const lines = trainer.opening.lines || [];
    const names = trainer.opening.lineNames || {};
    let html = '';
    lines.forEach((pgn, idx) => {
        const name = names[pgn] || `Line ${idx + 1}`;
        const isActive = trainer.linePgn === pgn;
        const safePgn = pgn.replace(/"/g, '&quot;');
        html += `<button class="line-btn ${isActive ? 'active' : ''}" data-pgn="${safePgn}">`;
        html += `<span class="name">${esc(name)}</span>`;
        html += `<span class="pgn">${esc(pgn.substring(0, 55))}${pgn.length > 55 ? '...' : ''}</span>`;
        html += `</button>`;
    });
    container.innerHTML = html;
    container.querySelectorAll('.line-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pgn = e.currentTarget.dataset.pgn;
            if (pgn && trainer) {
                trainer.loadLine(pgn);
                if (typeof trainer.saveSessionState === 'function') trainer.saveSessionState();
            }
        });
    });
}

function updateLineHeader(name, openingName) {
    const openingNameEl = document.getElementById('openingName');
    const lineCounter = document.getElementById('lineCounter');
    const progressLineName = document.getElementById('progressLineName');

    if (openingNameEl) openingNameEl.textContent = openingName || '';
    
    // Show actual line number based on current line in the opening
    let lineNum = 1;
    if (trainer && trainer.opening && trainer.linePgn) {
        const idx = trainer.opening.lines.indexOf(trainer.linePgn);
        if (idx >= 0) lineNum = idx + 1;
    }
    if (lineCounter) lineCounter.textContent = '#' + lineNum;
    
    if (progressLineName) progressLineName.textContent = name || '';
}

function updateProgress(pct) {
    const bar = document.getElementById('lineProgressBar');
    const moveNum = document.getElementById('progressMoveNum');
    if (bar && trainer && trainer.moves.length > 0) {
        bar.style.width = pct + '%';
        if (moveNum) {
            const current = trainer.moveIndex;
            const total = trainer.moves.length;
            moveNum.textContent = `Move ${current}/${total}`;
        }
    }
}

function renderMoveHistory(moves) {
    const container = document.getElementById('moveHistory');
    if (!container) return;
    if (!moves.length) {
        container.innerHTML = '<span style="color:var(--text-dim)">No moves yet</span>';
        return;
    }
    let html = '';
    let num = 1;
    for (let i = 0; i < moves.length; i += 2) {
        html += `<span class="move-entry">${num}. ${moves[i]}</span>`;
        if (moves[i + 1]) {
            html += `<span class="move-entry user">${moves[i + 1]}</span>`;
        }
        num++;
    }
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
}

function updateStats() {
    const statLines = document.getElementById('statLines');
    const statMoves = document.getElementById('statMoves');
    const statAcc = document.getElementById('statAcc');
    const learnStats = document.getElementById('learnStats');
    const practiceStats = document.getElementById('practiceStats');

    if (statLines) statLines.textContent = stats.linesDone;
    if (statMoves) statMoves.textContent = stats.movesMade;
    const acc = stats.attempts > 0 ? Math.round((stats.correct / stats.attempts) * 100) + '%' : '-';
    if (statAcc) statAcc.textContent = acc;
    if (learnStats) learnStats.textContent = `${stats.linesDone} lines discovered`;
    if (practiceStats) practiceStats.textContent = `${stats.correct} lines perfected`;
}

function showFeedback(msg, type) {
    const el = document.getElementById('feedback');
    if (!el) return;
    el.textContent = msg;
    el.className = 'feedback ' + type;
    setTimeout(() => {
        el.classList.add('hidden');
    }, 2000);
    setTimeout(() => {
        el.className = 'feedback hidden';
    }, 2400);
}

function toggleMode() {
    if (!trainer) return;
    const learned = getLearnedLines(trainer.slug);
    const modes = learned.length > 0 ? ['learn', 'practice'] : ['learn'];
    const currentIdx = modes.indexOf(trainer.mode);
    const nextIdx = (currentIdx + 1) % modes.length;
    const newMode = modes[nextIdx];
    if (typeof setMode === 'function') {
        setMode(newMode);
    } else {
        trainer.mode = newMode;
    }
}

// ── Line Dropdown ──
function renderLineDropdown() {
    const list = document.getElementById('dropdownList');
    if (!list || !trainer || !trainer.opening) return;
    
    const lines = trainer.opening.lines || [];
    const names = trainer.opening.lineNames || {};
    list.innerHTML = '';
    
    lines.forEach((pgn, idx) => {
        const name = names[pgn] || `Line ${idx + 1}`;
        const isActive = trainer.linePgn === pgn;
        const num = idx + 1;
        
        const item = document.createElement('div');
        item.className = `dropdown-item ${isActive ? 'active' : ''}`;
        item.innerHTML = `
            <span class="line-num">#${num}</span>
            <span class="line-icon">🎯</span>
            <span class="line-label">${esc(name)}</span>
            ${isActive ? '<span style="margin-left:auto;color:#22c55e;font-size:0.85rem;font-weight:700;">✓</span>' : ''}
        `;
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            if (trainer) {
                trainer.loadLine(pgn);
                if (typeof trainer.saveSessionState === 'function') trainer.saveSessionState();
                closeLineDropdown();
            }
        });
        list.appendChild(item);
    });
}

// ── Completion Handler ──
window.nextLineAfterComplete = function() {
    const overlay = document.getElementById('completionOverlay');
    if (overlay) overlay.classList.remove('open');
    if (trainer) trainer.nextLine();
};

// ── Utils ──
function esc(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// Debug helper
window.debugProgress = function() {
    return {
        userProgress: window.userProgress,
        currentUser: window.currentUser ? window.currentUser.email : null,
        lastSyncError: window.lastSyncError,
        lastSyncSuccess: window.lastSyncSuccess,
        localStorage: JSON.parse(localStorage.getItem('chesspeps_progress') || '{}')
    };
};
