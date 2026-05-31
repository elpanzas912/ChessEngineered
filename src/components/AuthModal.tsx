// src/components/AuthModal.tsx
'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const toggleAuthMode = () => {
        setAuthMode(prev => (prev === 'login' ? 'signup' : 'login'));
        setErrorMsg('');
    };

    const handleAuth = async () => {
        setErrorMsg('');
        if (!email || !password) {
            setErrorMsg('Please enter both email and password.');
            return;
        }

        setLoading(false);
        try {
            setLoading(true);
            if (authMode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setErrorMsg('Check your email for the confirmation link!');
                return;
            }
            onClose();
        } catch (err: any) {
            setErrorMsg(err.message || 'An error occurred during authentication.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleAuth = async () => {
        setErrorMsg('');
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/openings'
                }
            });
            if (error) throw error;
        } catch (err: any) {
            setErrorMsg(err.message || 'Google Sign-In failed.');
        }
    };

    return (
        <div className="auth-modal-overlay open" id="authModal" style={{ display: 'flex' }}>
            <div className="auth-modal">
                <button className="close-btn" onClick={onClose} aria-label="Close modal">×</button>
                <h2 id="authTitle">{authMode === 'login' ? 'Log in' : 'Sign up'}</h2>
                
                <div className="form-group">
                    <label htmlFor="authEmail">Email</label>
                    <input 
                        type="email" 
                        id="authEmail" 
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                
                <div className="form-group">
                    <label htmlFor="authPassword">Password</label>
                    <input 
                        type="password" 
                        id="authPassword" 
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
                
                <button 
                    className="btn-auth" 
                    id="authBtn" 
                    onClick={handleAuth}
                    disabled={loading}
                >
                    {loading ? 'Please wait...' : authMode === 'login' ? 'Log in' : 'Sign up'}
                </button>
                
                <div style={{ textAlign: 'center', margin: '8px 0', color: '#71717a', fontSize: '0.85rem' }}>or</div>
                
                <button className="btn-google-auth" onClick={handleGoogleAuth}>
                    <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Continue with Google</span>
                </button>
                
                {errorMsg && <div className="error-msg" id="authError" style={{ display: 'block' }}>{errorMsg}</div>}
                
                <div className="auth-toggle">
                    <span id="authToggleText">
                        {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}
                    </span>
                    <a onClick={toggleAuthMode} id="authToggleLink" style={{ cursor: 'pointer', marginLeft: '5px', textDecoration: 'underline' }}>
                        {authMode === 'login' ? 'Sign up' : 'Log in'}
                    </a>
                </div>
            </div>
        </div>
    );
}
