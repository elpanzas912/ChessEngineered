import { initBoard, moveInputHandler } from './modules/board.js?v=38';
import { loadLocalProgress, syncToCloud, recordTrainingTime } from './modules/progress.js?v=6';
import { Trainer } from './modules/trainer.js?v=45';
import { stats } from './modules/stats.js';
import { renderLinesList, renderLineDropdown, updateLineHeader, updateProgress, updateStats, updateModeStats, showFeedback } from './modules/ui.js?v=40';
import { updateEvalBar } from './modules/evaluator.js';
import { getLearnedLines, getPuzzleELO, getPuzzleStreak } from './modules/progress.js?v=6';

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

function installDailyStreakToast() {
    window.addEventListener('chesspeps:daily-streak-earned', (event) => {
        const count = Number(event.detail?.count) || 1;
        const existing = document.querySelector('.daily-streak-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'daily-streak-toast';
        toast.setAttribute('role', 'status');
        toast.innerHTML = `
            <span class="daily-streak-toast-flame" aria-hidden="true">
                <svg viewBox="0 0 70 85" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 50.5C4 67.2 17.9 80.8 35 80.8S66 67.2 66 50.5c0-7.1-2.5-13.5-6.6-18.7L39.5 6.6a5.74 5.74 0 0 0-9 0L19.2 20.9l-6.4-4A5.75 5.75 0 0 0 4 21.7v28.8Z" fill="#FF9600"/>
                    <path d="M24.6 47.6c.1-.1.1-.1.1-.2l8.4-10.5a2.47 2.47 0 0 1 3.8 0l8.4 10.5.1.2a12.66 12.66 0 0 1 2.8 8c0 7.1-5.9 12.9-13.2 12.9s-13.2-5.8-13.2-12.9c0-3 1-5.8 2.8-8Z" fill="#FFC800"/>
                </svg>
            </span>
            <span class="daily-streak-toast-copy">
                <strong>${count}</strong>
                <span>day streak</span>
            </span>
        `;
        document.body.appendChild(toast);
        window.setTimeout(() => toast.classList.add('leaving'), 2100);
        window.setTimeout(() => toast.remove(), 2600);
    });
}

installDailyStreakToast();

function installTrainingTimeTracker() {
    const trackedModes = new Set(['learn', 'practice', 'drill', 'time', 'puzzle']);
    let activeMode = null;
    let startedAt = 0;

    function normalizedMode(mode) {
        return trackedModes.has(mode) ? mode : null;
    }

    function canTrack() {
        return Boolean(window.trainer) && document.visibilityState !== 'hidden';
    }

    function stop() {
        if (activeMode && startedAt) {
            recordTrainingTime(activeMode, Date.now() - startedAt);
        }
        activeMode = null;
        startedAt = 0;
    }

    function start(mode) {
        stop();
        const nextMode = normalizedMode(mode);
        if (!nextMode || !canTrack()) return;
        activeMode = nextMode;
        startedAt = Date.now();
    }

    function switchMode(mode) {
        start(mode);
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            stop();
        } else if (window.trainer) {
            start(window.trainer.mode);
        }
    });

    window.addEventListener('beforeunload', stop);
    window.trainingTimeTracker = { start, stop, switchMode };
}

installTrainingTimeTracker();

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
        window.trainingTimeTracker?.start(trainer.mode);
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
    window.trainingTimeTracker?.start(trainer.mode);
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
