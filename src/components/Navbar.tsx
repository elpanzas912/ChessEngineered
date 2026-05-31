// src/components/Navbar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import AuthModal from './AuthModal';
import SettingsMenu from './SettingsMenu';

export default function Navbar() {
    const {
        user,
        logout,
        hasActiveSubscription,
        boardTheme,
        userProgress
    } = useApp();

    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [streakPopoverOpen, setStreakPopoverOpen] = useState(false);

    const [streakCount, setStreakCount] = useState(0);
    const [streakDates, setStreakDates] = useState<any>({});
    const [lastActiveDate, setLastActiveDate] = useState<string | null>(null);

    // Load streak data
    useEffect(() => {
        try {
            const streak = userProgress?.dailyStreak || {};
            let count = Math.max(0, Math.round(Number(streak.count) || 0));
            
            if (typeof streak.lastActiveDate === 'string') {
                const [year, month, day] = streak.lastActiveDate.split('-').map(Number);
                const last = new Date(year, month - 1, day);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (Math.round((today.getTime() - last.getTime()) / 86400000) > 1) {
                    count = 0;
                }
            }
            
            setStreakCount(count);
            setLastActiveDate(streak.lastActiveDate || null);
            setStreakDates(streak.activityDates || {});
        } catch (e) {
            setStreakCount(0);
            setStreakDates({});
        }
    }, [userProgress]);

    const getLocalDateKey = (date = new Date()) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const renderDailyWeek = () => {
        const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        const today = new Date();
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        
        return labels.map((label, index) => {
            const day = new Date(start);
            day.setDate(start.getDate() + index);
            const key = getLocalDateKey(day);
            const active = Number(streakDates?.[key]) > 0;
            const isToday = key === getLocalDateKey(today);
            
            return (
                <div key={index} className={`daily-week-day ${isToday ? 'today' : ''}`}>
                    <span>{label}</span>
                    <div className={`daily-week-dot ${active ? 'active' : ''}`} title={key}>
                        {active && (
                            <svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                                <path d="M9.765 3.205a.75.75 0 0 1 .03 1.06l-4.25 4.5a.75.75 0 0 1-1.075.015L2.22 6.53a.75.75 0 0 1 1.06-1.06l1.705 1.704l3.72-3.939a.75.75 0 0 1 1.06-.03"/>
                            </svg>
                        )}
                    </div>
                </div>
            );
        });
    };

    const todayDone = lastActiveDate === getLocalDateKey();

    return (
        <>
            <nav style={{ position: 'relative', zIndex: 100 }}>
                <div className="nav-shell">
                    <Link href="/openings" className="nav-logo" aria-label="ChessEngineered home">
                        <span className="nav-logo-mark" aria-hidden="true">
                            <svg height="100%" width="100%" viewBox="0 0 962 1973" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" clip-rule="evenodd" d="M260.013 382.733L182.267 165.24L354.227 210.947L475.627 0.0401493L598.907 214.787L773.933 165.24L696.826 380.947C636.506 335.054 561.24 307.787 479.6 307.787C396.893 307.787 320.733 335.76 260.013 382.733Z" fill="#FBBF24"/>
                                <path fillRule="evenodd" clip-rule="evenodd" d="M480.067 401.747C619.853 401.747 733.173 515.067 733.173 654.853C733.173 740.693 690.427 816.547 625.067 862.307H676.12C699.52 862.307 718.653 881.453 718.653 904.84C718.653 928.24 699.52 947.373 676.12 947.373H635.28C635.28 947.373 577.187 1320.81 788.813 1474.35V1538.67C788.813 1538.67 927.813 1644.48 929.893 1700.49C931.96 1756.51 919.52 1783.48 919.52 1783.48C919.52 1783.48 977.613 1862.32 956.867 1920.41C937.867 1973.57 547.04 1972.87 480.92 1972.37C414.8 1972.87 23.96 1973.57 4.96001 1920.41C-15.7867 1862.32 42.3066 1783.48 42.3066 1783.48C42.3066 1783.48 29.8666 1756.51 31.9333 1700.49C34.0133 1644.48 173.013 1538.67 173.013 1538.67V1474.35C384.64 1320.81 326.547 947.373 326.547 947.373H290.227C266.84 947.373 247.693 928.24 247.693 904.84C247.693 881.453 266.84 862.307 290.227 862.307H335.067C269.693 816.547 226.947 740.693 226.947 654.853C226.947 515.067 340.28 401.747 480.067 401.747Z" fill="white"/>
                            </svg>
                        </span>
                        <span className="nav-wordmark nav-wordmark-mobile">chessengineered</span>
                        <span className="nav-wordmark nav-wordmark-desktop">chessengineered.com</span>
                    </Link>

                    <div className="nav-right" style={{ position: 'relative' }}>
                        {!hasActiveSubscription && (
                            <Link className="nav-primary-link" href="/plans">
                                <span>Start for free</span>
                            </Link>
                        )}
                        
                        <div id="userMenu">
                            {user ? (
                                <button className="nav-icon-btn active" onClick={logout} title="Log out" aria-label="Log out">
                                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ width: '22px', height: '22px' }}>
                                        <path d="M16 17v-3H9v-4h7V7l5 5zm-2 4H4V3h10v3h2V1H2v22h14v-5h-2z"/>
                                    </svg>
                                </button>
                            ) : (
                                <button className="nav-icon-btn" id="btnLogin" onClick={() => setAuthModalOpen(true)} aria-label="Log in">
                                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                        <path d="M16 14a5 5 0 0 1 4.995 4.783L21 19v1a2 2 0 0 1-1.85 1.995L19 22H5a2 2 0 0 1-1.995-1.85L3 20v-1a5 5 0 0 1 4.783-4.995L8 14zM12 2a5 5 0 1 1 0 10a5 5 0 0 1 0-10"/>
                                    </svg>
                                </button>
                            )}
                        </div>

                        {user && (
                            <Link className="nav-icon-btn nav-leaderboard" href="/profile" aria-label="Profile stats">
                                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path d="M21.083 4.585a2.62 2.62 0 0 0-1.904-.69h-1.426a2.7 2.7 0 0 0-.768-1.162a2.68 2.68 0 0 0-1.924-.69H8.979a2.7 2.7 0 0 0-1.994.69a2.6 2.6 0 0 0-.748 1.161H4.831a2.64 2.64 0 0 0-1.934.69A2.73 2.73 0 0 0 2 6.497a7.6 7.6 0 0 0 .997 3.682a8.4 8.4 0 0 0 2.642 2.862l.848.57l.638.391a6.2 6.2 0 0 0 2.083 2.002v1.76H8.82c-.714 0-1.4.285-1.904.792a2.7 2.7 0 0 0-.788 1.91v.33a1.23 1.23 0 0 0 .359.881c.233.232.549.361.877.36h9.272a1.22 1.22 0 0 0 1.145-.764c.062-.15.093-.313.091-.476v-.33a2.7 2.7 0 0 0-.788-1.91a2.7 2.7 0 0 0-1.903-.792h-.39v-1.771a6.2 6.2 0 0 0 2.094-2.002l.658-.4l.808-.55a8.5 8.5 0 0 0 2.652-2.873A7.7 7.7 0 0 0 22 6.447a2.76 2.76 0 0 0-.917-1.861M4.303 9.458a6.1 6.1 0 0 1-.768-2.902a1.22 1.22 0 0 1 .825-1.08c.151-.05.312-.072.471-.06h1.306v5.343q.013.427.07.85a6.8 6.8 0 0 1-1.904-2.151m15.414 0a7.15 7.15 0 0 1-1.904 2.152q.057-.435.07-.871V5.415h1.335a1.15 1.15 0 0 1 .868.31c.227.2.37.48.399.781a6.2 6.2 0 0 1-.768 2.952"/>
                                </svg>
                            </Link>
                        )}

                        <button 
                            className="daily-streak-card" 
                            type="button" 
                            id="dailyStreakCard" 
                            aria-label="Daily streak" 
                            aria-expanded={streakPopoverOpen}
                            onClick={() => setStreakPopoverOpen(!streakPopoverOpen)}
                        >
                            <span className="daily-streak-flame" aria-hidden="true">
                                <svg viewBox="0 0 70 85" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M4 50.5C4 67.2 17.9 80.8 35 80.8S66 67.2 66 50.5c0-7.1-2.5-13.5-6.6-18.7L39.5 6.6a5.74 5.74 0 0 0-9 0L19.2 20.9l-6.4-4A5.75 5.75 0 0 0 4 21.7v28.8Z" fill="#FF9600"/>
                                    <path d="M24.6 47.6c.1-.1.1-.1.1-.2l8.4-10.5a2.47 2.47 0 0 1 3.8 0l8.4 10.5.1.2a12.66 12.66 0 0 1 2.8 8c0 7.1-5.9 12.9-13.2 12.9s-13.2-5.8-13.2-12.9c0-3 1-5.8 2.8-8Z" fill="#FFC800"/>
                                </svg>
                            </span>
                            <span className="daily-streak-count" id="dailyStreakCount">{streakCount}</span>
                        </button>

                        {/* Settings Button */}
                        <button 
                            className="nav-icon-btn" 
                            id="btnSettings" 
                            style={{ marginLeft: '8px' }} 
                            aria-expanded={settingsOpen}
                            onClick={() => setSettingsOpen(!settingsOpen)}
                            aria-label="Settings"
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '22px', height: '22px' }}>
                                <circle cx="12" cy="12" r="3"/>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 21 9.4a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                            </svg>
                        </button>

                        <SettingsMenu isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

                        {streakPopoverOpen && (
                            <>
                                <div className="streak-backdrop" onClick={() => setStreakPopoverOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />
                                <div className="daily-streak-popover" id="dailyStreakPopover" role="dialog" aria-label="Daily streak details" style={{ position: 'absolute', right: 0, top: '100%', zIndex: 999, display: 'block' }}>
                                    <div className="daily-streak-popover-top">
                                        <div className="daily-streak-popover-copy">
                                            <strong id="dailyStreakPopoverTitle">{streakCount} day streak</strong>
                                            <span id="dailyStreakPopoverSub">
                                                {todayDone 
                                                    ? "You've practiced a line today!" 
                                                    : "Complete one line today to keep it going."}
                                            </span>
                                        </div>
                                        <div className="daily-streak-popover-flame" aria-hidden="true">
                                            <svg viewBox="0 0 70 85" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M4 50.5C4 67.2 17.9 80.8 35 80.8S66 67.2 66 50.5c0-7.1-2.5-13.5-6.6-18.7L39.5 6.6a5.74 5.74 0 0 0-9 0L19.2 20.9l-6.4-4A5.75 5.75 0 0 0 4 21.7v28.8Z" fill="#FF9600"/>
                                                <path d="M24.6 47.6c.1-.1.1-.1.1-.2l8.4-10.5a2.47 2.47 0 0 1 3.8 0l8.4 10.5.1.2a12.66 12.66 0 0 1 2.8 8c0 7.1-5.9 12.9-13.2 12.9s-13.2-5.8-13.2-12.9c0-3 1-5.8 2.8-8Z" fill="#FFC800"/>
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="daily-week-grid" id="dailyWeekGrid">
                                        {renderDailyWeek()}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
        </>
    );
}
