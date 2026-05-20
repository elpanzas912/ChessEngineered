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
    upsertLineProgress(slug, linePgn, window.userProgress[slug].lines[linePgn]);
}

export function normalizePuzzleELO(value, fallback = 1500) {
    const direct = Number(value);
    if (Number.isFinite(direct)) return Math.max(400, Math.round(direct));

    if (value && typeof value === 'object') {
        const preferredKeys = ['puzzleELO', 'puzzle_elo', 'elo', 'rating', 'newRating'];
        for (const key of preferredKeys) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                const normalized = normalizePuzzleELO(value[key], NaN);
                if (Number.isFinite(normalized)) return normalized;
            }
        }

        for (const nestedValue of Object.values(value)) {
            const normalized = normalizePuzzleELO(nestedValue, NaN);
            if (Number.isFinite(normalized)) return normalized;
        }
    }

    return fallback;
}

export function getPuzzleELO() {
    const rating = normalizePuzzleELO(window.userProgress?.puzzleELO, 1500);
    if (!window.userProgress) window.userProgress = {};
    if (window.userProgress.puzzleELO !== rating) {
        window.userProgress.puzzleELO = rating;
        saveLocalProgress();
    }
    return rating;
}

export function getPuzzleStreak() {
    const streak = normalizePuzzleCount(window.userProgress?.puzzleStreak, 0);
    if (!window.userProgress) window.userProgress = {};
    if (window.userProgress.puzzleStreak !== streak) {
        window.userProgress.puzzleStreak = streak;
        saveLocalProgress();
    }
    return streak;
}

export function savePuzzleStreak(streak) {
    window.userProgress.puzzleStreak = normalizePuzzleCount(streak, 0);
    saveLocalProgress();
    syncToCloud();
}

export function resetPuzzleStreak() {
    window.userProgress.puzzleStreak = 0;
    saveLocalProgress();
    syncToCloud();
}

export function updatePuzzleELO(puzzleRating, score) {
    const playerRating = getPuzzleELO();
    const normalizedPuzzleRating = normalizePuzzleELO(puzzleRating, 1500);
    const expectedScore = 1 / (1 + Math.pow(10, (normalizedPuzzleRating - playerRating) / 400));
    const change = Math.round(K_FACTOR * (score - expectedScore));
    const newRating = Math.max(400, playerRating + change);
    window.userProgress.puzzleELO = newRating;
    saveLocalProgress();
    syncToCloud();
    upsertPuzzleRating(newRating);
    return { change, newRating };
}

export function findPuzzleInELORange(puzzles, elo, range = 150) {
    const targetElo = normalizePuzzleELO(elo, 1500);
    const candidates = puzzles.filter(p => Math.abs(normalizePuzzleELO(p.Rating, 1500) - targetElo) <= range);
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
        insertLearnedLine(slug, linePgn);
    }
}

const K_FACTOR = 32;

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

// ── Normalized table writes ──

