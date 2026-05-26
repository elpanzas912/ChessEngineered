// Leaderboards integration with Supabase
import { supabase } from '../supabaseClient.js';

async function fetchLeaderboard() {
    const tbody = document.getElementById('leaderboard-body');
    if (!tbody) return;

    try {
        // Fetch top players by puzzle ELO
        const { data, error } = await supabase
            .from('puzzle_ratings')
            .select(`
                puzzle_elo,
                profiles:user_id ( username, display_name )
            `)
            .order('puzzle_elo', { ascending: false })
            .limit(10);

        if (error) throw error;

        // Render the rows
        tbody.innerHTML = ''; // Clear loading state or mocks

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--color-muted);">No rankings available yet.</td></tr>';
            return;
        }

        data.forEach((entry, index) => {
            const rank = index + 1;
            const profile = entry.profiles || {};
            const name = profile.display_name || profile.username || 'Anonymous';
            const initial = name.charAt(0).toUpperCase();
            const elo = entry.puzzle_elo || 1500;
            
            // Add custom classes for top 3
            let rankClass = '';
            if (rank === 1) rankClass = 'rank-1';
            else if (rank === 2) rankClass = 'rank-2';
            else if (rank === 3) rankClass = 'rank-3';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="rank-cell ${rankClass}">#${rank}</td>
                <td>
                    <div class="player-cell">
                        <div class="player-avatar">${initial}</div>
                        <span>${name}</span>
                    </div>
                </td>
                <td>--</td> <!-- Streak not currently tracked directly in a single table, placeholder -->
                <td class="score-cell">${elo}</td>
            `;
            tbody.appendChild(row);
        });

    } catch (err) {
        console.error('Error fetching leaderboards:', err);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--color-danger);">Failed to load leaderboards. Please try again later.</td></tr>';
    }
}

document.addEventListener('DOMContentLoaded', fetchLeaderboard);
