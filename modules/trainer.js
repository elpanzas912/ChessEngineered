import { COLOR } from '../lib/cm-chessboard-src/Chessboard.js';
import { playMoveSound, playCompletionSound } from './audio.js';
import { updateLineProgress, syncToCloud, markLineAsLearned, getLineProgress, getLearnedLines, getPuzzleELO, updatePuzzleELO, findPuzzleInELORange, saveLocalProgress, savePuzzleStreak, getPuzzleStreak } from './progress.js';
import { highlightHintSquare, clearHintSquare, highlightLastMove, clearLastMove, showCorrectCheckmark, clearCorrectCheckmark, showIncorrectCross, clearIncorrectCross, moveInputHandler } from './board.js?v=32';
import { renderMoveHistory, updateLineHeader, updateProgress, showFeedback, updateModeStats, renderLinesList, renderLineDropdown, updateStats } from './ui.js?v=33';
import { updateEvalBar } from './evaluator.js';
import { stats } from './stats.js';

export { stats };

export class Trainer {
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
        this.learnIndex = 0;
        this._playing = false;
        this.drillScore = 0;
        this.timeScore = 0;
        this.puzzleStreak = 0;
        this.puzzles = [];
        this.currentPuzzle = null;
        this.puzzleIndex = 0;
        this.positionHistory = [];
        this.historyIndex = 0;
        this.playedSans = [];
        this.isTransitioning = false;
        this.currentPuzzleStep = 0;
        this.puzzlePlayerColor = null;
    }

    loadOpening(slug) {
        this.slug = slug;
        this.opening = window.db[slug];
        if (!this.opening) return;

        const orientation = this.opening.playerSide === 'b' ? COLOR.black : COLOR.white;
        window.board.setOrientation(orientation);

        const saved = this.loadSessionState();
        console.log('[Session] loadOpening:', slug, 'saved=', saved);

        renderLinesList(this);
        updateModeStats();

        const lines = this.opening.lines || [];
        const hasSavedLine = saved && saved.linePgn && lines.some(l => l.trim() === saved.linePgn.trim());
        console.log('[Session] hasSavedLine=', hasSavedLine, 'linePgn=', saved?.linePgn);
        if (hasSavedLine) {
            this.loadLine(saved.linePgn);
        } else {
            this.nextLine();
        }
    }

    saveSessionState() {
        const key = `chesspeps_session_${this.slug}`;
        const payload = {
            learnIndex: this.learnIndex,
            mode: this.mode,
            linePgn: this.linePgn,
            lastVisited: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(payload));
        console.log('[Session] saveSessionState:', key, payload);
    }

    loadSessionState() {
        const key = `chesspeps_session_${this.slug}`;
        try {
            const stored = localStorage.getItem(key);
            if (stored) {
                const saved = JSON.parse(stored);
                this.learnIndex = saved.learnIndex || 0;
                this.linePgn = saved.linePgn || null;
                this.mode = 'learn';
                console.log('[Session] loadSessionState:', key, saved);
                return saved;
            }
        } catch (e) {}
        console.log('[Session] loadSessionState: no saved state for', key);
        return null;
    }

    skipLine() {
        if (this.mode !== 'learn') return;
        const lines = this.opening.lines || [];
        if (!lines.length) return;
        this.learnIndex++;
        if (this.learnIndex >= lines.length) {
            this.learnIndex = 0;
        }
        this.saveSessionState();
        this.nextLine();
    }

    nextLine() {
        const lines = this.opening.lines || [];
        if (!lines.length) return;

        if (this.mode === 'learn') {
            if (this.learnIndex >= lines.length) {
                this.learnIndex = 0;
            }
            this.saveSessionState();
            this.loadLine(lines[this.learnIndex]);
        } else if (this.mode === 'practice' || this.mode === 'drill' || this.mode === 'time') {
            const learned = getLearnedLines(this.slug);
            const available = lines.filter(l => learned.includes(l));
            if (!available.length) {
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
        const overlay = document.getElementById('completionOverlay');
        if (overlay) overlay.classList.remove('open');
        document.body.classList.remove('line-complete-mobile');

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

        this.saveSessionState();

        window.game.reset();
        window.board.setPosition(window.game.fen(), true);

        updateLineHeader(this.lineName, this.opening.displayName);
        renderMoveHistory([]);
        updateProgress(0);
        updateEvalBar();
        renderLineDropdown(this);
        const prevBtn = document.getElementById('btnPrev');
        const nextBtn = document.getElementById('btnNext');
        if (prevBtn) prevBtn.disabled = false;
        if (nextBtn) nextBtn.disabled = false;

        this.playOpponentMoves();
        renderLinesList(this);
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
            for (let i = this.puzzles.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.puzzles[i], this.puzzles[j]] = [this.puzzles[j], this.puzzles[i]];
            }
        } catch (e) {}
    }

    async loadNextPuzzle(skipCount = 0) {
        this.isTransitioning = true;
        try { window.board.disableMoveInput(); } catch (e) {}
        await this.loadPuzzles();
        if (!this.puzzles.length) {
            this.isTransitioning = false;
            const instEl = document.getElementById('instruction');
            const bubbleText = document.querySelector('.instruction-text');
            const msg = 'No puzzles available for this opening.';
            if (instEl) instEl.textContent = msg;
            if (bubbleText) bubbleText.textContent = msg;
            return;
        }

        if (skipCount >= this.puzzles.length) {
            this.isTransitioning = false;
            const instEl = document.getElementById('instruction');
            const bubbleText = document.querySelector('.instruction-text');
            const msg = 'No playable puzzles available for this opening.';
            if (instEl) instEl.textContent = msg;
            if (bubbleText) bubbleText.textContent = msg;
            return;
        }

        const userELO = getPuzzleELO();
        let candidates = findPuzzleInELORange(this.puzzles, userELO);

        if (!candidates.length) {
            this.loadNextPuzzle(skipCount + 1);
            return;
        }

        if (this.currentPuzzle && candidates.length > 1) {
            candidates = candidates.filter(p => p.id !== this.currentPuzzle.id);
        }

        const puzzle = candidates[Math.floor(Math.random() * candidates.length)];
        this.currentPuzzle = puzzle;

        this.moves = parsePuzzleMoves(puzzle);
        if (!this.moves.length) {
            this.loadNextPuzzle(skipCount + 1);
            return;
        }
        attachPuzzleMetadata(puzzle, this.moves, this.opening.playerSide);
        this.moveIndex = 0;
        this.completed = false;
        this.wrongAttempts = 0;
        this.hintShown = false;
        clearCorrectCheckmark();
        clearIncorrectCross();
        this.puzzleELOPenalized = false;
        this.puzzleStreak = getPuzzleStreak();
        this.positionHistory = [];
        this.historyIndex = 0;
        this.playedSans = [];

        window.game.load(puzzle.FEN);
        window.board.setPosition(window.game.fen(), true);
        this.recordPosition(null);

        const playerSide = this.opening.playerSide || puzzle.FEN.split(' ')[1] || 'w';
        const orientation = playerSide === 'b' ? COLOR.black : COLOR.white;
        window.board.setOrientation(orientation);

        const instEl = document.getElementById('instruction');
        const bubbleText = document.querySelector('.instruction-text');
        if (instEl) instEl.textContent = 'Solve the puzzle! Find the best move.';
        if (bubbleText) bubbleText.textContent = 'Solve the puzzle! Find the best move.';

        const playerColor = playerSide === 'b' ? COLOR.black : COLOR.white;
        this.puzzlePlayerColor = playerColor;
        try { window.board.disableMoveInput(); } catch (e) {}

        if (typeof window.updatePuzzleUI === 'function') window.updatePuzzleUI();
        updateLineHeader('Puzzle', this.opening.displayName);
        updateProgress(0);
        renderMoveHistory([]);
        this.updateHistoryButtons();
        this.isTransitioning = false;
        this.playOpponentPuzzleMove();
        this.enableCurrentMoveInput();
    }

    resetCurrentPuzzle() {
        if (!this.currentPuzzle) return;

        this.isTransitioning = true;
        this._playing = false;
        try { window.board.disableMoveInput(); } catch (e) {}
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

        window.game.load(this.currentPuzzle.FEN);
        window.board.setPosition(window.game.fen(), true);
        this.recordPosition(null);

        const playerSide = this.opening.playerSide || this.currentPuzzle.FEN.split(' ')[1] || 'w';
        const orientation = playerSide === 'b' ? COLOR.black : COLOR.white;
        window.board.setOrientation(orientation);

        const instEl = document.getElementById('instruction');
        const bubbleText = document.querySelector('.instruction-text');
        if (instEl) instEl.textContent = 'Solve the puzzle! Find the best move.';
        if (bubbleText) bubbleText.textContent = 'Solve the puzzle! Find the best move.';

        const playerColor = playerSide === 'b' ? COLOR.black : COLOR.white;
        this.puzzlePlayerColor = playerColor;
        try { window.board.disableMoveInput(); } catch (e) {}

        updateLineHeader('Puzzle', this.opening.displayName);
        updateProgress(0);
        renderMoveHistory([]);
        this.updateHistoryButtons();
        this.isTransitioning = false;
        this.playOpponentPuzzleMove();
        this.enableCurrentMoveInput();
    }

    recordPosition(lastMove) {
        if (this.mode !== 'puzzle') return;

        this.positionHistory = this.positionHistory.slice(0, this.historyIndex + 1);
        this.positionHistory.push({
            fen: window.game.fen(),
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
        try { window.board.disableMoveInput(); } catch (e) {}
        clearHintSquare();
        clearCorrectCheckmark();
        clearIncorrectCross();

        window.game.load(entry.fen);
        this.moveIndex = entry.moveIndex;
        window.board.setPosition(window.game.fen(), true);
        updateEvalBar();
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
        let playerColor;
        if (this.mode === 'puzzle') {
            playerColor = this.puzzlePlayerColor || (window.game.turn() === 'b' ? COLOR.black : COLOR.white);
            if (window.game.turn() !== playerColor) return;
        } else {
            playerColor = window.game.turn() === 'b' ? COLOR.black : COLOR.white;
        }
        try { window.board.disableMoveInput(); } catch (e) {}
        window.board.enableMoveInput(moveInputHandler, playerColor);
    }

    playOpponentMoves() {
        if (this.mode === 'puzzle') {
            this.playOpponentPuzzleMove();
            return;
        }

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
            const side = window.game.turn();
            const isPuzzle = this.mode === 'puzzle';
            const isOpponentTurn = isPuzzle ? (this.moveIndex % 2 === 1) : (side !== this.opening.playerSide);

            if (isOpponentTurn) {
                const moveResult = window.game.move(next.san);
                if (!moveResult) {
                    finish();
                    return;
                }
                this.moveIndex++;
                window.board.setPosition(window.game.fen(), true);
                updateEvalBar();
                highlightLastMove(next.from, next.to);
                playMoveSound(moveResult);
                this.updateInstruction();
                if (isPuzzle) {
                    this.playedSans.push(moveResult.san);
                    this.recordPosition(next);
                    renderMoveHistory(this.playedSans);
                } else {
                    renderMoveHistory(window.game.history({ verbose: false }));
                }
                updateProgress(this.getProgress());

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
                    try { window.board.disableMoveInput(); } catch (e) {}
                    window.board.enableMoveInput(moveInputHandler, playerColor);
                }
                updateProgress(this.getProgress());
            }
        };

        playNext();
    }

    validateMove(from, to) {
        if (this.mode === 'puzzle') {
            const valid = this.evaluatePuzzleMove(from, to);
            if (!valid) {
                stats.attempts++;
                this.handlePuzzleFailure();
                return false;
            }
            return true;
        }

        const valid = this.evaluateOpeningMove(from, to);
        if (!valid) {
            stats.attempts++;
            this.wrongAttempts++;
            if (this.mode === 'drill') {
                this.endDrillGame();
            } else if (this.mode === 'time') {
                this.resetLine();
            }
            return false;
        }
        return true;
    }

    evaluatePuzzleMove(from, to) {
        const expected = this.moves[this.moveIndex];
        if (!expected) return false;
        const playerSide = this.puzzlePlayerColor || this.opening.playerSide;
        if (expected.color !== playerSide) return false;
        if (from === to) return false;

        const legalMoves = window.game.moves({ square: from, verbose: true });
        const isLegal = legalMoves.some(m => m.from === from && m.to === to);
        if (!isLegal) return false;

        return expected.from === from && expected.to === to;
    }

    evaluateOpeningMove(from, to) {
        const expected = this.moves[this.moveIndex];
        if (!expected) return false;
        if (from === to) return false;

        const legalMoves = window.game.moves({ square: from, verbose: true });
        const isLegal = legalMoves.some(m => m.from === from && m.to === to);
        if (!isLegal) return false;

        return expected.from === from && expected.to === to;
    }

    handlePuzzleFailure() {
        this.puzzleStreak = 0;
        savePuzzleStreak(this.puzzleStreak);
        if (!this.puzzleELOPenalized) {
            const puzzleRating = this.currentPuzzle?.Rating || 1500;
            const result = updatePuzzleELO(puzzleRating, 0);
            showFeedback(`${result.change} ELO`, 'error');
            if (typeof window.updatePuzzleUI === 'function') window.updatePuzzleUI();
            this.puzzleELOPenalized = true;
        }
    }

    handlePuzzleSuccess() {
        this.completed = true;
        this.puzzleStreak++;
        savePuzzleStreak(this.puzzleStreak);
        const puzzleRating = this.currentPuzzle?.Rating || 1500;
        const result = updatePuzzleELO(puzzleRating, 1);
        if (typeof window.updatePuzzleUI === 'function') window.updatePuzzleUI();
        playCompletionSound();
        showFeedback(`+${result.change} ELO`, 'success');
        setTimeout(() => {
            this.nextLine();
        }, 600);
    }

    playOpponentPuzzleMove() {
        if (this.completed || this._playing || this.isTransitioning) return;

        if (this.moveIndex >= this.moves.length) {
            if (!this.completed) {
                this.handlePuzzleSuccess();
            }
            return;
        }

        const expected = this.moves[this.moveIndex];
        if (!expected) return;

        const playerSide = this.puzzlePlayerColor || this.opening.playerSide;
        const isOpponentTurn = expected.color !== playerSide;
        if (!isOpponentTurn) return;

        this._playing = true;

        const playNext = () => {
            if (this.completed) { this._playing = false; return; }

            const next = this.moves[this.moveIndex];
            if (!next || next.color === playerSide) {
                this._playing = false;
                this.enableCurrentMoveInput();
                this.updateHistoryButtons();
                this.updateInstruction();
                return;
            }

            clearCorrectCheckmark();
            const moveResult = window.game.move(next.san);
            if (!moveResult) { this._playing = false; return; }

            this.moveIndex++;
            window.board.setPosition(window.game.fen(), true);
            updateEvalBar();
            highlightLastMove(next.from, next.to);
            playMoveSound(moveResult);
            this.playedSans.push(moveResult.san);
            this.recordPosition(next);
            renderMoveHistory(this.playedSans);
            updateProgress(this.getProgress());

            if (this.moveIndex >= this.moves.length) {
                this._playing = false;
                this.handlePuzzleSuccess();
            } else {
                setTimeout(playNext, 400);
            }
        };

        setTimeout(playNext, 400);
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

        const moveResult = window.game.move(expected.san);
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
            renderMoveHistory(window.game.history({ verbose: false }));
        }
        updateProgress(this.getProgress());
        updateEvalBar();

        this.findDescription();
    }

    showHint() {
        if (this.completed) return;
        const exp = this.moves[this.moveIndex];
        if (!exp) return;
        if (this.mode === 'puzzle' && exp.color !== this.puzzlePlayerColor) {
            this.playOpponentPuzzleMove();
            return;
        }

        if (this.hintShown) {
            clearHintSquare();
            this.hintShown = false;
            document.getElementById('btnHint').textContent = 'Hint';

            if (this.mode === 'puzzle') {
                this.handlePuzzleFailure();

                const moveResult = window.game.move(exp.san);
                if (moveResult) {
                    this.moveIndex++;
                    this.playedSans.push(moveResult.san);
                    window.board.setPosition(window.game.fen(), true);
                    highlightLastMove(exp.from, exp.to);
                    playMoveSound(moveResult);
                    this.recordPosition(exp);
                    renderMoveHistory(this.playedSans);
                    updateProgress(this.getProgress());

                    if (this.moveIndex < this.moves.length) {
                        setTimeout(() => this.playOpponentPuzzleMove(), 600);
                        return;
                    }
                }
                setTimeout(() => this.loadNextPuzzle(), 800);
                return;
            }

            const moveResult = window.game.move(exp.san);
            if (!moveResult) return;
            this.moveIndex++;
            window.board.setPosition(window.game.fen(), true);
            highlightLastMove(exp.from, exp.to);
            playMoveSound(moveResult);

            renderMoveHistory(window.game.history({ verbose: false }));
            updateProgress(this.getProgress());

            setTimeout(() => {
                this.playOpponentMoves();
            }, this.mode === 'drill' ? 250 : 500);
        } else {
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

        const side = window.game.turn();
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
        const fen = window.game.fen();
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
        const fen = window.game.fen();
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
        if (this.completed) return;
        this.completed = true;

        if (this.mode === 'drill') {
            this.drillScore++;
            if (typeof window.updateDrillUI === 'function') window.updateDrillUI();
            setTimeout(() => {
                this.nextLine();
            }, 400);
            return;
        }

        if (this.mode === 'time') {
            this.timeScore = (this.timeScore || 0) + 1;
            if (typeof window.updateTimeUI === 'function') window.updateTimeUI();
            setTimeout(() => {
                this.nextLine();
            }, 300);
            return;
        }

        if (this.mode === 'puzzle') {
            this.handlePuzzleSuccess();
            return;
        }

        stats.linesDone++;
        updateStats();

        const existing = getLineProgress(this.slug, this.linePgn);
        const isPerfect = this.wrongAttempts === 0;
        updateLineProgress(this.slug, this.linePgn, {
            completions: (existing.completions || 0) + 1,
            perfectAttempts: (existing.perfectAttempts || 0) + (isPerfect ? 1 : 0),
            lastAttemptTimestamp: Date.now(),
            confidence: Math.min(10, (existing.confidence || 0) + (isPerfect ? 2 : 1))
        });

        if (this.mode === 'learn') {
            markLineAsLearned(this.slug, this.linePgn);
            this.learnIndex++;
            this.saveSessionState();
        }

        updateModeStats();
        updateProgress(100);

        if (this.mode === 'practice') {
            const instEl = document.getElementById('instruction');
            if (instEl) instEl.textContent = 'Line complete!';
            const bubbleText = document.querySelector('.instruction-text');
            if (bubbleText) bubbleText.textContent = 'Line complete!';
            const learnedCount = getLearnedLines(this.slug).length;
            const totalLines = this.opening.lines?.length || 0;
            const nextLabel = document.getElementById('completeNextLabel');
            if (nextLabel) {
                nextLabel.textContent = totalLines > 0
                    ? `Next Line (${learnedCount}/${totalLines})`
                    : 'Next Line';
            }
            this.playCompletionConfetti();
            document.body.classList.add('line-complete-mobile');
            setTimeout(() => {
                if (!window.matchMedia('(max-width: 800px)').matches) {
                    this.nextLine();
                }
            }, 350);
            return;
        }

        const instEl = document.getElementById('instruction');
        if (instEl) instEl.textContent = 'Line complete!';
        const bubbleText = document.querySelector('.instruction-text');
        if (bubbleText) bubbleText.textContent = 'Line complete! Great job!';

        playCompletionSound();
        const learnedCount = getLearnedLines(this.slug).length;
        const totalLines = this.opening.lines?.length || 0;
        const nextLabel = document.getElementById('completeNextLabel');
        if (nextLabel) {
            nextLabel.textContent = totalLines > 0
                ? `Next Line (${learnedCount}/${totalLines})`
                : 'Next Line';
        }

        if (window.matchMedia('(max-width: 800px)').matches) {
            this.playCompletionConfetti();
            document.body.classList.add('line-complete-mobile');
            return;
        }

        this.playCompletionConfetti();

        setTimeout(() => {
            const overlay = document.getElementById('completionOverlay');
            const sub = document.getElementById('completionSub');
            if (overlay && sub) {
                const lineName = this.lineName || 'Unknown Line';
                const progressMsg = totalLines > 0 ? `(${learnedCount}/${totalLines} discovered)` : '';
                sub.textContent = `You completed "${lineName}"! ${isPerfect ? 'Perfect run! ' : ''}${progressMsg}`;
                overlay.classList.add('open');
            }
        }, 1200);
    }

    playCompletionConfetti() {
        if (typeof confetti === 'undefined') return;

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
}

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

function attachPuzzleMetadata(puzzle, moves, playerSide) {
    const solution = moves.map(m => m.san);
    const toPlay = puzzle.FEN.split(' ')[1] === 'b' ? 'black' : 'white';
    puzzle._solution = solution;
    puzzle._toPlay = toPlay;
    puzzle._playerMoveIndices = [];
    moves.forEach((m, i) => {
        if (m.color === playerSide) {
            puzzle._playerMoveIndices.push(i);
        }
    });
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
