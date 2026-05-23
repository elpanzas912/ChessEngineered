window.userProgress = window.userProgress || {};

const NON_OPENING_PROGRESS_KEYS = new Set(['puzzleELO', 'puzzleStreak', 'dailyStreak']);

function getLocalDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function daysBetween(dateA, dateB) {
    const [ay, am, ad] = dateA.split('-').map(Number);
    const [by, bm, bd] = dateB.split('-').map(Number);
    if (!ay || !am || !ad || !by || !bm || !bd) return null;
    const a = Date.UTC(ay, am - 1, ad);
    const b = Date.UTC(by, bm - 1, bd);
    return Math.round((b - a) / 86400000);
}

function announceDailyStreak(streak) {
    try {
        const payload = {
            date: streak.lastActiveDate,
            count: streak.count,
            seen: false,
            timestamp: Date.now()
        };
        localStorage.setItem('chesspeps_daily_streak_earned', JSON.stringify(payload));
        if (typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
            window.dispatchEvent(new CustomEvent('chesspeps:daily-streak-earned', { detail: payload }));
        }
    } catch (e) {}
}

export function normalizeDailyStreak(value) {
    const count = Math.max(0, Math.round(Number(value?.count) || 0));
    const lastActiveDate = typeof value?.lastActiveDate === 'string' ? value.lastActiveDate : null;
    const activityDates = value?.activityDates && typeof value.activityDates === 'object' ? value.activityDates : {};
    const resetAt = typeof value?.resetAt === 'string' ? value.resetAt : null;
    return { count, lastActiveDate, activityDates, resetAt };
}

export function getDailyStreak() {
    if (!window.userProgress) window.userProgress = {};
    const streak = normalizeDailyStreak(window.userProgress.dailyStreak);
    window.userProgress.dailyStreak = streak;
    return streak;
}

export function recordDailyActivity() {
    if (!window.userProgress) window.userProgress = {};
    const today = getLocalDateKey();
    const current = getDailyStreak();

    if (current.lastActiveDate === today) {
        current.activityDates[today] = (current.activityDates[today] || 0) + 1;
        window.userProgress.dailyStreak = current;
        saveLocalProgress();
        syncToCloud();
        return current;
    }

    const gap = current.lastActiveDate ? daysBetween(current.lastActiveDate, today) : null;
    const nextCount = gap === 1 ? current.count + 1 : 1;
    const next = {
        count: nextCount,
        lastActiveDate: today,
        activityDates: {
            ...current.activityDates,
            [today]: (current.activityDates[today] || 0) + 1
        }
    };

    window.userProgress.dailyStreak = next;
    saveLocalProgress();
    syncToCloud();
    announceDailyStreak(next);
    return next;
}

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
            let cloud = data;
            const profile = await supabase
                .from('profiles')
                .select('user_progress')
                .eq('id', userId)
                .single();
            if (profile.data?.user_progress) {
                cloud = mergeProgress(profile.data.user_progress, data);
            }
            const merged = mergeProgress(local, cloud);
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
    merged.dailyStreak = mergeDailyStreak(local?.dailyStreak, cloud?.dailyStreak);
    if (local?.puzzleStreak !== undefined) {
        merged.puzzleStreak = Math.max(
            normalizePuzzleCount(local.puzzleStreak, 0),
            normalizePuzzleCount(cloud?.puzzleStreak, 0)
        );
    }
    for (const slug in local) {
        if (NON_OPENING_PROGRESS_KEYS.has(slug)) continue;
        if (!merged[slug]) merged[slug] = local[slug];
        else {
            const localLearned = local[slug].learnedLines || [];
            const cloudLearned = merged[slug].learnedLines || [];
            merged[slug].learnedLines = [...new Set([...cloudLearned, ...localLearned])];
            const localLines = local[slug].lines || {};
            const cloudLines = merged[slug].lines || {};
            for (const pgn in localLines) {
                cloudLines[pgn] = mergeLineProgress(localLines[pgn], cloudLines[pgn]);
            }
            merged[slug].lines = cloudLines;
        }
    }
    return merged;
}

function mergeLineProgress(localLine = {}, cloudLine = {}) {
    const localTimestamp = Number(localLine?.lastAttemptTimestamp) || 0;
    const cloudTimestamp = Number(cloudLine?.lastAttemptTimestamp) || 0;
    const newer = localTimestamp >= cloudTimestamp ? localLine : cloudLine;

    return {
        ...cloudLine,
        ...localLine,
        ...newer,
        completions: Math.max(Number(localLine?.completions) || 0, Number(cloudLine?.completions) || 0),
        perfectAttempts: Math.max(Number(localLine?.perfectAttempts) || 0, Number(cloudLine?.perfectAttempts) || 0),
        practiceCompletions: Math.max(Number(localLine?.practiceCompletions) || 0, Number(cloudLine?.practiceCompletions) || 0),
        practicePerfectAttempts: Math.max(Number(localLine?.practicePerfectAttempts) || 0, Number(cloudLine?.practicePerfectAttempts) || 0),
        confidence: Math.max(Number(localLine?.confidence) || 0, Number(cloudLine?.confidence) || 0),
        lastAttemptTimestamp: Math.max(localTimestamp, cloudTimestamp) || null
    };
}

function mergeDailyStreak(local, cloud) {
    const localStreak = normalizeDailyStreak(local);
    const cloudStreak = normalizeDailyStreak(cloud);
    if (cloudStreak.resetAt && (!localStreak.resetAt || cloudStreak.resetAt > localStreak.resetAt)) {
        return cloudStreak;
    }
    const activityDates = { ...cloudStreak.activityDates };
    for (const [date, count] of Object.entries(localStreak.activityDates)) {
        activityDates[date] = Math.max(Number(activityDates[date]) || 0, Number(count) || 0);
    }

    const lastActiveDate = [localStreak.lastActiveDate, cloudStreak.lastActiveDate]
        .filter(Boolean)
        .sort()
        .pop() || null;

    return {
        count: Math.max(localStreak.count, cloudStreak.count),
        lastActiveDate,
        activityDates
    };
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
