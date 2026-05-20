// supabaseClient.js - Single source of truth for Supabase credentials
// Load this script AFTER the Supabase UMD CDN bundle

const SUPABASE_URL = 'https://mvvnqkixgxjblgyrnvte.supabase.co';
const SUPABASE_KEY = 'sb_publishable_oTugIxx-nIZDcJgCuMnnqw_1ppfExp9';

window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_KEY = SUPABASE_KEY;

// Auto-initialize the Supabase client if the CDN library is loaded
if (typeof supabase !== 'undefined' && supabase.createClient) {
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window.auth = window.supabaseClient.auth;
}

// Auth helpers
window.supabaseHelpers = {
    signUp: async function(email, password) {
        if (!window.supabaseClient) return { data: null, error: new Error('Supabase not initialized') };
        const { data, error } = await window.supabaseClient.auth.signUp({ email, password });
        return { data, error };
    },
    signIn: async function(email, password) {
        if (!window.supabaseClient) return { data: null, error: new Error('Supabase not initialized') };
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
        return { data, error };
    },
    signOut: async function() {
        if (!window.supabaseClient) return { error: new Error('Supabase not initialized') };
        const { error } = await window.supabaseClient.auth.signOut();
        return { error };
    },
    getUser: async function() {
        if (!window.supabaseClient) return null;
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        return user;
    },
    getProfile: async function(userId) {
        if (!window.supabaseClient) return { data: null, error: new Error('Supabase not initialized') };
        const { data, error } = await window.supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        return { data, error };
    },
    updateProgress: async function(userId, userProgress) {
        if (!window.supabaseClient) return { data: null, error: new Error('Supabase not initialized') };
        const { data, error } = await window.supabaseClient
            .from('profiles')
            .update({ user_progress: userProgress, updated_at: new Date().toISOString() })
            .eq('id', userId);
        return { data, error };
    },
    getDailyEvents: async function(userId, timezone = 'UTC') {
        if (!window.supabaseClient) return { data: null, error: new Error('Supabase not initialized') };
        const { data, error } = await window.supabaseClient
            .rpc('get_daily_event_counts_by_timezone', { p_user_id: userId, p_timezone: timezone });
        return { data, error };
    },
    getUserProgressNormalized: async function(userId) {
        if (!window.supabaseClient) return { data: null, error: new Error('Supabase not initialized') };
        const { data, error } = await window.supabaseClient
            .rpc('get_user_progress', { p_user_id: userId });
        return { data, error };
    },
    onAuthStateChange: function(callback) {
        if (!window.supabaseClient) return { data: { subscription: { unsubscribe: function() {} } } };
        return window.supabaseClient.auth.onAuthStateChange(callback);
    }
};