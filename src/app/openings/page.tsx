// src/app/openings/page.tsx
'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import '@/styles/openings.css';

export default function OpeningsPage() {
    const {
        user,
        catalog,
        hasActiveSubscription,
        serverFreeOpening,
        userProgress
    } = useApp();

    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [colorFilter, setColorFilter] = useState<'all' | 'white' | 'black'>('all');
    const [courses, setCourses] = useState<any[]>([]);
    const [totalLines, setTotalLines] = useState(0);

    // Hydrated free opening from local storage
    const [localFreeOpening, setLocalFreeOpening] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setLocalFreeOpening(localStorage.getItem('chessengineered_free_opening'));
        }
    }, [serverFreeOpening]);

    const activeFreeOpening = serverFreeOpening || localFreeOpening;

    // Process openings list
    useEffect(() => {
        if (!catalog || Object.keys(catalog).length === 0) return;

        let entries = Object.entries(catalog);

        // Usage sorting
        let usage: any = {};
        try {
            usage = JSON.parse(localStorage.getItem('chessengineered_usage') || '{}');
        } catch (e) {}

        entries.sort((a: any, b: any) => {
            const slugA = a[0];
            const slugB = b[0];
            const usageA = usage[slugA] || { count: 0, lastUsed: 0 };
            const usageB = usage[slugB] || { count: 0, lastUsed: 0 };

            if (usageB.lastUsed !== usageA.lastUsed) {
                return usageB.lastUsed - usageA.lastUsed;
            }
            if (usageB.count !== usageA.count) {
                return usageB.count - usageA.count;
            }
            return a[1].displayName.localeCompare(b[1].displayName);
        });

        // Filter by side
        if (colorFilter !== 'all') {
            entries = entries.filter(([, o]: any) => o.playerSide === colorFilter[0]);
        }

        // Filter by search
        if (searchTerm) {
            const query = searchTerm.toLowerCase();
            entries = entries.filter(([, o]: any) => {
                const name = o.displayName.toLowerCase();
                const desc = o.description ? o.description.toLowerCase() : '';
                return name.includes(query) || desc.includes(query);
            });
        }

        const mapped = entries.map(([slug, o]: any) => {
            const lineCount = Number(o.lineCount) || 0;
            
            // Calculate progress metrics
            let learnedCount = 0;
            let practicePerfectedCount = 0;

            try {
                const progress = userProgress || {};
                learnedCount = Math.min(
                    lineCount,
                    new Set((progress[slug]?.learnedLines || []).map((line: any) => String(line).trim())).size
                );
                const lineProgress = progress[slug]?.lines || {};
                practicePerfectedCount = Math.min(
                    lineCount,
                    Object.values(lineProgress)
                        .filter((line: any) => (Number(line?.practicePerfectAttempts) || 0) > 0)
                        .length
                );
            } catch (e) {}

            const pct = lineCount > 0 ? Math.round((learnedCount / lineCount) * 100) : 0;
            const practicePct = lineCount > 0 ? Math.round((practicePerfectedCount / lineCount) * 100) : 0;

            const isUnlocked = hasActiveSubscription || activeFreeOpening === slug;
            const isFreePickable = !hasActiveSubscription && !activeFreeOpening;

            return {
                slug,
                displayName: o.displayName,
                playerSide: o.playerSide,
                lineCount,
                description: o.description || 'Practice this opening with interactive training.',
                learnedCount,
                practicePerfectedCount,
                pct,
                practicePct,
                isUnlocked,
                isFreePickable
            };
        });

        setCourses(mapped);

        // Sum lines
        const sum = entries.reduce((acc, [, o]: any) => acc + (Number(o.lineCount) || 0), 0);
        setTotalLines(sum);

    }, [catalog, colorFilter, searchTerm, userProgress, hasActiveSubscription, activeFreeOpening]);

    const trackOpeningUsage = (slug: string) => {
        try {
            const usage = JSON.parse(localStorage.getItem('chessengineered_usage') || '{}');
            if (!usage[slug]) {
                usage[slug] = { count: 0, lastUsed: 0 };
            }
            usage[slug].count += 1;
            usage[slug].lastUsed = Date.now();
            localStorage.setItem('chessengineered_usage', JSON.stringify(usage));
        } catch (e) {}
    };

    const handleCardClick = (course: any) => {
        if (course.isFreePickable) {
            localStorage.setItem('chessengineered_free_opening', course.slug);
            setLocalFreeOpening(course.slug);
            trackOpeningUsage(course.slug);
            router.push(`/opening/${course.slug}`);
        } else if (course.isUnlocked) {
            trackOpeningUsage(course.slug);
            router.push(`/opening/${course.slug}`);
        } else {
            router.push('/plans');
        }
    };

    return (
        <div style={{ minHeight: '80vh' }}>
            {/* ── Free Tier Banner ── */}
            {!hasActiveSubscription && !activeFreeOpening && (
                <div className="free-tier-banner" id="freeTierBanner" style={{ display: 'block' }}>
                    <div className="free-tier-inner">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 21 9.4a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                        </svg>
                        <span>Pick <strong>one opening</strong> to unlock for free. Upgrade anytime for all 30+.</span>
                    </div>
                </div>
            )}

            {/* ── HERO ── */}
            <div className="hero">
                <div className="hero-bg"></div>
                <div className="hero-bg-fade"></div>
                <div className="hero-pieces">
                    <span className="hero-piece hp-1">♜</span>
                    <span className="hero-piece hp-2">♚</span>
                    <span className="hero-piece hp-3">♞</span>
                    <span className="hero-piece hp-4">♟</span>
                </div>
                <div className="hero-rule"></div>

                <div className="hero-content">
                    <p className="hero-eyebrow">Chess Opening Repertoire</p>
                    <h1 className="hero-title">Master the<br/><em>Opening</em></h1>
                    <p className="hero-sub">Practice your openings with interactive<br/>move-by-move training.</p>
                </div>
            </div>

            {/* ── MAIN ── */}
            <main>
                <div className="toolbar">
                    <div className="toolbar-left">
                        <button 
                            className={`filter-btn ${colorFilter === 'all' ? 'active' : ''}`}
                            onClick={() => setColorFilter('all')}
                        >
                            All
                        </button>
                        <button 
                            className={`filter-btn ${colorFilter === 'white' ? 'active' : ''}`}
                            onClick={() => setColorFilter('white')}
                        >
                            <span className="filter-dot" style={{ background: '#e8e8e8' }}></span> White
                        </button>
                        <button 
                            className={`filter-btn ${colorFilter === 'black' ? 'active' : ''}`}
                            onClick={() => setColorFilter('black')}
                        >
                            <span className="filter-dot" style={{ background: '#d4a843' }}></span> Black
                        </button>
                        <div className="search-wrap">
                            <span className="search-icon">⌕</span>
                            <input 
                                type="text" 
                                className="search-input" 
                                placeholder="Search openings…"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="toolbar-right">
                        <strong>{courses.length}</strong> openings · <strong>{totalLines}</strong> lines
                    </div>
                </div>

                <div className="section-label" id="sectionLabel">
                    {colorFilter === 'all' && 'All openings'}
                    {colorFilter === 'white' && 'White openings'}
                    {colorFilter === 'black' && 'Black openings'}
                    {searchTerm && ` · "${searchTerm}"`}
                </div>

                <div className="grid" id="courseGrid">
                    {courses.map((course) => {
                        const sideLabel = course.playerSide === 'w' ? 'White' : 'Black';
                        const learnCompleteClass = course.lineCount > 0 && course.learnedCount >= course.lineCount ? ' progress-fill-complete' : '';

                        return (
                            <a 
                                key={course.slug}
                                className={`card ${!course.isUnlocked && !course.isFreePickable ? 'card-locked' : ''}`}
                                href={`/opening/${course.slug}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleCardClick(course);
                                }}
                                aria-label={course.displayName}
                                data-side={course.playerSide === 'w' ? 'white' : 'black'}
                            >
                                <div className="card-thumb">
                                    <img src={`/boards/${course.slug}.png`} alt={`${course.displayName} board`} />
                                    {!course.isUnlocked && !course.isFreePickable && (
                                        <div className="card-lock">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <div className="card-body">
                                    <div className="card-main">
                                        <div className="card-top">
                                            <h2 className="card-title">{course.displayName}</h2>
                                            <div className="card-badges">
                                                <span className={`badge badge-${course.playerSide === 'w' ? 'white' : 'black'}`}>{sideLabel}</span>
                                                {course.isFreePickable && <span className="badge badge-free">Pick Free</span>}
                                                {activeFreeOpening === course.slug && !hasActiveSubscription && <span className="badge badge-unlocked">Free</span>}
                                            </div>
                                        </div>
                                        <p className="card-desc">{course.description}</p>
                                        <div className="card-progress-wrap">
                                            <span className="card-lines">
                                                <strong>{course.learnedCount}/{course.lineCount}</strong> lines
                                            </span>
                                            <div 
                                                className="progress-track"
                                                aria-label={`${course.learnedCount}/${course.lineCount} lines discovered, ${course.practicePerfectedCount}/${course.lineCount} lines perfected in practice`}
                                            >
                                                <div className="progress-fill progress-fill-practice" style={{ width: `${course.practicePct}%` }}></div>
                                                <div className="progress-fill progress-fill-learn${learnCompleteClass}" style={{ width: `${course.pct}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="card-foot">
                                        <span className="card-cta">
                                            {course.isFreePickable ? 'Pick as Free' : (course.isUnlocked ? 'Start training' : 'Upgrade to unlock')} 
                                            <span className="cta-arrow"> →</span>
                                        </span>
                                    </div>
                                </div>
                            </a>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}
