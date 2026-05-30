window.userProgress = window.userProgress || {};

const NON_OPENING_PROGRESS_KEYS = new Set(['puzzleELO', 'puzzleStreak', 'dailyStreak', 'trainingTime', 'accuracy']);
const TRAINING_TIME_MODES = ['learn', 'practice', 'drill', 'time', 'puzzle'];
const ACCURACY_MODES = ['learn', 'practice'];
const ACCURACY_RESULTS = ['correct', 'incorrect'];
const PROGRESS_RESET_VERSION = '2026-05-30-reset-1';

function ensureProgressResetVersion() {
    if (typeof window.ensureProgressResetVersion === 'function') {
        window.ensureProgressResetVersion();
        return;
    }
    const versionKey = 'chessengineered_progress_reset_version';
    if (localStorage.getItem(versionKey) === PROGRESS_RESET_VERSION) return;
    Object.keys(localStorage)
        .filter(key => (
            key === 'chessengineered_progress' ||
            key === 'chessengineered_drill_unlocks' ||
            key === 'chessengineered_daily_streak_earned' ||
            key === 'chessengineered_usage' ||
            key.startsWith('chessengineered_opening_cache_') ||
            key.startsWith('chessengineered_session_')
        ))
        .forEach(key => localStorage.removeItem(key));
    localStorage.setItem(versionKey, PROGRESS_RESET_VERSION);
    window.userProgress = {};
}

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
        localStorage.setItem('chessengineered_daily_streak_earned', JSON.stringify(payload));
        if (typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
            window.dispatchEvent(new CustomEvent('chessengineered:daily-streak-earned', { detail: payload }));
        }
    } catch (e) {}
}

export function normalizeDailyStreak(value) {
    let count = Math.max(0, Math.round(Number(value?.count) || 0));
    const lastActiveDate = typeof value?.lastActiveDate === 'string' ? value.lastActiveDate : null;
    const activityDates = value?.activityDates && typeof value.activityDates === 'object' ? value.activityDates : {};
    const resetAt = typeof value?.resetAt === 'string' ? value.resetAt : null;
    const gap = lastActiveDate ? daysBetween(lastActiveDate, getLocalDateKey()) : null;
    if (gap !== null && gap > 1) count = 0;
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
    ensureProgressResetVersion();
    try {
        const stored = localStorage.getItem('chessengineered_progress');
        if (stored) {
            window.userProgress = JSON.parse(stored);
        }
    } catch (e) {}
    try {
        const unlocked = localStorage.getItem('chessengineered_drill_unlocks');
        if (unlocked) {
            window.drillUnlocks = JSON.parse(unlocked);
        }
    } catch (e) {}
}

export function saveLocalProgress() {
    ensureProgressResetVersion();
    localStorage.setItem('chessengineered_progress', JSON.stringify(window.userProgress));
}

export function normalizeTrainingTime(value) {
    const source = value && typeof value === 'object' ? value : {};
    return TRAINING_TIME_MODES.reduce((acc, mode) => {
        acc[mode] = Math.max(0, Math.round(Number(source[mode]) || 0));
        return acc;
    }, {});
}

export function getTrainingTime() {
    if (!window.userProgress) window.userProgress = {};
    const trainingTime = normalizeTrainingTime(window.userProgress.trainingTime);
    window.userProgress.trainingTime = trainingTime;
    return trainingTime;
}

export function recordTrainingTime(mode, milliseconds) {
    if (!TRAINING_TIME_MODES.includes(mode)) return;
    const elapsed = Math.max(0, Math.round(Number(milliseconds) || 0));
    if (elapsed < 1000) return;
    const trainingTime = getTrainingTime();
    trainingTime[mode] += elapsed;
    window.userProgress.trainingTime = trainingTime;
    saveLocalProgress();
    syncToCloud();
}

function emptyAccuracyBucket() {
    return ACCURACY_MODES.reduce((acc, mode) => {
        acc[mode] = { correct: 0, incorrect: 0 };
        return acc;
    }, {});
}

