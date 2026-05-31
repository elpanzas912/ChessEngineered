import { initBoard, moveInputHandler, applyBoardAppearance } from './modules/board.js';
import { loadLocalProgress, syncToCloud, recordTrainingTime, saveOpeningHighScores } from './modules/progress.js';
import { Trainer } from './modules/trainer.js';
import { stats } from './modules/stats.js';
import { renderLinesList, renderLineDropdown, updateLineHeader, updateProgress, updateStats, updateModeStats, showFeedback } from './modules/ui.js';
import { updateEvalBar } from './modules/evaluator.js';
import { getLearnedLines, getPuzzleELO, getPuzzleStreak } from './modules/progress.js';
import { playTenSecondsSound } from './modules/audio.js';

let db = {};
let catalog = {};
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
window.saveOpeningHighScores = saveOpeningHighScores;
window.playTenSecondsSound = playTenSecondsSound;

function installDailyStreakToast() {
    window.addEventListener('chessengineered:daily-streak-earned', (event) => {
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

// ── Load Catalog ──
fetch('data/openings-catalog.json')
    .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
    })
    .then(data => {
        catalog = data.openings || {};
        populateSelector();
        initApp();
    })
    .catch(err => {
        showLoadError('Error loading opening catalog: ' + err.message);
    });

function showLoadError(message) {
    const fb = document.getElementById('feedback');
    if (fb) {
        fb.textContent = message;
        fb.className = 'feedback error';
    }
}

async function getOpeningAccessToken() {
    if (!window.auth?.getSession) return null;
    const { data } = await window.auth.getSession();
    return data?.session?.access_token || null;
}

async function fetchProtectedOpening(slug) {
    if (db[slug]?.lines?.length) return db[slug];
    return requestProtectedOpening(slug);
}

async function requestProtectedOpening(slug) {
    const token = await getOpeningAccessToken();
    const headers = {
        apikey: window.SUPABASE_KEY || ''
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${window.SUPABASE_URL}/functions/v1/get-opening?slug=${encodeURIComponent(slug)}`, {
        headers
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
        const message = payload.error || `HTTP ${res.status}`;
        const error = new Error(message);
        error.status = res.status;
        throw error;
    }
    db[slug] = payload.opening;
    return db[slug];
}

function populateSelector() {
    const sel = document.getElementById('openingSelect');
    if (!sel) return;
    const slugs = Object.keys(catalog).sort();
    for (const slug of slugs) {
        const opt = document.createElement('option');
        opt.value = slug;
        opt.textContent = catalog[slug].displayName || slug;
        sel.appendChild(opt);
    }
}

function getSetting(key, defaultValue = true) {
    const stored = localStorage.getItem(`chessengineered_${key}`);
    if (stored === null) return defaultValue;
    return stored !== 'false';
}

function setSetting(key, value) {
    localStorage.setItem(`chessengineered_${key}`, String(Boolean(value)));
}

function applyTrainerSettings() {
    document.body.classList.toggle('settings-hide-eval', !getSetting('show_eval'));
    const dialogBehavior = localStorage.getItem('chessengineered_dialog_behavior') || 'auto';
    document.body.classList.toggle('dialog-setting-open', dialogBehavior === 'open');
    document.body.classList.toggle('dialog-setting-closed', dialogBehavior === 'closed');
}

function getBoardTheme() {
    const theme = localStorage.getItem('chessengineered_board_theme') || localStorage.getItem('chessengineered_boardTheme') || 'green';
    return theme === 'brown' ? 'chessboard-js' : theme;
}

function updateSettingsMenuState() {
    const toggles = document.querySelectorAll('[data-setting-toggle]');
    toggles.forEach(btn => {
        const key = btn.dataset.settingToggle;
        const checked = getSetting(key);
        btn.setAttribute('aria-checked', String(checked));
    });

    const pieceSelect = document.getElementById('settingsPieceSet');
    if (pieceSelect) pieceSelect.value = localStorage.getItem('chessengineered_piece_set') || 'staunty';

    const themeSelect = document.getElementById('settingsBoardTheme');
    if (themeSelect) themeSelect.value = getBoardTheme();

    const arrowSelect = document.getElementById('settingsTrainingArrows');
    if (arrowSelect) arrowSelect.value = localStorage.getItem('chessengineered_training_arrows') || 'on';

    const dialogSelect = document.getElementById('settingsDialogBehavior');
    if (dialogSelect) dialogSelect.value = localStorage.getItem('chessengineered_dialog_behavior') || 'auto';
}

async function copyText(text) {
    if (!text) return;
    try {
        await navigator.clipboard.writeText(text);
    } catch (e) {
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        area.remove();
    }
}

function installSettingsMenu() {
    const button = document.getElementById('btnSettings');
    const menu = document.getElementById('settingsMenu');
    if (!button || !menu) return;

    const closeMenu = () => {
        menu.classList.remove('open');
        button.setAttribute('aria-expanded', 'false');
    };

    const openMenu = () => {
        updateSettingsMenuState();
        menu.classList.add('open');
        button.setAttribute('aria-expanded', 'true');
    };

    button.addEventListener('click', event => {
        event.stopPropagation();
        menu.classList.contains('open') ? closeMenu() : openMenu();
    });

    menu.addEventListener('click', event => {
        event.stopPropagation();
        const toggle = event.target.closest('[data-setting-toggle]');
        if (toggle) {
            const key = toggle.dataset.settingToggle;
            const next = !getSetting(key);
            setSetting(key, next);
            applyTrainerSettings();
            updateSettingsMenuState();
            return;
        }

        const action = event.target.closest('[data-settings-action]')?.dataset.settingsAction;
        if (!action) return;

        if (action === 'copy-fen') {
            copyText(window.game?.fen?.() || '');
            closeMenu();
        } else if (action === 'copy-pgn') {
            copyText(window.game?.pgn?.() || '');
            closeMenu();
        } else if (action === 'lichess') {
            const fen = window.game?.fen?.();
            if (fen) window.open(`https://lichess.org/analysis/${fen.replace(/\s/g, '_')}`, '_blank', 'noopener');
            closeMenu();
        } else if (action === 'select-line') {
            closeMenu();
            window.toggleLineDropdown?.();
        } else if (action === 'reset-line') {
            trainer?.resetOpeningProgress?.();
            closeMenu();
        }
    });

    const pieceSelect = document.getElementById('settingsPieceSet');
    if (pieceSelect) {
        pieceSelect.addEventListener('change', () => {
            localStorage.setItem('chessengineered_piece_set', pieceSelect.value);
            applyBoardAppearance(window.board, { pieceSet: pieceSelect.value });
        });
    }

    const themeSelect = document.getElementById('settingsBoardTheme');
    if (themeSelect) {
        themeSelect.addEventListener('change', () => {
            localStorage.setItem('chessengineered_board_theme', themeSelect.value);
            applyBoardAppearance(window.board, { theme: themeSelect.value });
        });
    }

    const arrowSelect = document.getElementById('settingsTrainingArrows');
    if (arrowSelect) {
        arrowSelect.addEventListener('change', () => {
            localStorage.setItem('chessengineered_training_arrows', arrowSelect.value);
            if (arrowSelect.value === 'off') {
                window.board?.removeArrows?.();
                window.board?.removeMarkers?.();
            }
        });
    }

    const dialogSelect = document.getElementById('settingsDialogBehavior');
    if (dialogSelect) {
        dialogSelect.addEventListener('change', () => {
            localStorage.setItem('chessengineered_dialog_behavior', dialogSelect.value);
            applyTrainerSettings();
        });
    }

    document.addEventListener('click', closeMenu);
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeMenu();
    });

    applyTrainerSettings();
    updateSettingsMenuState();
}

