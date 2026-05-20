window.userProgress = window.userProgress || {};

export function loadLocalProgress() {
    try {
        const stored = localStorage.getItem('chesspeps_progress');
        if (stored) {
            window.userProgress = JSON.parse(stored);
        }
    } catch (e) {}
    try {
        const unlocked = localStorage.getItem('chesspeps_drill_unlocks');
        if (unlocked) {
            window.drillUnlocks = JSON.parse(unlocked);
        }
    } catch (e) {}
}

export function saveLocalProgress() {
    localStorage.setItem('chesspeps_progress', JSON.stringify(window.userProgress));
}

export function getLineProgress(slug, linePgn) {
    return window.userProgress[slug]?.lines?.[linePgn] || {};
}

export function updateLineProgress(slug, linePgn, update) {
    if (!window.userProgress[slug]) window.userProgress[slug] = { lines: {} };
    if (!window.userProgress[slug].lines[linePgn]) window.userProgress[slug].lines[linePgn] = {};
    Object.assign(window.userProgress[slug].lines[linePgn], update);
    saveLocalProgress();
    syncToCloud();
}

const K_FACTOR = 32;

export function getPuzzleELO() {
    return window.userProgress.puzzleELO || 1500;
}

export function updatePuzzleELO(puzzleRating, score) {
    const playerRating = getPuzzleELO();
    const expectedScore = 1 / (1 + Math.pow(10, (puzzleRating - playerRating) / 400));
    const change = Math.round(K_FACTOR * (score - expectedScore));
    const newRating = Math.max(400, playerRating + change);
    window.userProgress.puzzleELO = newRating;
    saveLocalProgress();
    syncToCloud();
    return { change, newRating };
}

export function findPuzzleInELORange(puzzles, elo, range = 150) {
    const candidates = puzzles.filter(p => Math.abs(p.Rating - elo) <= range);
    if (candidates.length === 0 && range < 1000) {
        return findPuzzleInELORange(puzzles, elo, range + 100);
    }
    return candidates;
}

export function getLearnedLines(slug) {
    return window.userProgress[slug]?.learnedLines || [];
}

export function markLineAsLearned(slug, linePgn) {
    if (!window.userProgress[slug]) window.userProgress[slug] = { lines: {}, learnedLines: [] };
    if (!window.userProgress[slug].learnedLines) window.userProgress[slug].learnedLines = [];
    if (!window.userProgress[slug].learnedLines.includes(linePgn)) {
        window.userProgress[slug].learnedLines.push(linePgn);
        saveLocalProgress();
        syncToCloud();
    }
}

let _syncVersion = 0;
let _syncDebounceTimer = null;

export async function syncToCloud() {
    const user = window.currentUser;
    const supabase = window.supabaseClient;
    if (!user || !supabase) {
        window.lastSyncError = 'No user or no supabase client';
        return;
    }

    _syncVersion++;
    const thisVersion = _syncVersion;

    clearTimeout(_syncDebounceTimer);
    _syncDebounceTimer = setTimeout(async () => {
        if (thisVersion !== _syncVersion) return;
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
    }, 500);
}