async function upsertLineProgress(slug, linePgn, data) {
    const supabase = window.supabaseClient;
    const user = window.currentUser;
    if (!supabase || !user) return;

    const row = {
        user_id: user.id,
        opening_slug: slug,
        line_pgn: linePgn,
        completions: data.completions || 0,
        perfect_attempts: data.perfectAttempts || 0,
        last_attempt_timestamp: data.lastAttemptTimestamp || null,
        confidence: data.confidence || 0,
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase
        .from('line_progress')
        .upsert(row, { onConflict: 'user_id,opening_slug,line_pgn' });
    if (error) console.warn('line_progress upsert failed:', error.message);

    upsertOpeningProgress(slug);
}

async function upsertOpeningProgress(slug) {
    const supabase = window.supabaseClient;
    const user = window.currentUser;
    if (!supabase || !user) return;

    const slugData = window.userProgress[slug] || {};
    const row = {
        user_id: user.id,
        opening_slug: slug,
        drill_high_score: slugData.drillHighScore || 0,
        time_high_score: slugData.timeHighScore || 0,
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase
        .from('opening_progress')
        .upsert(row, { onConflict: 'user_id,opening_slug' });
    if (error) console.warn('opening_progress upsert failed:', error.message);
}

async function insertLearnedLine(slug, linePgn) {
    const supabase = window.supabaseClient;
    const user = window.currentUser;
    if (!supabase || !user) return;

    const { error } = await supabase
        .from('learned_lines')
        .upsert({ user_id: user.id, opening_slug: slug, line_pgn: linePgn }, { onConflict: 'user_id,opening_slug,line_pgn' });
    if (error) console.warn('learned_lines upsert failed:', error.message);
}

async function upsertPuzzleRating(elo) {
    const supabase = window.supabaseClient;
    const user = window.currentUser;
    if (!supabase || !user) return;

    const { error } = await supabase
        .from('puzzle_ratings')
        .upsert({ user_id: user.id, puzzle_elo: elo, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) console.warn('puzzle_ratings upsert failed:', error.message);
}

// ── Load cloud progress from normalized tables ──

export async function loadCloudProgressNormalized(userId) {
    const supabase = window.supabaseClient;
    if (!supabase) return;

    try {
        // Use the RPC function to reconstruct progress as JSONB
        const { data, error } = await supabase
            .rpc('get_user_progress', { p_user_id: userId });

        if (error) {
            // Fallback to old JSONB column if RPC fails (migration not yet applied)
            console.warn('get_user_progress RPC failed, falling back to JSONB:', error.message);
            await loadCloudProgressFallback(userId);
            return;
        }

        if (data) {
            const local = JSON.parse(localStorage.getItem('chesspeps_progress') || '{}');
            const merged = mergeProgress(local, data);
            window.userProgress = merged;
            localStorage.setItem('chesspeps_progress', JSON.stringify(merged));
        }
    } catch (e) {
        console.warn('loadCloudProgressNormalized error:', e);
        await loadCloudProgressFallback(userId);
    }
}

async function loadCloudProgressFallback(userId) {
    const supabase = window.supabaseClient;
    if (!supabase) return;

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('user_progress')
            .eq('id', userId)
            .single();

        if (data && data.user_progress) {
            const local = JSON.parse(localStorage.getItem('chesspeps_progress') || '{}');
            const merged = mergeProgress(local, data.user_progress);
            window.userProgress = merged;
            localStorage.setItem('chesspeps_progress', JSON.stringify(merged));
        }
    } catch (e) { /* silently ignore */ }
}

function mergeProgress(local, cloud) {
    const merged = { ...cloud };
    for (const slug in local) {
        if (!merged[slug]) merged[slug] = local[slug];
        else {
            const localLearned = local[slug].learnedLines || [];
            const cloudLearned = merged[slug].learnedLines || [];
            merged[slug].learnedLines = [...new Set([...cloudLearned, ...localLearned])];
            const localLines = local[slug].lines || {};
            const cloudLines = merged[slug].lines || {};
            for (const pgn in localLines) {
                if (!cloudLines[pgn] || (localLines[pgn].lastAttemptTimestamp > cloudLines[pgn].lastAttemptTimestamp)) {
                    cloudLines[pgn] = localLines[pgn];
                }
            }
            merged[slug].lines = cloudLines;
        }
    }
    return merged;
}

export function normalizePuzzleCount(value, fallback = 0) {
    const direct = Number(value);
    if (Number.isFinite(direct)) return Math.max(0, Math.round(direct));

    if (value && typeof value === 'object') {
        const preferredKeys = ['puzzleStreak', 'puzzle_streak', 'streak', 'count', 'value'];
        for (const key of preferredKeys) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                const normalized = normalizePuzzleCount(value[key], NaN);
                if (Number.isFinite(normalized)) return normalized;
            }
        }

        for (const nestedValue of Object.values(value)) {
            const normalized = normalizePuzzleCount(nestedValue, NaN);
            if (Number.isFinite(normalized)) return normalized;
        }
    }

    return fallback;
}
