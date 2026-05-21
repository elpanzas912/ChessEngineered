import { initBoard, moveInputHandler } from './modules/board.js?v=32';
import { loadLocalProgress, syncToCloud } from './modules/progress.js';
import { Trainer } from './modules/trainer.js?v=32';
import { stats } from './modules/stats.js';
import { renderLinesList, renderLineDropdown, updateLineHeader, updateProgress, updateStats, updateModeStats, showFeedback } from './modules/ui.js?v=33';
import { updateEvalBar } from './modules/evaluator.js';
import { getLearnedLines, getPuzzleELO, getPuzzleStreak } from './modules/progress.js';

let db = {};
let game = null;
let board = null;
let trainer = null;

window.db = db;
window.game = game;
window.board = board;
window.trainer = trainer;
window.stats = stats;
window.getPuzzleELO = getPuzzleELO;
window.getPuzzleStreak = getPuzzleStreak;

// ── Load Database ──
fetch('data/openings.json')
    .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
    })
    .then(data => {
        Object.assign(db, data.openings || {});
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
    window.game = game;
    board = initBoard(document.getElementById('board'));
    window.board = board;

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
    const completeRestartBtn = document.getElementById('btnCompleteRestart');
    if (completeRestartBtn) {
        completeRestartBtn.addEventListener('click', () => {
            document.body.classList.remove('line-complete-mobile');
            trainer && trainer.resetLine();
        });
    }
    const completeNextBtn = document.getElementById('btnCompleteNext');
    if (completeNextBtn) {
        completeNextBtn.addEventListener('click', () => {
            document.body.classList.remove('line-complete-mobile');
            trainer && trainer.nextLine();
        });
    }
    document.getElementById('btnHint').addEventListener('click', () => trainer && trainer.showHint());

    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.code === 'Space') {
            e.preventDefault();
            trainer && trainer.nextLine();
        }
        if (e.code === 'KeyH') {
            e.preventDefault();
            trainer && trainer.showHint();
        }
        if (e.code === 'KeyS') {
            e.preventDefault();
            trainer && trainer.skipLine();
        }
        if (e.code === 'ArrowLeft') {
            e.preventDefault();
            if (!trainer) return;
            if (trainer.mode === 'puzzle') trainer.navigatePuzzleHistory(-1);
            else trainer.resetLine();
        }
        if (e.code === 'ArrowRight') {
            e.preventDefault();
            if (!trainer) return;
            if (trainer.mode === 'puzzle') trainer.navigatePuzzleHistory(1);
            else trainer.nextLine();
        }
    });

    window.addEventListener('resize', () => {
        if (board?.resize) board.resize();
        else if (board?.view?.handleResize) board.view.handleResize();
    });

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

function onOpeningChange(e) {
    const slug = e.target.value;
    if (!slug) return;
    if (!trainer) trainer = new Trainer();
    window.trainer = trainer;
    trainer.loadOpening(slug);
    updateStats();
}

function toggleMode() {
    if (!trainer) return;
    const learned = getLearnedLines(trainer.slug);
    const modes = learned.length > 0 ? ['learn', 'practice'] : ['learn'];
    const currentIdx = modes.indexOf(trainer.mode);
    const nextIdx = (currentIdx + 1) % modes.length;
    const newMode = modes[nextIdx];
    if (typeof window.setMode === 'function') {
        window.setMode(newMode);
    } else {
        trainer.mode = newMode;
    }
}

window.nextLineAfterComplete = function () {
    const overlay = document.getElementById('completionOverlay');
    if (overlay) overlay.classList.remove('open');
    document.body.classList.remove('line-complete-mobile');
    if (trainer) trainer.nextLine();
};

window.debugProgress = function () {
    return {
        userProgress: window.userProgress,
        currentUser: window.currentUser ? window.currentUser.email : null,
        lastSyncError: window.lastSyncError,
        lastSyncSuccess: window.lastSyncSuccess,
        localStorage: JSON.parse(localStorage.getItem('chesspeps_progress') || '{}')
    };
};