function normalizeAccuracyBucket(value) {
    const source = value && typeof value === 'object' ? value : {};
    return ACCURACY_MODES.reduce((acc, mode) => {
        const modeData = source[mode] && typeof source[mode] === 'object' ? source[mode] : {};
        acc[mode] = ACCURACY_RESULTS.reduce((resultAcc, result) => {
            resultAcc[result] = Math.max(0, Math.round(Number(modeData[result]) || 0));
            return resultAcc;
        }, {});
        return acc;
    }, {});
}

export function normalizeAccuracy(value) {
    const source = value && typeof value === 'object' ? value : {};
    const openings = {};
    const sourceOpenings = source.openings && typeof source.openings === 'object' ? source.openings : {};

    for (const [slug, opening] of Object.entries(sourceOpenings)) {
        const openingSource = opening && typeof opening === 'object' ? opening : {};
        const lines = {};
        const sourceLines = openingSource.lines && typeof openingSource.lines === 'object' ? openingSource.lines : {};
        for (const [linePgn, line] of Object.entries(sourceLines)) {
            const lineSource = line && typeof line === 'object' ? line : {};
            lines[linePgn] = {
                totals: normalizeAccuracyBucket(lineSource.totals),
                daily: normalizeAccuracyDaily(lineSource.daily)
            };
        }
        openings[slug] = {
            totals: normalizeAccuracyBucket(openingSource.totals),
            daily: normalizeAccuracyDaily(openingSource.daily),
            lines
        };
    }

    return {
        totals: normalizeAccuracyBucket(source.totals),
        daily: normalizeAccuracyDaily(source.daily),
        openings
    };
}

function normalizeAccuracyDaily(value) {
    const daily = {};
    const source = value && typeof value === 'object' ? value : {};
    for (const [date, bucket] of Object.entries(source)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            daily[date] = normalizeAccuracyBucket(bucket);
        }
    }
    return daily;
}

function incrementAccuracyBucket(container, mode, result, date) {
    if (!container.totals) container.totals = emptyAccuracyBucket();
    if (!container.daily) container.daily = {};
    if (!container.daily[date]) container.daily[date] = emptyAccuracyBucket();
    container.totals[mode][result] += 1;
    container.daily[date][mode][result] += 1;
}

export function recordMoveAccuracy(slug, linePgn, mode, wasCorrect) {
    if (!ACCURACY_MODES.includes(mode) || !slug || !linePgn) return;
    if (!window.userProgress) window.userProgress = {};
    const result = wasCorrect ? 'correct' : 'incorrect';
    const date = getLocalDateKey();
    const accuracy = normalizeAccuracy(window.userProgress.accuracy);

    incrementAccuracyBucket(accuracy, mode, result, date);
    if (!accuracy.openings[slug]) {
        accuracy.openings[slug] = { totals: emptyAccuracyBucket(), daily: {}, lines: {} };
    }
    incrementAccuracyBucket(accuracy.openings[slug], mode, result, date);
    if (!accuracy.openings[slug].lines[linePgn]) {
        accuracy.openings[slug].lines[linePgn] = { totals: emptyAccuracyBucket(), daily: {} };
    }
    incrementAccuracyBucket(accuracy.openings[slug].lines[linePgn], mode, result, date);

    window.userProgress.accuracy = accuracy;
    saveLocalProgress();
    syncToCloud();
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

export function resetOpeningTrainingProgress(slug) {
    if (!slug) return;
    if (!window.userProgress) window.userProgress = {};

    const existing = window.userProgress[slug] || {};
    window.userProgress[slug] = {
        ...existing,
        lines: {},
        learnedLines: [],
        resetAt: new Date().toISOString()
    };

    saveLocalProgress();
    syncToCloud();
    deleteOpeningTrainingProgress(slug);
}

export function saveOpeningHighScores(slug) {
    if (!slug) return;
    saveLocalProgress();
    syncToCloud();
    upsertOpeningProgress(slug);
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

async function deleteOpeningTrainingProgress(slug) {
    const supabase = window.supabaseClient;
    const user = window.currentUser;
    if (!supabase || !user) return;

    const { error: lineError } = await supabase
        .from('line_progress')
        .delete()
        .eq('user_id', user.id)
        .eq('opening_slug', slug);
    if (lineError) console.warn('line_progress reset failed:', lineError.message);

    const { error: learnedError } = await supabase
        .from('learned_lines')
        .delete()
        .eq('user_id', user.id)
        .eq('opening_slug', slug);
    if (learnedError) console.warn('learned_lines reset failed:', learnedError.message);
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
            const local = JSON.parse(localStorage.getItem('chessengineered_progress') || '{}');
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
            localStorage.setItem('chessengineered_progress', JSON.stringify(merged));
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
            const local = JSON.parse(localStorage.getItem('chessengineered_progress') || '{}');
            const merged = mergeProgress(local, data.user_progress);
            window.userProgress = merged;
            localStorage.setItem('chessengineered_progress', JSON.stringify(merged));
        }
    } catch (e) { /* silently ignore */ }
}

