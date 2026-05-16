import { createClient } from 'https://unpkg.com/@supabase/supabase-js@2/dist/module/index.js';

const SUPABASE_URL = 'https://mvvnqkixgxjblgyrnvte.supabase.co';
const SUPABASE_KEY = 'sb_publishable_oTugIxx-nIZDcJgCuMnnqw_1ppfExp9';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Auth helpers
export async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error };
}

export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
}

export async function getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

// Profile / Progress helpers
export async function getProfile(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    return { data, error };
}

export async function updateProgress(userId, userProgress) {
    const { data, error } = await supabase
        .from('profiles')
        .update({ user_progress: userProgress, updated_at: new Date().toISOString() })
        .eq('id', userId);
    return { data, error };
}

export async function getDailyEvents(userId, timezone = 'UTC') {
    const { data, error } = await supabase
        .rpc('get_daily_event_counts_by_timezone', {
            p_user_id: userId,
            p_timezone: timezone
        });
    return { data, error };
}

// Auth state listener
export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
}
