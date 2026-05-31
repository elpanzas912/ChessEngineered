// src/app/opening/[slug]/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { Chess } from 'chess.js';
import confetti from 'canvas-confetti';
import '@/styles/opening.css';

export default function OpeningTrainerPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params?.slug as string;

    const { user, userProgress, hasActiveSubscription, serverFreeOpening, boardTheme, pieceSet, catalog } = useApp();

    const [loading, setLoading] = useState(true);
    const [openingData, setOpeningData] = useState<any>(null);
    const [paywallVisible, setPaywallVisible] = useState(false);

    // References to avoid double-initialization
    const initializedRef = useRef(false);

    useEffect(() => {
        if (!slug || !catalog || Object.keys(catalog).length === 0) return;

        // Verify if opening exists in catalog
        if (!catalog[slug]) {
            router.push('/openings');
            return;
        }

        const isUnlocked = hasActiveSubscription || serverFreeOpening === slug || localStorage.getItem('chessengineered_free_opening') === slug;
        const isFreePickable = !hasActiveSubscription && !serverFreeOpening && !localStorage.getItem('chessengineered_free_opening');

        if (!isUnlocked && !isFreePickable) {
            setPaywallVisible(true);
            setLoading(false);
            return;
        }

        setOpeningData(catalog[slug]);
        setLoading(false);
    }, [slug, catalog, hasActiveSubscription, serverFreeOpening]);

    // Bootstrap legacy JS modules in browser environment
    useEffect(() => {
        if (loading || !openingData || initializedRef.current) return;
        initializedRef.current = true;

        // Bridge NPM packages to legacy UMD globals
        (window as any).Chess = Chess;
        (window as any).confetti = confetti;
        (window as any).openingSlug = slug;
        (window as any).supabaseClient = supabase;
        (window as any).auth = supabase.auth;
        (window as any).userProgress = userProgress;
        (window as any).currentUser = user;

        // Inline actions in opening.html
        (window as any).openAuthModal = () => {
            const el = document.getElementById('authModal');
            if (el) el.classList.add('open');
        };

        (window as any).closeAuthModal = () => {
            const el = document.getElementById('authModal');
            if (el) el.classList.remove('open');
            const errEl = document.getElementById('authError');
            if (errEl) {
                errEl.style.display = 'none';
                errEl.textContent = '';
            }
        };

        (window as any).toggleAuthMode = () => {
            const title = document.getElementById('authTitle');
            const btn = document.getElementById('authBtn');
            const link = document.getElementById('authToggleLink');
            if (title && btn && link) {
                const isLogin = title.textContent === 'Log in';
                title.textContent = isLogin ? 'Create account' : 'Log in';
                btn.textContent = isLogin ? 'Sign Up' : 'Log in';
                link.textContent = isLogin ? 'Sign in' : 'Sign up';
            }
        };

        (window as any).toggleLineDropdown = function() {
            const dd = document.getElementById('lineDropdown');
            const chevron = document.getElementById('dropdownChevron');
            if (dd) dd.classList.toggle('open');
            if (chevron) chevron.style.transform = dd?.classList.contains('open') ? 'rotate(180deg)' : '';
        };

        (window as any).closeLineDropdown = function() {
            const dd = document.getElementById('lineDropdown');
            const chevron = document.getElementById('dropdownChevron');
            if (dd) dd.classList.remove('open');
            if (chevron) chevron.style.transform = '';
        };

        (window as any).setMode = function(mode: string) {
            const trainer = (window as any).trainer;
            if (!trainer) return;
            
            if (mode === 'practice') {
                const learned = trainer.opening ? ((window as any).userProgress[trainer.slug]?.learnedLines || []) : [];
                if (!learned.length) {
                    alert('Learn some lines first!');
                    return;
                }
            }
            
            if (mode === 'drill' || mode === 'time') {
                const learned = trainer.opening ? ((window as any).userProgress[trainer.slug]?.learnedLines || []) : [];
                if (learned.length < 3) {
                    alert('Learn 3 lines to unlock ' + (mode === 'drill' ? 'Drill' : 'Time Trials') + '!');
                    return;
                }
            }
            
            if (mode === 'puzzle') {
                const learned = trainer.opening ? ((window as any).userProgress[trainer.slug]?.learnedLines || []) : [];
                if (learned.length < 2) {
                    alert('Learn 2 lines to unlock Puzzles!');
                    return;
                }
            }
            
            trainer.mode = mode;
            document.body.classList.remove('show-mobile-modes');
            if (typeof trainer.saveSessionState === 'function') trainer.saveSessionState();
            document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
            const btn = document.getElementById('mode' + mode.charAt(0).toUpperCase() + mode.slice(1)) as HTMLButtonElement | null;
            if (btn && !btn.disabled) btn.classList.add('active');
            
            const modeSelector = document.querySelector('.mode-selector') as HTMLElement;
            const drillPanel = document.getElementById('drillPanel') as HTMLElement;
            const timePanel = document.getElementById('timePanel') as HTMLElement;
            const puzzlePanel = document.getElementById('puzzlePanel') as HTMLElement;

            if (mode === 'drill') {
                if (modeSelector) modeSelector.style.display = 'none';
                if (drillPanel) drillPanel.classList.add('active');
                if (timePanel) timePanel.classList.remove('active');
                if (puzzlePanel) puzzlePanel.classList.remove('active');
                trainer.drillScore = 0;
                (window as any).updateDrillUI();
            } else if (mode === 'time') {
                if (modeSelector) modeSelector.style.display = 'none';
                if (drillPanel) drillPanel.classList.remove('active');
                if (timePanel) timePanel.classList.add('active');
                if (puzzlePanel) puzzlePanel.classList.remove('active');
                (window as any).startTimeTrial();
            } else if (mode === 'puzzle') {
                if (modeSelector) modeSelector.style.display = 'none';
                if (drillPanel) drillPanel.classList.remove('active');
                if (timePanel) timePanel.classList.remove('active');
                if (puzzlePanel) puzzlePanel.classList.add('active');
                (window as any).startPuzzles();
            } else {
                if (modeSelector) modeSelector.style.display = '';
                if (drillPanel) drillPanel.classList.remove('active');
                if (timePanel) timePanel.classList.remove('active');
                if (puzzlePanel) puzzlePanel.classList.remove('active');
                (window as any).stopTimeTrial();
            }
            
            document.getElementById('gameoverOverlay')?.classList.remove('open');
            document.getElementById('timeoverOverlay')?.classList.remove('open');
            
            trainer.nextLine();
        };

        (window as any).closeUnlockModal = function() {
            document.getElementById('unlockOverlay')?.classList.remove('open');
        };

        (window as any).restartDrill = function() {
            document.getElementById('gameoverOverlay')?.classList.remove('open');
            const trainer = (window as any).trainer;
            if (trainer) {
                trainer.drillScore = 0;
                (window as any).updateDrillUI();
                trainer.nextLine();
            }
        };

        (window as any).updateDrillUI = function() {
            const trainer = (window as any).trainer;
            const scoreEl = document.getElementById('drillScore');
            const highEl = document.getElementById('drillHighScore');
            const highWrap = document.getElementById('drillHighScoreWrap');
            if (scoreEl) scoreEl.textContent = trainer?.drillScore || 0;
            if (highEl && trainer && trainer.slug) {
                const high = (window as any).userProgress[trainer.slug]?.drillHighScore || 0;
                highEl.textContent = high > 0 ? high : '--';
                if (highWrap) {
                    if (high > 0) highWrap.classList.remove('locked');
                    else highWrap.classList.add('locked');
                }
            }
        };

        let timeInterval: any = null;
        let timeRemaining = 6000;
        let tenSecondSoundPlayed = false;

        (window as any).startTimeTrial = function() {
            const trainer = (window as any).trainer;
            if (!trainer) return;
            trainer.timeScore = 0;
            timeRemaining = 6000;
            tenSecondSoundPlayed = false;
            (window as any).updateTimeUI();
            clearInterval(timeInterval);
            timeInterval = setInterval(() => {
                timeRemaining--;
                if (!tenSecondSoundPlayed && timeRemaining <= 1000 && timeRemaining > 0) {
                    tenSecondSoundPlayed = true;
                    (window as any).playTenSecondsSound?.();
                }
                (window as any).updateTimeUI();
                if (timeRemaining <= 0) {
                    (window as any).endTimeTrial();
                }
            }, 10);
        };

        (window as any).stopTimeTrial = function() {
            clearInterval(timeInterval);
            timeInterval = null;
        };

        (window as any).endTimeTrial = function() {
            (window as any).stopTimeTrial();
            const trainer = (window as any).trainer;
            if (!trainer) return;
            const high = (window as any).userProgress[trainer.slug]?.timeHighScore || 0;
            if (trainer.timeScore > high) {
                if (!(window as any).userProgress[trainer.slug]) (window as any).userProgress[trainer.slug] = {};
                (window as any).userProgress[trainer.slug].timeHighScore = trainer.timeScore;
                (window as any).saveOpeningHighScores?.(trainer.slug);
            }
            const overlay = document.getElementById('timeoverOverlay');
            const scoreEl = document.getElementById('timeoverScore');
            const highEl = document.getElementById('timeoverHigh');
            if (overlay) overlay.classList.add('open');
            if (scoreEl) scoreEl.textContent = `Score: ${trainer.timeScore}`;
            if (highEl) highEl.textContent = `High Score: ${Math.max(high, trainer.timeScore)}`;
        };

        (window as any).restartTime = function() {
            document.getElementById('timeoverOverlay')?.classList.remove('open');
            (window as any).startTimeTrial();
            const trainer = (window as any).trainer;
            if (trainer) trainer.nextLine();
        };

        (window as any).updateTimeUI = function() {
            const trainer = (window as any).trainer;
            const secs = Math.floor(timeRemaining / 100);
            const cs = timeRemaining % 100;
            const secsEl = document.getElementById('timeSecs');
            const csEl = document.getElementById('timeCs');
            const scoreEl = document.getElementById('timeScore');
            const highEl = document.getElementById('timeHighScore');
            const highWrap = document.getElementById('timeHighScoreWrap');
            if (secsEl) secsEl.textContent = String(secs);
            if (csEl) csEl.textContent = cs.toString().padStart(2, '0');
            if (scoreEl) scoreEl.textContent = trainer?.timeScore || 0;
            if (highEl && trainer && trainer.slug) {
                const high = (window as any).userProgress[trainer.slug]?.timeHighScore || 0;
                highEl.textContent = high > 0 ? high : '--';
                if (highWrap) {
                    if (high > 0) highWrap.classList.remove('locked');
                    else highWrap.classList.add('locked');
                }
            }
        };

        (window as any).startPuzzles = function() {
            const trainer = (window as any).trainer;
            if (!trainer) return;
            trainer.puzzleStreak = 0;
            (window as any).updatePuzzleUI();
        };

        (window as any).updatePuzzleUI = function() {
            const trainer = (window as any).trainer;
            const streakEl = document.getElementById('puzzleStreak');
            const ratingEl = document.getElementById('puzzleRating');
            const labelEl = document.getElementById('puzzleRatingLabel');
            const diffEl = document.getElementById('puzzleDifficulty');
            const rawStreak = trainer?.puzzleStreak ?? (window as any).userProgress?.puzzleStreak ?? 0;
            const numericStreak = Number(rawStreak);
            const streak = Number.isFinite(numericStreak)
                ? Math.max(0, Math.round(numericStreak))
                : (typeof (window as any).getPuzzleStreak === 'function' ? (window as any).getPuzzleStreak() : 0);
            if (trainer) trainer.puzzleStreak = streak;
            if (streakEl) streakEl.textContent = String(streak);
            
            const rawELO = (window as any).userProgress?.puzzleELO ?? 1500;
            const userELO = typeof (window as any).getPuzzleELO === 'function'
                ? (window as any).getPuzzleELO()
                : (Number.isFinite(Number(rawELO)) ? Math.max(400, Math.round(Number(rawELO))) : 1500);
            if (ratingEl) ratingEl.textContent = String(userELO);
            if (labelEl) labelEl.textContent = 'Your Puzzle ELO';
            
            if (diffEl && trainer?.currentPuzzle) {
                diffEl.textContent = `~${trainer.currentPuzzle.Rating} rating`;
            }
        };

        (window as any).nextLineAfterComplete = function () {
            const overlay = document.getElementById('completionOverlay');
            if (overlay) overlay.classList.remove('open');
            document.body.classList.remove('line-complete-mobile');
            const trainer = (window as any).trainer;
            if (trainer) trainer.nextLine();
        };

        // Load modules & app.js orchestration
        Promise.all([
            import('@/modules/board.js'),
            import('@/modules/progress.js'),
            import('@/modules/trainer.js'),
            import('@/modules/ui.js'),
            import('@/modules/evaluator.js'),
            import('@/modules/audio.js'),
            import('@/app.js')
        ]).then(() => {
            console.log('ChessEngineered legacy module framework loaded.');
        }).catch(err => {
            console.error('Failed to load training ES modules:', err);
        });

        return () => {
            // Cleanup on unmount
            clearInterval(timeInterval);
            delete (window as any).trainer;
            delete (window as any).board;
            delete (window as any).game;
        };

    }, [loading, openingData]);

    // Apply board configurations (theme, piece set) dynamically
    useEffect(() => {
        if (loading || !openingData) return;
        const board = (window as any).board;
        const applyAppearance = (window as any).applyBoardAppearance;
        if (board && typeof applyAppearance === 'function') {
            applyAppearance(board, { theme: boardTheme, pieceSet: pieceSet });
        }
    }, [boardTheme, pieceSet, loading, openingData]);



    if (loading) {
        return (
            <div style={{ minHeight: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid var(--color-rule)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            </div>
        );
    }

    if (paywallVisible) {
        return (
            <div className="paywall-overlay" id="paywallOverlay" style={{ display: 'flex', position: 'fixed', inset: 0, zIndex: 100 }}>
                <div className="paywall-card">
                    <div className="paywall-icon">🔒</div>
                    <h2 className="paywall-title">This opening is locked</h2>
                    <p className="paywall-desc">Upgrade to Unlimited Pass to access all 30+ openings.</p>
                    <div className="paywall-price">
                        <span className="paywall-amount">$11.99</span>
                        <span className="paywall-period">/year</span>
                    </div>
                    <Link href="/checkout" className="btn btn-primary btn-lg" style={{ width: '100%', marginBottom: 'var(--space-sm)' }}>
                        Upgrade Now
                    </Link>
                    <Link href="/openings" className="btn btn-secondary" style={{ width: '100%' }}>
                        Back to Repertoire
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '85vh', position: 'relative' }}>
            {/* Ambient background layers */}
            <div className="bg-glows" aria-hidden="true">
                <div className="glow glow-1"></div>
                <div className="glow glow-2"></div>
            </div>

            <div className="trainer-layout">
                {/* Board Column */}
                <div className="board-area">
                    <div className="line-progress-wrap">
                        <div className="line-progress-row">
                            <Link className="progress-back-btn" href="/openings" aria-label="Back to openings">
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M3.283 10.94a1.5 1.5 0 0 0 0 2.12l5.656 5.658a1.5 1.5 0 1 0 2.122-2.122L7.965 13.5H19.5a1.5 1.5 0 0 0 0-3H7.965l3.096-3.096a1.5 1.5 0 1 0-2.122-2.121z"/>
                                </svg>
                            </Link>
                            <div className="line-progress-track">
                                <div className="line-progress-fill" id="lineProgressBar"></div>
                            </div>
                        </div>
                        <div className="line-progress-label">
                            <span className="move-num" id="progressMoveNum">Move 0/0</span>
                            <span className="move-name" id="progressLineName"></span>
                        </div>
                    </div>
                    
                    <div className="board-with-eval">
                        <div className="eval-bar" id="evalBar">
                            <div className="eval-bar-white" id="evalBarWhite"></div>
                            <div className="eval-bar-black" id="evalBarBlack"></div>
                            <div className="eval-bar-score" id="evalBarScore">0.0</div>
                        </div>
                        <div id="board"></div>
                    </div>
                    
                    <div className="completion-overlay" id="completionOverlay">
                        <h2>Line Complete!</h2>
                        <div className="completion-sub" id="completionSub">Great job! You learned a new line.</div>
                        <button className="btn-next-line" onClick={() => (window as any).nextLineAfterComplete()}>Next Line</button>
                    </div>
                </div>

                {/* Right Panel Column */}
                <div className="trainer-panel">
                    <div className="panel-content">
                        {/* Mode Header Dropdown */}
                        <div className="mode-header" id="modeHeader" onClick={() => (window as any).toggleLineDropdown()}>
                            <div className="mode-info">
                                <svg className="mode-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-ink-2)' }}>
                                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                                </svg>
                                <div>
                                    <div className="mode-name">Learn</div>
                                    <div className="opening-name" id="openingName">{openingData?.displayName || 'Loading...'}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="line-counter" id="lineCounter">#1</span>
                                <span id="dropdownChevron" style={{ fontSize: '0.7rem', color: 'var(--color-muted)', transition: 'transform 0.2s' }}>▼</span>
                            </div>

                            {/* Line Dropdown popup */}
                            <div className="line-dropdown" id="lineDropdown">
                                <div className="dropdown-list" id="dropdownList"></div>
                            </div>
                        </div>

                        {/* Instruction bubble */}
                        <div className="instruction-dialog">
                            <div className="coach-avatar">
                                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="50" cy="50" r="48" fill="#fbbf24"/>
                                    <text x="50" y="70" textAnchor="middle" fontSize="55" fill="#fff">♔</text>
                                </svg>
                            </div>
                            <div className="speech-bubble">
                                <div className="instruction-text" id="instruction">
                                    Welcome! Loading course repertoire moves...
                                </div>
                            </div>
                        </div>

                        {/* Mode Selector Buttons */}
                        <div className="mode-selector">
                            <button className="mode-btn active" id="modeLearn" onClick={() => (window as any).setMode('learn')}>
                                <div className="mode-btn-main">
                                    <svg className="mode-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-ink)' }}>
                                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                                    </svg>
                                    <span className="mode-title">Learn</span>
                                </div>
                                <span className="mode-sub" id="learnStats">0 lines discovered</span>
                            </button>

                            <button className="mode-btn" id="modePractice" onClick={() => (window as any).setMode('practice')}>
                                <div className="mode-btn-main">
                                    <svg className="mode-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-ink)' }}>
                                        <circle cx="12" cy="12" r="10"/>
                                        <circle cx="12" cy="12" r="6"/>
                                        <circle cx="12" cy="12" r="2"/>
                                    </svg>
                                    <span className="mode-title">Practice</span>
                                </div>
                                <span className="mode-sub" id="practiceStats">0/0 lines perfected</span>
                            </button>

                            <button className="mode-btn locked" id="modePuzzle" onClick={() => (window as any).setMode('puzzle')}>
                                <div className="mode-btn-main">
                                    <svg className="mode-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-ink)', opacity: 0.5 }}>
                                        <path d="M19.439 7.85c-.049.322.059.648.289.878l1.378 1.378a1 1 0 0 1 .289.878c0 .486-.166.893-.457 1.181l-1.99 1.99a1 1 0 0 1-.878.289 1 1 0 0 1-.878-.289l-1.378-1.378a1.05 1.05 0 0 0-.878-.289c-.322 0-.649.059-.878.289l-1.378 1.378a1 1 0 0 1-.878.289 1 1 0 0 1-.878-.289l-1.99-1.99a1 1 0 0 1-.289-.878c0-.486.166-.893.457-1.181l1.378-1.378a1.05 1.05 0 0 0 .289-.878c0-.322-.059-.649-.289-.878l-1.378-1.378a1 1 0 0 1-.289-.878c0-.486.166-.893.457-1.181l1.99-1.99a1 1 0 0 1 .878-.289c.322 0 .649.059.878.289l1.378 1.378a1.05 1.05 0 0 0 .878.289c.322 0 .649-.059.878-.289l1.378-1.378a1 1 0 0 1 .878-.289 1 1 0 0 1 .878.289l1.99 1.99a1 1 0 0 1 .289.878c0 .486-.166.893-.457 1.181l-1.378 1.378a1.05 1.05 0 0 0-.289.878z"/>
                                        <circle cx="12" cy="12" r="3"/>
                                    </svg>
                                    <span className="mode-title">Puzzles</span>
                                </div>
                                <span className="mode-sub">Solve puzzles, win ELO</span>
                            </button>

                            <div className="mode-grid">
                                <button className="mode-btn small locked" id="modeDrill" onClick={() => (window as any).setMode('drill')}>
                                    <div className="mode-btn-main">
                                        <svg className="mode-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-ink)', opacity: 0.5 }}>
                                            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                                        </svg>
                                        <span className="mode-title">Drill</span>
                                    </div>
                                    <span className="mode-sub">Max your streak</span>
                                </button>

                                <button className="mode-btn small locked" id="modeTime" onClick={() => (window as any).setMode('time')}>
                                    <div className="mode-btn-main">
                                        <svg className="mode-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-ink)', opacity: 0.5 }}>
                                            <path d="M5 22h14"/>
                                            <path d="M5 2h14"/>
                                            <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/>
                                            <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>
                                        </svg>
                                        <span className="mode-title">Time Trials</span>
                                    </div>
                                    <span className="mode-sub">Race the clock</span>
                                </button>
                            </div>
                        </div>

                        <div className="mode-panels-container">
                            {/* Drill mode scorecard panel */}
                            <div className="drill-panel" id="drillPanel">
                                <div className="drill-scoreboard">
                                    <div className="drill-score-item">
                                        <span className="drill-score-label">Score</span>
                                        <span className="drill-score-value" id="drillScore">0</span>
                                    </div>
                                    <div className="drill-high-score locked" id="drillHighScoreWrap">
                                        <span className="drill-score-label">High Score</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                            </svg>
                                            <span className="drill-score-value" id="drillHighScore" style={{ fontSize: '1.4rem' }}>--</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="drill-leaderboard">
                                    <div className="drill-leaderboard-header">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"/>
                                            <path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"/>
                                            <path d="M18 9h1.5a1 1 0 0 0 0-5H18"/>
                                            <path d="M4 22h16"/>
                                            <path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/>
                                            <path d="M6 9H4.5a1 1 0 0 1 0-5H6"/>
                                        </svg>
                                        <h3>Leaderboards</h3>
                                    </div>
                                    <div className="drill-leaderboard-msg">Learn all lines to join the leaderboard</div>
                                </div>

                                <button className="btn-leave-drill" onClick={() => (window as any).setMode('learn')}>Leave Drill Mode</button>
                            </div>

                            {/* Time trials mode panel */}
                            <div className="time-panel" id="timePanel">
                                <div className="time-timer">
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span className="timer-secs" id="timeSecs">60</span>
                                        <span className="timer-label">SEC</span>
                                    </div>
                                    <span style={{ fontSize: '2rem', color: 'var(--color-muted)' }}>.</span>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span className="timer-cs" id="timeCs">00</span>
                                        <span className="timer-label">CS</span>
                                    </div>
                                </div>

                                <div className="time-scoreboard">
                                    <div className="drill-score-item">
                                        <span className="drill-score-label">Score</span>
                                        <span className="drill-score-value" id="timeScore">0</span>
                                    </div>
                                    <div className="drill-high-score locked" id="timeHighScoreWrap">
                                        <span className="drill-score-label">High Score</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                            </svg>
                                            <span className="drill-score-value" id="timeHighScore" style={{ fontSize: '1.4rem' }}>--</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="time-leaderboard">
                                    <div className="drill-leaderboard-header">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"/>
                                            <path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"/>
                                            <path d="M18 9h1.5a1 1 0 0 0 0-5H18"/>
                                            <path d="M4 22h16"/>
                                            <path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/>
                                            <path d="M6 9H4.5a1 1 0 0 1 0-5H6"/>
                                        </svg>
                                        <h3>Leaderboards</h3>
                                    </div>
                                    <div className="drill-leaderboard-msg">Learn all lines to join the leaderboard</div>
                                </div>

                                <div className="time-controls" style={{ display: 'flex', gap: '8px' }}>
                                    <button className="btn-leave-drill" style={{ flex: 1 }} onClick={() => (window as any).setMode('learn')}>Leave Time Trials</button>
                                    <button className="btn-leave-drill" style={{ width: 'auto', padding: '12px 16px' }} onClick={() => (window as any).restartTime()}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: '20px', height: '20px' }}>
                                            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                                            <path d="M21 3v5h-5"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Puzzle mode panel */}
                            <div className="puzzle-panel" id="puzzlePanel">
                                <div className="puzzle-rating-display">
                                    <span className="puzzle-rating-label" id="puzzleRatingLabel">Your Puzzle ELO</span>
                                    <span className="puzzle-rating-value" id="puzzleRating">1500</span>
                                </div>

                                <div className="puzzle-divider"></div>

                                <div className="puzzle-streak">
                                    <svg className="puzzle-streak-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                                    </svg>
                                    <div className="puzzle-streak-info">
                                        <span className="puzzle-streak-label">Current streak</span>
                                        <span className="puzzle-streak-value" id="puzzleStreak">0</span>
                                    </div>
                                </div>

                                <div className="puzzle-streak" style={{ marginTop: '8px' }}>
                                    <div className="puzzle-streak-info" style={{ alignItems: 'center' }}>
                                        <span className="puzzle-streak-label">Puzzle difficulty</span>
                                        <span className="puzzle-streak-value" id="puzzleDifficulty" style={{ fontSize: '1rem', color: 'var(--color-ink-2)' }}>---</span>
                                    </div>
                                </div>

                                <button className="btn-leave-drill" onClick={() => (window as any).setMode('learn')} style={{ marginTop: '12px' }}>Leave Puzzles</button>
                            </div>
                        </div>

                        {/* Move history listings */}
                        <div className="trainer-stats">
                            <div className="stats-header">Move History</div>
                            <div className="move-history" id="moveHistory"></div>
                        </div>

                        <div className="lines-list-box" style={{ flex: 1, display: 'flex', flexDirection: 'column', marginTop: 'var(--space-md)' }}>
                            <div className="stats-header">Openings Line List</div>
                            <div className="lines-list" id="linesList" style={{ flex: 1, overflowY: 'auto' }}></div>
                        </div>
                    </div>

                    {/* Footer Controls Toolbar */}
                    <div className="trainer-toolbar">
                        <div className="toolbar-group toolbar-default-left">
                            <span className="version-badge" style={{ padding: '0 8px', color: 'var(--color-muted)' }}>v1.4.0</span>
                            <button className="toolbar-btn" id="btnHint">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
                                    <path d="M9 18h6"/>
                                    <path d="M10 22h4"/>
                                </svg>
                                <span>Hint</span>
                            </button>
                            <button className="toolbar-btn qa-solve-btn" id="btnQaSolve" type="button" title="Temporary QA action">
                                <span>Solve QA</span>
                            </button>
                        </div>
                        
                        <div className="toolbar-group" style={{ display: 'none' }}>
                            <button className="toolbar-btn mobile-mode-toggle" type="button" aria-label="Change mode" onClick={() => document.body.classList.toggle('show-mobile-modes')}>Mode</button>
                        </div>
                        
                        <div className="toolbar-group nav-group toolbar-default-right">
                            <button className="toolbar-btn icon-only" id="btnReset" style={{ marginRight: '8px' }} aria-label="Reset line" title="Reset line progress">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                                    <path d="M21 3v5h-5"/>
                                </svg>
                            </button>
                            <button className="toolbar-btn icon-only" id="btnPrev" aria-label="Previous move">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m15 18-6-6 6-6"/>
                                </svg>
                            </button>
                            <button className="toolbar-btn icon-only" id="btnNext" aria-label="Next move">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m9 18 6-6-6-6"/>
                                </svg>
                            </button>
                        </div>
                        
                        <div className="mobile-complete-controls" id="mobileCompleteControls">
                            <button className="toolbar-btn icon-only" type="button" id="btnCompleteRestart" aria-label="Restart line">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 3a9 9 0 1 1-5.657 2"/>
                                    <path d="M3 4.5h4v4"/>
                                </svg>
                            </button>
                            <button className="toolbar-btn complete-next-line" type="button" id="btnCompleteNext">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                                </svg>
                                <span id="completeNextLabel">Next Line</span>
                            </button>
                            <button className="toolbar-btn mobile-mode-toggle" type="button" aria-label="Change mode" onClick={() => document.body.classList.toggle('show-mobile-modes')}>Mode</button>
                        </div>
                    </div>
                </div>
            </div>

            <div id="feedback" className="feedback hidden"></div>

            {/* Drill Unlock Alert Modal */}
            <div className="unlock-overlay" id="unlockOverlay">
                <div className="unlock-icon">🔥</div>
                <h2>Drill Mode Unlocked!</h2>
                <p>Get as many openings correct in a row as you can!</p>
                <button className="btn-unlock-close" onClick={() => (window as any).closeUnlockModal()}>Let's Go!</button>
            </div>

            {/* Drill Game Over Overlay */}
            <div className="gameover-overlay" id="gameoverOverlay">
                <h2>Game Over</h2>
                <div className="gameover-score" id="gameoverScore">Score: 0</div>
                <div className="gameover-high" id="gameoverHigh">High Score: --</div>
                <button className="btn-next-line" onClick={() => (window as any).restartDrill()}>Try Again</button>
                <button className="btn-next-line" style={{ background: 'var(--color-paper-2)', color: 'var(--color-ink)', marginTop: '8px' }} onClick={() => (window as any).setMode('learn')}>Leave Drill</button>
            </div>

            {/* Time Over Overlay */}
            <div className="gameover-overlay" id="timeoverOverlay">
                <h2 style={{ color: '#fbbf24' }}>Time's Up!</h2>
                <div className="gameover-score" id="timeoverScore">Score: 0</div>
                <div className="gameover-high" id="timeoverHigh">High Score: --</div>
                <button className="btn-next-line" onClick={() => (window as any).restartTime()}>Try Again</button>
                <button className="btn-next-line" style={{ background: 'var(--color-paper-2)', color: 'var(--color-ink)', marginTop: '8px' }} onClick={() => (window as any).setMode('learn')}>Leave Time Trials</button>
            </div>
        </div>
    );
}
