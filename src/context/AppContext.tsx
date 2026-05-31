// src/context/AppContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, supabaseHelpers, prepareLocalProgressForUser, clearLocalUserData } from '@/lib/supabase';

interface AppContextType {
    user: User | null;
    loadingAuth: boolean;
    userProgress: any;
    hasActiveSubscription: boolean;
    serverFreeOpening: string | null;
    boardTheme: string;
    pieceSet: string;
    showEval: boolean;
    trainingArrows: string;
    dialogBehavior: string;
    hapticEnabled: boolean;
    catalog: any;
    setBoardTheme: (t: string) => void;
    setPieceSet: (ps: string) => void;
    setShowEval: (se: boolean) => void;
    setTrainingArrows: (ta: string) => void;
    setDialogBehavior: (db: string) => void;
    setHapticEnabled: (he: boolean) => void;
    updateUserProgress: (newProgress: any) => Promise<void>;
    syncProgressWithCloud: (userId: string) => Promise<void>;
    refreshSubscription: () => Promise<void>;
    logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [userProgress, setUserProgress] = useState<any>({});
    const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
    const [serverFreeOpening, setServerFreeOpening] = useState<string | null>(null);
    const [catalog, setCatalog] = useState<any>({});

    // Settings States (hydrated from localStorage)
    const [boardTheme, setBoardThemeState] = useState('green');
    const [pieceSet, setPieceSetState] = useState('staunty');
    const [showEval, setShowEvalState] = useState(true);
    const [trainingArrows, setTrainingArrowsState] = useState('on');
    const [dialogBehavior, setDialogBehaviorState] = useState('auto');
    const [hapticEnabled, setHapticEnabledState] = useState(true);

    // Save functions
    const setBoardTheme = (theme: string) => {
        setBoardThemeState(theme);
        localStorage.setItem('chessengineered_board_theme', theme);
    };
    const setPieceSet = (pieces: string) => {
        setPieceSetState(pieces);
        localStorage.setItem('chessengineered_piece_set', pieces);
    };
    const setShowEval = (val: boolean) => {
        setShowEvalState(val);
        localStorage.setItem('chessengineered_show_eval', String(val));
    };
    const setTrainingArrows = (arrows: string) => {
        setTrainingArrowsState(arrows);
        localStorage.setItem('chessengineered_training_arrows', arrows);
    };
    const setDialogBehavior = (behavior: string) => {
        setDialogBehaviorState(behavior);
        localStorage.setItem('chessengineered_dialog_behavior', behavior);
    };
    const setHapticEnabled = (val: boolean) => {
        setHapticEnabledState(val);
        localStorage.setItem('chessengineered_haptic', String(val));
    };

    // Hydrate Local Storage progress & settings
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Settings hydration
        const storedTheme = localStorage.getItem('chessengineered_board_theme') || localStorage.getItem('chessengineered_boardTheme') || 'green';
        setBoardThemeState(storedTheme === 'brown' ? 'chessboard-js' : storedTheme);
        setPieceSetState(localStorage.getItem('chessengineered_piece_set') || 'staunty');
        setShowEvalState(localStorage.getItem('chessengineered_show_eval') !== 'false');
        setTrainingArrowsState(localStorage.getItem('chessengineered_training_arrows') || 'on');
        setDialogBehaviorState(localStorage.getItem('chessengineered_dialog_behavior') || 'auto');
        setHapticEnabledState(localStorage.getItem('chessengineered_haptic') !== 'false');

        // Progress hydration
        try {
            const progress = JSON.parse(localStorage.getItem('chessengineered_progress') || '{}');
            setUserProgress(progress);
        } catch (e) {
            setUserProgress({});
        }

