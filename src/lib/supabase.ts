// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://mvvnqkixgxjblgyrnvte.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_oTugIxx-nIZDcJgCuMnnqw_1ppfExp9';
export const PROGRESS_RESET_VERSION = '2026-05-30-reset-1';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const LOCAL_PROGRESS_KEYS = [
    'chessengineered_progress',
    'chessengineered_drill_unlocks',
    'chessengineered_daily_streak_earned',
    'chessengineered_usage'
];

export function clearOpeningCaches() {
    if (typeof window === 'undefined') return;
    Object.keys(localStorage)
        .filter(key => key.startsWith('chessengineered_opening_cache_') || key.startsWith('chessengineered_session_'))
        .forEach(key => localStorage.removeItem(key));
}

export function clearLocalProgress(options: { clearFreeOpening?: boolean } = {}) {
    if (typeof window === 'undefined') return;
    LOCAL_PROGRESS_KEYS.forEach(key => localStorage.removeItem(key));
    clearOpeningCaches();
    if (options.clearFreeOpening) localStorage.removeItem('chessengineered_free_opening');
}

export function ensureProgressResetVersion() {
    if (typeof window === 'undefined') return;
    const versionKey = 'chessengineered_progress_reset_version';
    if (localStorage.getItem(versionKey) === PROGRESS_RESET_VERSION) return;
    clearLocalProgress({ clearFreeOpening: false });
    localStorage.setItem(versionKey, PROGRESS_RESET_VERSION);
}

export function prepareLocalProgressForUser(userId: string | null) {
    if (typeof window === 'undefined') return;
    ensureProgressResetVersion();
    const ownerKey = 'chessengineered_progress_owner';
    const previousOwner = localStorage.getItem(ownerKey);
    if (previousOwner && userId && previousOwner !== userId) {
        clearLocalProgress({ clearFreeOpening: true });
    }
    if (userId) localStorage.setItem(ownerKey, userId);
}

export function clearLocalUserData() {
    if (typeof window === 'undefined') return;
    clearLocalProgress({ clearFreeOpening: true });
    localStorage.removeItem('chessengineered_progress_owner');
}

// Typed Auth Helpers
export const supabaseHelpers = {
    signUp: async function(email: string, password: string) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        return { data, error };
    },
    signIn: async function(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        return { data, error };
    },
    signOut: async function() {
        const { error } = await supabase.auth.signOut();
        return { error };
    },
    getUser: async function() {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    },
    getProfile: async function(userId: string) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        return { data, error };
    },
    updateProgress: async function(userId: string, userProgress: any) {
        const { data, error } = await supabase
            .from('profiles')
            .update({ user_progress: userProgress, updated_at: new Date().toISOString() })
            .eq('id', userId);
        return { data, error };
    },
    getDailyEvents: async function(userId: string, timezone: string = 'UTC') {
        const { data, error } = await supabase
            .rpc('get_daily_event_counts_by_timezone', { p_user_id: userId, p_timezone: timezone });
        return { data, error };
    },
    getUserProgressNormalized: async function(userId: string) {
        const { data, error } = await supabase
            .rpc('get_user_progress', { p_user_id: userId });
        return { data, error };
    },
    onAuthStateChange: function(callback: any) {
        return supabase.auth.onAuthStateChange(callback);
    }
};
