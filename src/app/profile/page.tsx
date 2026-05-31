// src/app/profile/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import '@/styles/profile.css';

export default function ProfilePage() {
    const { user, catalog, userProgress, hasActiveSubscription } = useApp();

    const [openingsPracticedCount, setOpeningsPracticedCount] = useState(0);
    const [linesLearnedCount, setLinesLearnedCount] = useState(0);
    const [streakCount, setStreakCount] = useState(0);
    
    // Time metrics
    const [totalTimeFormatted, setTotalTimeFormatted] = useState('0m');
    const [timeBreakdowns, setTimeBreakdowns] = useState<any>({ learn: 0, practice: 0, drill: 0, time: 0, puzzle: 0 });
    const [totalTimeMs, setTotalTimeMs] = useState(0);

    // Accuracy filters & states
    const [accuracyOpeningFilter, setAccuracyOpeningFilter] = useState('all');
    const [accuracyLineFilter, setAccuracyLineFilter] = useState('all');
    const [accuracyModeFilter, setAccuracyModeFilter] = useState<'all' | 'learn' | 'practice'>('all');
    
    const [accuracyLinesList, setAccuracyLinesList] = useState<string[]>([]);
    const [accuracyStatsSummary, setAccuracyStatsSummary] = useState({ correct: 0, incorrect: 0, pct: 0 });
    const [accuracyChartSvgHtml, setAccuracyChartSvgHtml] = useState<React.ReactNode | null>(null);

    // Heatmap states
    const [heatmapCells, setHeatmapCells] = useState<any[]>([]);
    const [heatmapMonthLabels, setHeatmapMonthLabels] = useState<any[]>([]);
    const [heatmapWeeks, setHeatmapWeeks] = useState(53);
    const [activeTooltip, setActiveTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

    // Favorites / Progress opening list
    const [favoriteCourses, setFavoriteCourses] = useState<any[]>([]);

    const formatDuration = (milliseconds: number) => {
        const safeMs = Math.max(0, Number(milliseconds) || 0);
        if (safeMs > 0 && safeMs < 60000) return '<1m';
        const totalMinutes = Math.floor(safeMs / 60000);
        if (totalMinutes < 60) return totalMinutes + 'm';
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
    };

    const formatTimeWithPct = (valMs: number) => {
        const duration = formatDuration(valMs);
        if (totalTimeMs <= 0) return `${duration} (0%)`;
        const pct = Math.round(valMs / totalTimeMs * 100);
        return `${duration} (${pct}%)`;
    };

    // Hydrate stats
    useEffect(() => {
        if (!userProgress) return;

        let usage: any = {};
        try {
            usage = JSON.parse(localStorage.getItem('chessengineered_usage') || '{}');
        } catch (e) {}
        setOpeningsPracticedCount(Object.keys(usage).length);

        // Lines learned
        let lines = 0;
        for (const slug in userProgress) {
            if (!['puzzleELO', 'puzzleStreak', 'dailyStreak', 'trainingTime', 'accuracy'].includes(slug)) {
                lines += userProgress[slug]?.learnedLines?.length || 0;
            }
        }
        setLinesLearnedCount(lines);

        // Daily streak
        const streak = Math.max(0, Math.round(Number(userProgress.dailyStreak?.count) || 0));
        setStreakCount(streak);

        // Training time
        const timeData = userProgress.trainingTime || {};
        const normalized = ['learn', 'practice', 'drill', 'time', 'puzzle'].reduce((acc: any, mode) => {
            acc[mode] = Math.max(0, Math.round(Number(timeData[mode]) || 0));
            return acc;
        }, {});

        setTimeBreakdowns(normalized);
        const sumMs = Object.values(normalized).reduce((acc: number, val: any) => acc + val, 0) as number;
        setTotalTimeMs(sumMs);
        setTotalTimeFormatted(formatDuration(sumMs));

    }, [userProgress]);

    // Build Activity Heatmap Grid
    useEffect(() => {
        const getPracticeActivityDates = () => {
            const result: any = {};
            try {
                // Sincronizar fechas del daily streak y del progreso de líneas
                const dailyDates = userProgress?.dailyStreak?.activityDates || {};
                for (const k in dailyDates) {
                    result[k] = (result[k] || 0) + Number(dailyDates[k]);
                }
                
                for (const slug in userProgress) {
                    if (['puzzleELO', 'puzzleStreak', 'dailyStreak', 'trainingTime', 'accuracy'].includes(slug)) continue;
                    const linesData = userProgress[slug]?.lines || {};
                    for (const pgn in linesData) {
                        const ts = Number(linesData[pgn]?.lastAttemptTimestamp);
                        if (ts) {
                            const date = new Date(ts);
                            const key = getLocalDateKey(date);
                            result[key] = (result[key] || 0) + 1;
                        }
                    }
                }
            } catch (e) {}
            return result;
        };

        const getLocalDateKey = (d: Date) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        const activityDates = getPracticeActivityDates();
        const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
        const weeks = isMobile ? 22 : 53;
        setHeatmapWeeks(weeks);
        const days = 7;
        const endDate = new Date();
        endDate.setHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate() - (endDate.getDay() || 7) + 7); // Next Sunday
        const startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - (weeks * days - 1));

        // Month Labels
        const labels: any[] = [];
        let prevMonth = -1;
        let lastLabelW = -99;
        for (let w = 0; w < weeks; w++) {
            const weekDate = new Date(startDate);
            weekDate.setDate(startDate.getDate() + w * days);
            const m = weekDate.getMonth();
            if (w === 0 || (m !== prevMonth && (w - lastLabelW >= 4))) {
                const label = weekDate.toLocaleDateString('en-US', { month: 'short' });
                labels.push({ label, col: w + 1 });
                lastLabelW = w;
            }
            prevMonth = m;
        }
        setHeatmapMonthLabels(labels);

        // Grid Cells
        const gridCells = [];
        for (let w = 0; w < weeks; w++) {
            for (let d = 0; d < days; d++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + w * days + d);
                const dateStr = getLocalDateKey(date);

                const count = Number(activityDates[dateStr]) || 0;
                let intensity = 0;
                if (count > 0) intensity = 1;
                if (count >= 2) intensity = 2;
                if (count >= 4) intensity = 3;
                if (count >= 7) intensity = 4;

                const tooltip = `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · ${count} ${count === 1 ? 'line' : 'lines'} practiced`;
                
                gridCells.push({
                    intensity,
                    tooltip,
                    row: d + 1,
                    col: w + 1
                });
            }
        }
        setHeatmapCells(gridCells);
    }, [userProgress]);

    // Build Accuracy Chart
    useEffect(() => {
        if (!userProgress) return;
        const accuracy = userProgress.accuracy || {};
        const dates = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            dates.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
        }

        // Hydrate openings list
        const accuracyOpenings = Object.keys(accuracy.openings || {}).sort((a, b) => {
            const an = catalog[a]?.displayName || a;
            const bn = catalog[b]?.displayName || b;
            return an.localeCompare(bn);
        });

        // Set lines list for current opening selection
        if (accuracyOpeningFilter !== 'all' && accuracy.openings?.[accuracyOpeningFilter]) {
            const linesList = Object.keys(accuracy.openings[accuracyOpeningFilter].lines || {});
            setAccuracyLinesList(linesList);
        } else {
            setAccuracyLinesList([]);
        }

        const dailyBucket = accuracyOpeningFilter === 'all'
            ? accuracy.daily || {}
            : accuracyLineFilter === 'all'
                ? accuracy.openings?.[accuracyOpeningFilter]?.daily || {}
                : accuracy.openings?.[accuracyOpeningFilter]?.lines?.[accuracyLineFilter]?.daily || {};

        const points = dates.map(date => {
            const bucket = dailyBucket[date] || { learn: { correct: 0, incorrect: 0 }, practice: { correct: 0, incorrect: 0 } };
            const correct = accuracyModeFilter === 'all' 
                ? (bucket.learn?.correct || 0) + (bucket.practice?.correct || 0)
                : bucket[accuracyModeFilter]?.correct || 0;
            const incorrect = accuracyModeFilter === 'all'
                ? (bucket.learn?.incorrect || 0) + (bucket.practice?.incorrect || 0)
                : bucket[accuracyModeFilter]?.incorrect || 0;
            return {
                date,
                correct,
                incorrect,
                total: correct + incorrect
            };
        });

        // Sum stats summary
        const sumCorrect = points.reduce((acc, p) => acc + p.correct, 0);
        const sumIncorrect = points.reduce((acc, p) => acc + p.incorrect, 0);
        const sumTotal = sumCorrect + sumIncorrect;
        const sumPct = sumTotal ? Math.round((sumCorrect / sumTotal) * 100) : 0;
        setAccuracyStatsSummary({ correct: sumCorrect, incorrect: sumIncorrect, pct: sumPct });

        // Draw SVG
        const maxTotal = Math.max(1, ...points.map(p => p.total));
        const width = 560;
        const height = 180;
        const padding = 24;
        const gap = 8;
        const barWidth = (width - padding * 2 - gap * (points.length - 1)) / points.length;
        const chartHeight = height - 52;

        const renderedBars = points.map((point, index) => {
            const x = padding + index * (barWidth + gap);
            const correctHeight = chartHeight * (point.correct / maxTotal);
            const incorrectHeight = chartHeight * (point.incorrect / maxTotal);
            const incorrectY = padding + chartHeight - incorrectHeight;
            const correctY = incorrectY - correctHeight;
            const label = point.date.slice(5).replace('-', '/');

            return (
                <g key={index}>
                    <rect x={x} y={correctY} width={barWidth} height={correctHeight} rx="2" className="accuracy-correct" style={{ fill: '#34d399' }}></rect>
                    <rect x={x} y={incorrectY} width={barWidth} height={incorrectHeight} rx="2" className="accuracy-incorrect" style={{ fill: '#ef4444' }}></rect>
                    <text x={x + barWidth / 2} y={height - 12} text-anchor="middle" style={{ fill: 'var(--color-muted)', fontSize: '10px' }}>{label}</text>
                </g>
            );
        });

        setAccuracyChartSvgHtml(
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Accuracy chart" style={{ overflow: 'visible', width: '100%', height: '100%' }}>
                <line x1={padding} y1={padding + chartHeight} x2={width - padding} y2={padding + chartHeight} className="accuracy-axis" style={{ stroke: 'var(--color-rule)' }}></line>
                {renderedBars}
            </svg>
        );

    }, [userProgress, catalog, accuracyOpeningFilter, accuracyLineFilter, accuracyModeFilter]);

    // Build Openings / Favorites progressed list
    useEffect(() => {
        if (!catalog || Object.keys(catalog).length === 0) return;

        let entries = Object.entries(catalog);
        let usage: any = {};
        try {
            usage = JSON.parse(localStorage.getItem('chessengineered_usage') || '{}');
        } catch (e) {}

        const favorited = entries
            .filter(([slug]) => usage[slug])
            .map(([slug, o]: any) => {
                const lineCount = o.lineCount || 0;
                let learned = 0;
                let highDrill = 0;
                let highTime = 0;

                try {
                    const prog = userProgress?.[slug] || {};
                    learned = (prog.learnedLines || []).length;
                    highDrill = prog.drillHighScore || 0;
                    highTime = prog.timeHighScore || 0;
                } catch (e) {}

                return {
                    slug,
                    displayName: o.displayName,
                    playerSide: o.playerSide,
                    lineCount,
                    learned,
                    highDrill,
                    highTime
                };
            });

        setFavoriteCourses(favorited);

    }, [catalog, userProgress]);

    const handleCellHover = (e: React.MouseEvent, text: string) => {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        setActiveTooltip({
            text,
            x: rect.left + rect.width / 2,
            y: rect.top - 12
        });
    };

    if (!user) {
        return (
            <div style={{ minHeight: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 'var(--space-xl)' }}>
                <div className="auth-card" style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
                    <div className="auth-card-icon" style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>👤</div>
                    <h2>Guest Mode</h2>
                    <p style={{ color: 'var(--color-muted)', marginBottom: 'var(--space-lg)' }}>
                        Register or log in to sync your practice lines across multiple devices, track streaks, and view accuracy graphs.
                    </p>
                    <Link href="/checkout" className="btn btn-primary" style={{ width: '100%' }}>
                        Log in or Sign up
                    </Link>
                </div>
            </div>
        );
    }

    const name = user.email ? user.email.split('@')[0] : 'User';
    const initial = name.charAt(0).toUpperCase();
    const divisor = totalTimeMs > 0 ? totalTimeMs : 1;

    return (
        <div className="profile-container" style={{ minHeight: '85vh', padding: 'var(--space-lg) var(--space-md)' }}>
            
            {/* ── Profile Header ── */}
            <header className="profile-header-card">
                <div className="profile-user-info">
                    <div className="profile-avatar">{initial}</div>
                    <div className="profile-text">
                        <h1 className="profile-name" id="profileName">{name}</h1>
                        <p className="profile-email" id="profileEmail">{user.email}</p>
                        <p className="profile-joined">
                            Joined {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                </div>

                <div className="profile-subscription-status" id="subscriptionStatus">
                    {hasActiveSubscription ? (
                        <>
                            <span className="status-badge status-active">Unlimited Pass</span>
                            <span className="status-desc" id="subscriptionDesc">You have full access to all openings and features.</span>
                        </>
                    ) : (
                        <>
                            <span className="status-badge status-free">Free Member</span>
                            <span className="status-desc" id="subscriptionDesc">Upgrade to access all openings and sync progress.</span>
                            <Link href="/plans" className="btn btn-primary" id="upgradeBtn" style={{ marginTop: '8px' }}>
                                Upgrade now
                            </Link>
                        </>
                    )}
                </div>
            </header>

            {/* ── Grid Dashboard ── */}
            <div className="profile-dashboard-grid">
                
                {/* ── Box 1: Stats ── */}
                <div className="profile-box profile-stats-box">
                    <h3 className="box-title">Overall Stats</h3>
                    <div className="stats-strip">
                        <div className="stat-card">
                            <span className="number" id="statOpenings">{openingsPracticedCount}</span>
                            <span className="label">Openings Practiced</span>
                        </div>
                        <div className="stat-card">
                            <span className="number" id="statLines">{linesLearnedCount}</span>
                            <span className="label">Lines Learned</span>
                        </div>
                        <div className="stat-card">
                            <span className="number" id="statStreak">{streakCount}</span>
                            <span className="label">Day Streak</span>
                        </div>
                        <div className="stat-card">
                            <span className="number" id="statTime">{totalTimeFormatted}</span>
                            <span className="label">Time Invested</span>
                        </div>
                    </div>
                </div>

                {/* ── Box 2: Time breakdown (Zen Bars) ── */}
                <div className="profile-box profile-time-box">
                    <div className="box-header">
                        <h3 className="box-title">Practice Distribution</h3>
                        <span className="badge" id="trainingTotalBadge">Total: {totalTimeFormatted}</span>
                    </div>
                    <div className="zen-bars-wrap">
                        <div className="zen-row">
                            <span className="label">Learn</span>
                            <div className="track"><div className="fill fill-learn" id="barLearn" style={{ width: `${(timeBreakdowns.learn / divisor * 100)}%` }}></div></div>
                            <span className="value" id="timeLearn">{formatTimeWithPct(timeBreakdowns.learn)}</span>
                        </div>
                        <div className="zen-row">
                            <span className="label">Practice</span>
                            <div className="track"><div className="fill fill-practice" id="barPractice" style={{ width: `${(timeBreakdowns.practice / divisor * 100)}%` }}></div></div>
                            <span className="value" id="timePractice">{formatTimeWithPct(timeBreakdowns.practice)}</span>
                        </div>
                        <div className="zen-row">
                            <span className="label">Drill</span>
                            <div className="track"><div className="fill fill-drill" id="barDrill" style={{ width: `${(timeBreakdowns.drill / divisor * 100)}%` }}></div></div>
                            <span className="value" id="timeDrill">{formatTimeWithPct(timeBreakdowns.drill)}</span>
                        </div>
                        <div className="zen-row">
                            <span className="label">Time trial</span>
                            <div className="track"><div className="fill fill-time" id="barTrial" style={{ width: `${(timeBreakdowns.time / divisor * 100)}%` }}></div></div>
                            <span className="value" id="timeTrial">{formatTimeWithPct(timeBreakdowns.time)}</span>
                        </div>
                        <div className="zen-row">
                            <span className="label">Puzzles</span>
                            <div className="track"><div className="fill fill-puzzle" id="barPuzzle" style={{ width: `${(timeBreakdowns.puzzle / divisor * 100)}%` }}></div></div>
                            <span className="value" id="timePuzzle">{formatTimeWithPct(timeBreakdowns.puzzle)}</span>
                        </div>
                    </div>
                </div>

                {/* ── Box 3: Accuracy Stacked Chart ── */}
                <div className="profile-box profile-accuracy-box" id="accuracyCard">
                    <div className="box-header-filters">
                        <h3 className="box-title">Historical Accuracy</h3>
                        <div className="filters-row">
                            <select value={accuracyModeFilter} onChange={(e: any) => setAccuracyModeFilter(e.target.value)}>
                                <option value="all">All Modes</option>
                                <option value="learn">Learn</option>
                                <option value="practice">Practice</option>
                            </select>
                            <select value={accuracyOpeningFilter} onChange={(e) => { setAccuracyOpeningFilter(e.target.value); setAccuracyLineFilter('all'); }}>
                                <option value="all">All openings</option>
                                {Object.keys(userProgress?.accuracy?.openings || {}).map(slug => (
                                    <option key={slug} value={slug}>{catalog[slug]?.displayName || slug}</option>
                                ))}
                            </select>
                            {accuracyOpeningFilter !== 'all' && (
                                <select value={accuracyLineFilter} onChange={(e) => setAccuracyLineFilter(e.target.value)}>
                                    <option value="all">All lines</option>
                                    {accuracyLinesList.map((lineKey, index) => (
                                        <option key={lineKey} value={lineKey}>Line {index + 1}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>
                    <div className="accuracy-chart-wrapper" style={{ minHeight: '180px', marginTop: 'var(--space-md)' }} id="accuracyChart">
                        {accuracyChartSvgHtml}
                    </div>
                    <div className="accuracy-summary-strip" id="accuracySummary" style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '12px' }}>
                        <span><b>{accuracyStatsSummary.correct}</b> correct</span>
                        <span><b>{accuracyStatsSummary.incorrect}</b> errors</span>
                        <span><b>{accuracyStatsSummary.pct}%</b> accuracy</span>
                    </div>
                </div>

                {/* ── Box 4: Heatmap calendar ── */}
                <div className="profile-box profile-heatmap-box">
                    <h3 className="box-title">Practice Activity</h3>
                    <div className="activity-heatmap-wrap" id="heatmap" style={{ position: 'relative' }}>
                        <div className="activity-layout">
                            <div className="activity-weekdays" aria-hidden="true">
                                <span></span>
                                <span>Mon</span>
                                <span></span>
                                <span>Wed</span>
                                <span></span>
                                <span>Fri</span>
                                <span></span>
                            </div>
                            <div className="activity-scroll">
                                <div className="activity-month-row" style={{ gridTemplateColumns: `repeat(${heatmapWeeks}, 1fr)` }}>
                                    {heatmapMonthLabels.map((lbl, i) => (
                                        <span key={i} style={{ gridColumn: lbl.col }}>{lbl.label}</span>
                                    ))}
                                </div>
                                <div className="activity-grid" style={{ gridTemplateColumns: `repeat(${heatmapWeeks}, 1fr)`, aspectRatio: `${heatmapWeeks} / 7` }}>
                                    {heatmapCells.map((cell, i) => (
                                        <div 
                                            key={i} 
                                            className={`activity-cell level-${cell.intensity}`}
                                            style={{ gridArea: `${cell.row} / ${cell.col}` }}
                                            onMouseEnter={(e) => handleCellHover(e, cell.tooltip)}
                                            onMouseLeave={() => setActiveTooltip(null)}
                                            aria-label={cell.tooltip}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Box 5: Favorites & courses ── */}
                <div className="profile-box profile-openings-list-box">
                    <h3 className="box-title">My Openings Repertoire</h3>
                    <div className="openings-table-wrap">
                        {favoriteCourses.length === 0 ? (
                            <p style={{ color: 'var(--color-muted)', padding: 'var(--space-md)' }}>No openings practiced yet. Go to catalog to pick one!</p>
                        ) : (
                            <table className="openings-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--color-rule)' }}>
                                        <th style={{ padding: '8px 4px' }}>Opening</th>
                                        <th style={{ padding: '8px 4px' }}>Side</th>
                                        <th style={{ padding: '8px 4px' }}>Learned</th>
                                        <th style={{ padding: '8px 4px' }}>High Drill</th>
                                        <th style={{ padding: '8px 4px' }}>High Time</th>
                                        <th style={{ padding: '8px 4px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {favoriteCourses.map((c) => (
                                        <tr key={c.slug} style={{ borderBottom: '1px solid var(--color-rule)' }}>
                                            <td style={{ padding: '12px 4px' }}><strong>{c.displayName}</strong></td>
                                            <td style={{ padding: '12px 4px' }}>
                                                <span className={`badge badge-${c.playerSide === 'w' ? 'white' : 'black'}`}>
                                                    {c.playerSide === 'w' ? 'White' : 'Black'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 4px' }}>{c.learned}/{c.lineCount}</td>
                                            <td style={{ padding: '12px 4px' }}>{c.highDrill}</td>
                                            <td style={{ padding: '12px 4px' }}>{formatDuration(c.highTime)}</td>
                                            <td style={{ padding: '12px 4px', textAlign: 'right' }}>
                                                <Link href={`/opening/${c.slug}`} className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: 'var(--text-xs)' }}>
                                                    Train
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

            </div>

            {/* Heatmap Tooltip */}
            {activeTooltip && (
                <div 
                    className="activity-tooltip is-visible"
                    style={{
                        position: 'fixed',
                        left: `${activeTooltip.x}px`,
                        top: `${activeTooltip.y}px`,
                        transform: 'translate(-50%, -100%)',
                        zIndex: 1000
                    }}
                >
                    {activeTooltip.text}
                </div>
            )}
        </div>
    );
}