function mergeProgress(local, cloud) {
    const merged = { ...cloud };
    merged.dailyStreak = mergeDailyStreak(local?.dailyStreak, cloud?.dailyStreak);
    merged.trainingTime = mergeTrainingTime(local?.trainingTime, cloud?.trainingTime);
    merged.accuracy = mergeAccuracy(local?.accuracy, cloud?.accuracy);
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
            const localResetAt = local[slug]?.resetAt || '';
            const cloudResetAt = merged[slug]?.resetAt || '';
            if (localResetAt > cloudResetAt) {
                merged[slug] = local[slug];
                continue;
            }
            if (cloudResetAt > localResetAt) continue;
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

function mergeAccuracy(local, cloud) {
    const localAccuracy = normalizeAccuracy(local);
    const cloudAccuracy = normalizeAccuracy(cloud);
    const openings = {};
    const slugs = new Set([
        ...Object.keys(localAccuracy.openings),
        ...Object.keys(cloudAccuracy.openings)
    ]);

    for (const slug of slugs) {
        const localOpening = localAccuracy.openings[slug] || {};
        const cloudOpening = cloudAccuracy.openings[slug] || {};
        const lines = {};
        const lineKeys = new Set([
            ...Object.keys(localOpening.lines || {}),
            ...Object.keys(cloudOpening.lines || {})
        ]);
        for (const linePgn of lineKeys) {
            lines[linePgn] = {
                totals: mergeAccuracyBucket(localOpening.lines?.[linePgn]?.totals, cloudOpening.lines?.[linePgn]?.totals),
                daily: mergeAccuracyDaily(localOpening.lines?.[linePgn]?.daily, cloudOpening.lines?.[linePgn]?.daily)
            };
        }
        openings[slug] = {
            totals: mergeAccuracyBucket(localOpening.totals, cloudOpening.totals),
            daily: mergeAccuracyDaily(localOpening.daily, cloudOpening.daily),
            lines
        };
    }

    return {
        totals: mergeAccuracyBucket(localAccuracy.totals, cloudAccuracy.totals),
        daily: mergeAccuracyDaily(localAccuracy.daily, cloudAccuracy.daily),
        openings
    };
}

function mergeAccuracyDaily(local, cloud) {
    const localDaily = normalizeAccuracyDaily(local);
    const cloudDaily = normalizeAccuracyDaily(cloud);
    const merged = {};
    const dates = new Set([...Object.keys(localDaily), ...Object.keys(cloudDaily)]);
    for (const date of dates) {
        merged[date] = mergeAccuracyBucket(localDaily[date], cloudDaily[date]);
    }
    return merged;
}

function mergeAccuracyBucket(local, cloud) {
    const localBucket = normalizeAccuracyBucket(local);
    const cloudBucket = normalizeAccuracyBucket(cloud);
    return ACCURACY_MODES.reduce((acc, mode) => {
        acc[mode] = ACCURACY_RESULTS.reduce((resultAcc, result) => {
            resultAcc[result] = Math.max(localBucket[mode][result], cloudBucket[mode][result]);
            return resultAcc;
        }, {});
        return acc;
    }, {});
}

function mergeTrainingTime(local, cloud) {
    const localTime = normalizeTrainingTime(local);
    const cloudTime = normalizeTrainingTime(cloud);
    return TRAINING_TIME_MODES.reduce((acc, mode) => {
        acc[mode] = Math.max(localTime[mode], cloudTime[mode]);
        return acc;
    }, {});
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

    const merged = {
        count: Math.max(localStreak.count, cloudStreak.count),
        lastActiveDate,
        activityDates
    };
    return normalizeDailyStreak(merged);
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
