// src/app/checkout/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import '@/styles/checkout.css';

export default function CheckoutPage() {
    const { user, hasActiveSubscription, refreshSubscription } = useApp();
    const router = useRouter();

    const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);

    const [checkoutLoading, setCheckoutLoading] = useState(false);

    // If user is already subscribed, redirect to openings
    useEffect(() => {
        if (hasActiveSubscription) {
            router.push('/openings?checkout=success');
        }
    }, [hasActiveSubscription, router]);

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError('');
        if (!email || !password) {
            setAuthError('Please enter both email and password.');
            return;
        }

        setAuthLoading(true);
        try {
            if (authMode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setAuthError('Sign up successful! Please check your email for the confirmation link.');
            }
        } catch (err: any) {
            setAuthError(err.message || 'Authentication failed.');
        } finally {
            setAuthLoading(false);
        }
    };

    const handleGoogleAuth = async () => {
        setAuthError('');
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/checkout'
                }
            });
            if (error) throw error;
        } catch (err: any) {
            setAuthError(err.message || 'Google Sign-In failed.');
        }
    };

    const persistOnboardingPreferences = async (userId: string) => {
        try {
            const stored = JSON.parse(localStorage.getItem('chessengineered_onboarding') || 'null');
            if (!stored || typeof stored !== 'object') return;
            const { error } = await supabase
                .from('profiles')
                .update({
                    rating: stored.rating || null,
                    color_preference: stored.color || null,
                    goal: stored.goal || null,
                    commitment: stored.commitment || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);
            if (!error) localStorage.removeItem('chessengineered_onboarding');
        } catch (e) {}
    };

    useEffect(() => {
        if (user) {
            persistOnboardingPreferences(user.id);
        }
    }, [user]);

    const startCheckout = async () => {
        setCheckoutLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;

            if (!accessToken) {
                setAuthError('Session expired. Please log in again.');
                return;
            }

            const response = await fetch('https://mvvnqkixgxjblgyrnvte.supabase.co/functions/v1/create-checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + accessToken
                },
                body: JSON.stringify({
                    plan: 'yearly'
                })
            });

            const payload = await response.json().catch(() => ({}));
            
            if (!response.ok) {
                if (response.status === 409) {
                    router.push('/openings');
                    return;
                }
                throw new Error(payload.error || `HTTP ${response.status}`);
            }

            if (payload.url) {
                window.location.href = payload.url;
            } else {
                throw new Error('No checkout URL returned.');
            }
        } catch (err: any) {
            console.error('Checkout error:', err);
            alert(err.message || 'Stripe redirect failed. Please try again.');
        } finally {
            setCheckoutLoading(false);
        }
    };

    return (
        <div className="checkout-page" style={{ minHeight: '85vh', padding: 'var(--space-xl) var(--space-md)' }}>
            
            {/* ── Unauthenticated State (Auth Overlay) ── */}
            {!user ? (
                <div className="auth-overlay" id="authOverlay" style={{ display: 'flex', justifyContent: 'center' }}>
                    <div className="auth-card">
                        <h2 id="authTitle" className="auth-card-title">
                            {authMode === 'signup' ? 'Create your account' : 'Welcome back'}
                        </h2>
                        <p className="auth-card-sub">You'll need an account to sync progress and manage your pass.</p>
                        
                        <form onSubmit={handleEmailAuth}>
                            <div className="form-group">
                                <label htmlFor="checkoutEmail">Email</label>
                                <input 
                                    type="email" 
                                    id="checkoutEmail" 
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="checkoutPassword">Password</label>
                                <input 
                                    type="password" 
                                    id="checkoutPassword" 
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                            
                            <button 
                                type="submit" 
                                className="btn btn-primary btn-lg" 
                                id="authBtn"
                                style={{ width: '100%', marginTop: 'var(--space-md)' }}
                                disabled={authLoading}
                            >
                                {authLoading ? 'Please wait…' : authMode === 'signup' ? 'Create Account' : 'Log in'}
                            </button>
                        </form>
                        
                        <div style={{ textAlign: 'center', margin: '12px 0', color: '#71717a', fontSize: '0.85rem' }}>or</div>
                        
                        <button className="btn-google-auth" onClick={handleGoogleAuth} style={{ width: '100%' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            <span>Continue with Google</span>
                        </button>
                        
                        {authError && (
                            <div className="error-msg" id="authError" style={{ display: 'block', marginTop: '12px' }}>
                                {authError}
                            </div>
                        )}
                        
                        <div className="auth-toggle">
                            <span id="authToggleText">
                                {authMode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
                            </span>
                            <a 
                                onClick={() => {
                                    setAuthMode(authMode === 'signup' ? 'login' : 'signup');
                                    setAuthError('');
                                }} 
                                id="authToggleLink"
                                style={{ cursor: 'pointer', marginLeft: '5px', textDecoration: 'underline' }}
                            >
                                {authMode === 'signup' ? 'Log in' : 'Sign up'}
                            </a>
                        </div>
                    </div>
                </div>
            ) : (
                /* ── Authenticated State (Checkout Summary) ── */
                <div className="checkout-container" id="checkoutContent" style={{ display: 'grid' }}>
                    <div className="checkout-main">
                        <h1 className="checkout-title">Complete your upgrade</h1>
                        <p className="checkout-sub">Unlock ChessEngineered Unlimited Pass instantly.</p>
                        
                        <div className="checkout-plan-card">
                            <div className="plan-badge">Best Value</div>
                            <div className="plan-details">
                                <span className="plan-name">Unlimited Pass</span>
                                <span className="plan-price">$11.99/year</span>
                            </div>
                            <p className="plan-billing">Billed annually. Cancel anytime.</p>
                        </div>
                        
                        <div className="checkout-security-badge">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                            <span>Secure checkout powered by Stripe. Encrypted connection.</span>
                        </div>
                        
                        <button 
                            className="btn btn-primary btn-lg" 
                            id="checkoutBtn"
                            style={{ width: '100%', minHeight: '52px' }}
                            onClick={startCheckout}
                            disabled={checkoutLoading}
                        >
                            {checkoutLoading ? (
                                <div className="btn-loader" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                    <div className="spinner" style={{ width: '20px', height: '20px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
                                    <span style={{ marginLeft: '8px' }}>Redirecting to Stripe...</span>
                                </div>
                            ) : (
                                <span className="btn-text">Proceed to Payment</span>
                            )}
                        </button>
                    </div>
                    
                    <div className="checkout-summary">
                        <h3 className="summary-title">Pass Benefits</h3>
                        <ul className="summary-list">
                            <li>All 30+ openings</li>
                            <li>Flawless board training & evaluators</li>
                            <li>Drill, practice, and puzzle ELO modes</li>
                            <li>Cloud sync across your mobile & desktop</li>
                            <li>30-day money-back guarantee</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