        // Fetch catalog
        fetch('/data/openings-catalog.json')
            .then(r => r.json())
            .then(data => {
                setCatalog(data.openings || {});
            })
            .catch(() => {});
    }, []);

    // Sincronización y Auth
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            const currentUser = session?.user || null;
            setUser(currentUser);
            setLoadingAuth(false);

            if (currentUser) {
                prepareLocalProgressForUser(currentUser.id);
                await syncProgressWithCloud(currentUser.id);
                await fetchSubscriptionStatus(currentUser.id);
            } else {
                if (event === 'SIGNED_OUT') {
                    clearLocalUserData();
                    setUserProgress({});
                    setHasActiveSubscription(false);
                    setServerFreeOpening(null);
                }
            }
        });

        // Initial session check
        supabase.auth.getSession().then(({ data }) => {
            const session = data?.session;
            if (session?.user) {
                setUser(session.user);
                prepareLocalProgressForUser(session.user.id);
                syncProgressWithCloud(session.user.id);
                fetchSubscriptionStatus(session.user.id);
            }
            setLoadingAuth(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Fetch subscription status
    const fetchSubscriptionStatus = async (userId: string) => {
        try {
            const { data: sub } = await supabase
                .from('subscriptions')
                .select('status, current_period_end')
                .eq('user_id', userId)
                .single();

            const active = sub &&
                (sub.status === 'active' || sub.status === 'trialing') &&
                new Date(sub.current_period_end) > new Date();
            setHasActiveSubscription(!!active);

            const { data: profile } = await supabase
                .from('profiles')
                .select('free_opening_slug')
                .eq('id', userId)
                .single();

            if (profile?.free_opening_slug) {
                setServerFreeOpening(profile.free_opening_slug);
                localStorage.setItem('chessengineered_free_opening', profile.free_opening_slug);
            }
        } catch (e) {
            setHasActiveSubscription(false);
        }
    };

    const refreshSubscription = async () => {
        if (user) {
            await fetchSubscriptionStatus(user.id);
        }
    };

    // Update user progress
    const updateUserProgress = async (newProgress: any) => {
        setUserProgress(newProgress);
        localStorage.setItem('chessengineered_progress', JSON.stringify(newProgress));

        if (user) {
            try {
                await supabaseHelpers.updateProgress(user.id, newProgress);
            } catch (e) {
                console.warn('Could not sync progress to Supabase:', e);
            }
        }
    };

    // Sync cloud & local progress helper
    const syncProgressWithCloud = async (userId: string) => {
        try {
            const { data: profile, error } = await supabaseHelpers.getProfile(userId);
            if (profile && profile.user_progress) {
                const local = JSON.parse(localStorage.getItem('chessengineered_progress') || '{}');
                const merged = mergeProgress(local, profile.user_progress);
                localStorage.setItem('chessengineered_progress', JSON.stringify(merged));
                setUserProgress(merged);
                // Save back to cloud
                await supabaseHelpers.updateProgress(userId, merged);
            }
        } catch (e) {
            console.warn('Sync failed:', e);
        }
    };

    const logout = async () => {
        await supabaseHelpers.signOut();
    };

    // Merge algorithms from original code
    function mergeProgress(local: any, cloud: any) {
        const merged = { ...(cloud || {}) };
        for (const slug in local || {}) {
            if (['puzzleELO', 'puzzleStreak', 'dailyStreak'].includes(slug)) {
                if (merged[slug] === undefined) merged[slug] = local[slug];
                continue;
            }
            if (!merged[slug]) {
                merged[slug] = local[slug];
                continue;
            }
            const localResetAt = local[slug]?.resetAt || '';
            const cloudResetAt = merged[slug]?.resetAt || '';
            if (localResetAt > cloudResetAt) {
                merged[slug] = local[slug];
                continue;
            }
            if (cloudResetAt > localResetAt) continue;
            const localLearned = local[slug].learnedLines || [];
            const cloudLearned = merged[slug].learnedLines || [];
            merged[slug].learnedLines = Array.from(new Set([...cloudLearned, ...localLearned]));

            const localLines = local[slug].lines || {};
            const cloudLines = merged[slug].lines || {};
            for (const pgn in localLines) {
                cloudLines[pgn] = mergeLineProgress(localLines[pgn], cloudLines[pgn]);
            }
            merged[slug].lines = cloudLines;
        }
        return merged;
    }

    function mergeLineProgress(localLine: any = {}, cloudLine: any = {}) {
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

    return (
        <AppContext.Provider value={{
            user,
            loadingAuth,
            userProgress,
            hasActiveSubscription,
            serverFreeOpening,
            boardTheme,
            pieceSet,
            showEval,
            trainingArrows,
            dialogBehavior,
            hapticEnabled,
            catalog,
            setBoardTheme,
            setPieceSet,
            setShowEval,
            setTrainingArrows,
            setDialogBehavior,
            setHapticEnabled,
            updateUserProgress,
            syncProgressWithCloud,
            refreshSubscription,
            logout
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
}