// ── Init ──
function initApp() {
    loadLocalProgress();
    game = new Chess();
    window.game = game;
    board = initBoard(document.getElementById('board'));
    window.board = board;
    installSettingsMenu();

    const selectEl = document.getElementById('openingSelect');
    if (selectEl) {
        selectEl.addEventListener('change', onOpeningChange);
    }
    document.getElementById('btnNext').addEventListener('click', () => {
        if (!trainer) return;
        trainer.navigateMoveHistory(1);
    });
    const prevBtn = document.getElementById('btnPrev');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (!trainer) return;
            trainer.navigateMoveHistory(-1);
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
    const qaSolveBtn = document.getElementById('btnQaSolve');
    if (qaSolveBtn) {
        qaSolveBtn.addEventListener('click', () => {
            if (!trainer?.solveCurrentLearnLineForTesting()) {
                showFeedback('Solve QA is only available for an active Learn line.', 'error');
            }
        });
    }

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
            trainer.navigateMoveHistory(-1);
        }
        if (e.code === 'ArrowRight') {
            e.preventDefault();
            if (!trainer) return;
            trainer.navigateMoveHistory(1);
        }
    });

    window.addEventListener('resize', () => {
        if (board?.resize) board.resize();
        else if (board?.view?.handleResize) board.view.handleResize();
    });

    // Auto-load from URL or global variable if slug present
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug') || window.openingSlug;
    if (slug && catalog[slug]) {
        loadOpeningBySlug(slug);
    }
}

async function loadOpeningBySlug(slug) {
    try {
        const opening = await fetchProtectedOpening(slug);
        trainer = trainer || new Trainer();
        window.trainer = trainer;
        trainer.loadOpening(slug);
        window.trainingTimeTracker?.start(trainer.mode);
        const nameEl = document.getElementById('openingName');
        if (nameEl) nameEl.textContent = opening.displayName;
        const selectEl = document.getElementById('openingSelect');
        if (selectEl) selectEl.value = slug;
    } catch (err) {
        const message = err.status === 403
            ? 'This opening is locked. Upgrade to access it.'
            : err.message;
        showLoadError(message);
        if (err.status === 401 && typeof window.openAuthModal === 'function') {
            window.openAuthModal();
        }
        if (err.status === 403) {
            const overlay = document.getElementById('paywallOverlay');
            const layout = document.querySelector('.trainer-layout');
            if (overlay) overlay.style.display = 'flex';
            if (layout) layout.style.display = 'none';
        }
    }
}

async function onOpeningChange(e) {
    const slug = e.target.value;
    if (!slug) return;
    await loadOpeningBySlug(slug);
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
        localStorage: JSON.parse(localStorage.getItem('chessengineered_progress') || '{}')
    };
};
