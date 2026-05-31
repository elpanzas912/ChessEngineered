// src/app/leaderboards/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import '@/styles/leaderboards.css';

export default function LeaderboardsPage() {
    const [rankings, setRankings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const fetchRankings = async () => {
            setLoading(true);
            setErrorMsg('');
            try {
                const { data, error } = await supabase.rpc('get_puzzle_leaderboard', { p_limit: 10 });
                if (error) throw error;
                setRankings(data || []);
            } catch (err: any) {
                console.error('Leaderboard error:', err);
                setErrorMsg('Failed to load global rankings. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchRankings();
    }, []);

    return (
        <div style={{ minHeight: '80vh', padding: 'var(--space-xl) var(--space-md)' }}>
            <main className="leaderboards-section">
                <header className="leaderboards-header">
                    <h1 className="leaderboards-title">Global Rankings</h1>
                    <p className="leaderboards-lede">The top tacticians and opening specialists this week.</p>
                </header>
                
                <div className="table-wrapper">
                    <table className="leaderboard-table">
                        <thead>
                            <tr>
                                <th className="rank-cell">Rank</th>
                                <th>Player</th>
                                <th>Highest Streak</th>
                                <th className="score-cell">Puzzle ELO</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-muted)', padding: 'var(--space-md)' }}>
                                        Loading rankings...
                                    </td>
                                </tr>
                            ) : errorMsg ? (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', color: '#ef4444', padding: 'var(--space-md)' }}>
                                        {errorMsg}
                                    </td>
                                </tr>
                            ) : rankings.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-muted)', padding: 'var(--space-md)' }}>
                                        No rankings available yet.
                                    </td>
                                </tr>
                            ) : (
                                rankings.map((entry, index) => {
                                    const rank = index + 1;
                                    const name = entry.display_name || 'Anonymous';
                                    const initial = name.charAt(0).toUpperCase();
                                    const elo = entry.puzzle_elo || 1500;
                                    
                                    let rankClass = '';
                                    if (rank === 1) rankClass = 'rank-1';
                                    else if (rank === 2) rankClass = 'rank-2';
                                    else if (rank === 3) rankClass = 'rank-3';

                                    return (
                                        <tr key={index}>
                                            <td className={`rank-cell ${rankClass}`}>
                                                #{rank}
                                            </td>
                                            <td>
                                                <div className="player-cell">
                                                    <div className="player-avatar">{initial}</div>
                                                    <span>{name}</span>
                                                </div>
                                            </td>
                                            <td>--</td>
                                            <td className="score-cell">{elo}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
