// supabaseClient.js - Uses the globally loaded Supabase client from opening.html
// The UMD bundle is loaded via CDN in the HTML, so we reuse that instance

const SUPABASE_URL = 'https://mvvnqkixgxjblgyrnvte.supabase.co';
const SUPABASE_KEY = 'sb_publishable_oTugIxx-nIZDcJgCuMnnqw_1ppfExp9';

// Use the globally initialized client if available, otherwise create one
const supabase = window.supabaseClient || (typeof supabase !== 'undefined' ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null);

export { supabase };

// Auth helpers
export async function signUp(email, password) {
    if (!supabase) return { data: null, error: new Error('Supabase not initialized') };
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error };
}

export async function signIn(email, password) {
    if (!supabase) return { data: null, error: new Error('Supabase not initialized') };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
}

export async function signOut() {
    if (!supabase) return { error: new Error('Supabase not initialized') };
    const { error } = await supabase.auth.signOut();
    return { error };
}

export async function getUser() {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

// Profile / Progress helpers
export async function getProfile(userId) {
    if (!supabase) return { data: null, error: new Error('Supabase not initialized') };
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    return { data, error };
}

export async function updateProgress(userId, userProgress) {
    if (!supabase) return { data: null, error: new Error('Supabase not initialized') };
    const { data, error } = await supabase
        .from('profiles')
        .update({ user_progress: userProgress, updated_at: new Date().toISOString() })
        .eq('id', userId);
    return { data, error };
}

export async function getDailyEvents(userId, timezone = 'UTC') {
    if (!supabase) return { data: null, error: new Error('Supabase not initialized') };
    const { data, error } = await supabase
        .rpc('get_daily_event_counts_by_timezone', {
            p_user_id: userId,
            p_timezone: timezone
        });
    return { data, error };
}

// Auth state listener
export function onAuthStateChange(callback) {
    if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
    return supabase.auth.onAuthStateChange(callback);
}