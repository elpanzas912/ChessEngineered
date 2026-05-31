// Leaderboards integration with Supabase

async function fetchLeaderboard() {
    const tbody = document.getElementById('leaderboard-body');
    if (!tbody) return;

    try {
        // Fetch top players by puzzle ELO
        const supabase = window.supabaseClient;
        if (!supabase) throw new Error('Supabase client unavailable');
        const { data, error } = await supabase.rpc('get_puzzle_leaderboard', { p_limit: 10 });

        if (error) throw error;

        // Render the rows
        tbody.innerHTML = ''; // Clear loading state or mocks

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--color-muted);">No rankings available yet.</td></tr>';
            return;
        }

        data.forEach((entry, index) => {
            const rank = index + 1;
            const name = entry.display_name || 'Anonymous';
            const initial = name.charAt(0).toUpperCase();
            const elo = entry.puzzle_elo || 1500;
            
            // Add custom classes for top 3
            let rankClass = '';
            if (rank === 1) rankClass = 'rank-1';
            else if (rank === 2) rankClass = 'rank-2';
            else if (rank === 3) rankClass = 'rank-3';

            const row = document.createElement('tr');
            const rankCell = document.createElement('td');
            rankCell.className = `rank-cell ${rankClass}`;
            rankCell.textContent = `#${rank}`;
            const playerCell = document.createElement('td');
            const player = document.createElement('div');
            player.className = 'player-cell';
            const avatar = document.createElement('div');
            avatar.className = 'player-avatar';
            avatar.textContent = initial;
            const label = document.createElement('span');
            label.textContent = name;
            player.append(avatar, label);
            playerCell.appendChild(player);
            const streakCell = document.createElement('td');
            streakCell.textContent = '--';
            const eloCell = document.createElement('td');
            eloCell.className = 'score-cell';
            eloCell.textContent = String(elo);
            row.append(rankCell, playerCell, streakCell, eloCell);
            tbody.appendChild(row);
        });

    } catch (err) {
        console.error('Error fetching leaderboards:', err);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--color-danger);">Failed to load leaderboards. Please try again later.</td></tr>';
    }
}

document.addEventListener('DOMContentLoaded', fetchLeaderboard);
