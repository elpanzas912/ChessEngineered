import { getLearnedLines } from './progress.js?v=7';
import { stats } from './stats.js';

export { stats };

export function renderLinesList(trainer) {
    const container = document.getElementById('linesList');
    if (!container) return;
    if (!trainer || !trainer.opening) {
        container.innerHTML = '<div class="empty">Select an opening</div>';
        return;
    }
    const lines = trainer.opening.lines || [];
    const names = trainer.opening.lineNames || {};
    let html = '';
    lines.forEach((pgn, idx) => {
        const name = names[pgn] || `Line ${idx + 1}`;
        const isActive = trainer.linePgn === pgn;
        const safePgn = pgn.replace(/"/g, '&quot;');
        html += `<button class="line-btn ${isActive ? 'active' : ''}" data-pgn="${safePgn}">`;
        html += `<span class="name">${esc(name)}</span>`;
        html += `<span class="pgn">${esc(pgn.substring(0, 55))}${pgn.length > 55 ? '...' : ''}</span>`;
        html += `</button>`;
    });
    container.innerHTML = html;
    container.querySelectorAll('.line-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pgn = e.currentTarget.dataset.pgn;
            if (pgn && trainer) {
                trainer.loadLine(pgn);
                if (typeof trainer.saveSessionState === 'function') trainer.saveSessionState();
            }
        });
    });
}

export function renderLineDropdown(trainer) {
    const list = document.getElementById('dropdownList');
    if (!list || !trainer || !trainer.opening) return;

    const lines = trainer.opening.lines || [];
    const names = trainer.opening.lineNames || {};
    const learned = getLearnedLines(trainer.slug);

    let lastLearnedIdx = -1;
    lines.forEach((pgn, idx) => {
        if (learned.includes(pgn)) lastLearnedIdx = idx;
    });

    const unlockedIdx = lastLearnedIdx + 1;
    list.innerHTML = '';

    lines.forEach((pgn, idx) => {
        const name = names[pgn] || `Line ${idx + 1}`;
        const isActive = trainer.linePgn === pgn;
        const isLearned = learned.includes(pgn);
        const isUnlocked = idx <= unlockedIdx;
        const isLocked = !isUnlocked;
        const num = idx + 1;

        const item = document.createElement('div');
        item.className = `dropdown-item ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}`;

        const icon = isLocked ? '🔒' : (isLearned ? '✓' : '🎯');
        const checkmark = isActive ? '<span class="line-check">✓</span>' : '';
        const lockLabel = isLocked ? '<span class="line-locked-label">Locked</span>' : '';

        item.innerHTML = `
            <span class="line-num">#${num}</span>
            <span class="line-icon">${icon}</span>
            <span class="line-label">${esc(name)}</span>
            ${lockLabel}
            ${checkmark}
        `;

        item.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isLocked) return;
            if (trainer) {
                trainer.loadLine(pgn);
                if (typeof trainer.saveSessionState === 'function') trainer.saveSessionState();
                closeLineDropdown();
            }
        });
        list.appendChild(item);
    });
}

function closeLineDropdown() {
    const dd = document.getElementById('lineDropdown');
    const chevron = document.getElementById('dropdownChevron');
    if (dd) dd.classList.remove('open');
    if (chevron) chevron.style.transform = '';
}

export function renderMoveHistory(moves) {
    const container = document.getElementById('moveHistory');
    if (!container) return;
    if (!moves.length) {
        container.innerHTML = '<span style="color:var(--text-dim)">No moves yet</span>';
        return;
    }
    let html = '';
    let num = 1;
    for (let i = 0; i < moves.length; i += 2) {
        html += `<span class="move-entry">${num}. ${moves[i]}</span>`;
        if (moves[i + 1]) {
            html += `<span class="move-entry user">${moves[i + 1]}</span>`;
        }
        num++;
    }
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
}

export function updateLineHeader(name, openingName) {
    const openingNameEl = document.getElementById('openingName');
    const lineCounter = document.getElementById('lineCounter');
    const progressLineName = document.getElementById('progressLineName');

    if (openingNameEl) openingNameEl.textContent = openingName || '';

    let lineNum = 1;
    if (window.trainer && window.trainer.opening && window.trainer.linePgn) {
        const idx = window.trainer.opening.lines.indexOf(window.trainer.linePgn);
        if (idx >= 0) lineNum = idx + 1;
    }
    if (lineCounter) lineCounter.textContent = '#' + lineNum;

    if (progressLineName) progressLineName.textContent = name || '';
}

export function updateProgress(pct) {
    const bar = document.getElementById('lineProgressBar');
    const moveNum = document.getElementById('progressMoveNum');
    if (bar && window.trainer && window.trainer.moves.length > 0) {
        bar.style.width = pct + '%';
        if (moveNum) {
            const current = window.trainer.moveIndex;
            const total = window.trainer.moves.length;
            moveNum.textContent = `Move ${current}/${total}`;
        }
    }
}

export function updateStats() {
    const statLines = document.getElementById('statLines');
    const statMoves = document.getElementById('statMoves');
    const statAcc = document.getElementById('statAcc');
    const learnStats = document.getElementById('learnStats');
    const practiceStats = document.getElementById('practiceStats');
    const currentSlug = window.trainer?.slug;
    const currentLines = window.trainer?.opening?.lines || [];
    const learned = currentSlug ? getLearnedLines(currentSlug) : [];
    const lineProgress = currentSlug ? (window.userProgress[currentSlug]?.lines || {}) : {};
    const learnedInOpening = completedKnownLines(lineProgress, currentLines, learned);
    const practiceAvailableLines = learnedInOpening;
    const perfectedLines = practiceAvailableLines.filter(pgn => (Number(lineProgress[pgn]?.practicePerfectAttempts) || 0) > 0);

    if (statLines) statLines.textContent = stats.linesDone;
    if (statMoves) statMoves.textContent = stats.movesMade;
    const acc = stats.attempts > 0 ? Math.round((stats.correct / stats.attempts) * 100) + '%' : '-';
    if (statAcc) statAcc.textContent = acc;
    if (learnStats) learnStats.textContent = `${learnedInOpening.length}/${currentLines.length} lines discovered`;
    if (practiceStats) practiceStats.textContent = `${perfectedLines.length}/${practiceAvailableLines.length} lines perfected`;
}

export function updateModeStats() {
    if (!window.trainer || !window.trainer.opening) return;
    const lines = window.trainer.opening.lines || [];
    const learned = getLearnedLines(window.trainer.slug);
    const lineProgress = window.userProgress[window.trainer.slug]?.lines || {};
    const learnedInOpening = completedKnownLines(lineProgress, lines, learned);
    const practiceAvailableLines = learnedInOpening;
    const perfectedLines = practiceAvailableLines.filter(pgn => (Number(lineProgress[pgn]?.practicePerfectAttempts) || 0) > 0);

    const learnStats = document.getElementById('learnStats');
    const practiceStats = document.getElementById('practiceStats');

    if (learnStats) {
        learnStats.textContent = `${learnedInOpening.length}/${lines.length} lines discovered`;
    }
    if (practiceStats) {
        practiceStats.textContent = `${perfectedLines.length}/${practiceAvailableLines.length} lines perfected`;
    }

    const practiceBtn = document.getElementById('modePractice');
    if (practiceBtn) {
        if (learned.length > 0) {
            practiceBtn.classList.remove('locked');
            practiceBtn.disabled = false;
        } else {
            practiceBtn.classList.add('locked');
            practiceBtn.disabled = true;
        }
    }

    const drillBtn = document.getElementById('modeDrill');
    if (drillBtn) {
        if (learned.length >= 3) {
            const wasLocked = drillBtn.disabled;
            drillBtn.classList.remove('locked');
            drillBtn.disabled = false;
            if (wasLocked && !window.drillUnlocks?.includes(window.trainer.slug)) {
                if (!window.drillUnlocks) window.drillUnlocks = [];
                window.drillUnlocks.push(window.trainer.slug);
                localStorage.setItem('chessengineered_drill_unlocks', JSON.stringify(window.drillUnlocks));
                const overlay = document.getElementById('unlockOverlay');
                if (overlay) {
                    setTimeout(() => overlay.classList.add('open'), 600);
                    if (typeof confetti !== 'undefined') {
                        confetti({
                            particleCount: 150,
                            spread: 100,
                            origin: { y: 0.6 },
                            colors: ['#fbbf24', '#ef4444', '#f97316']
                        });
                    }
                }
            }
        } else {
            drillBtn.classList.add('locked');
            drillBtn.disabled = true;
        }
    }
    const timeBtn = document.getElementById('modeTime');
    if (timeBtn) {
        if (learned.length >= 3) {
            timeBtn.classList.remove('locked');
            timeBtn.disabled = false;
        } else {
            timeBtn.classList.add('locked');
            timeBtn.disabled = true;
        }
    }
    const puzzleBtn = document.getElementById('modePuzzles');
    if (puzzleBtn) {
        if (learned.length >= 2) {
            puzzleBtn.classList.remove('locked');
            puzzleBtn.disabled = false;
        } else {
            puzzleBtn.classList.add('locked');
            puzzleBtn.disabled = true;
        }
    }
}

export function showFeedback(msg, type) {
    const el = document.getElementById('feedback');
    if (!el) return;
    el.textContent = msg;
    el.className = 'feedback ' + type;
    setTimeout(() => {
        el.classList.add('hidden');
    }, 2000);
    setTimeout(() => {
        el.className = 'feedback hidden';
    }, 2400);
}

function esc(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function completedKnownLines(lineProgress, knownLines, learnedFallback = []) {
    const known = new Set(knownLines);
    const learned = [...new Set(learnedFallback || [])].filter(pgn => known.has(pgn));
    if (learned.length > 0) return learned;

    const completed = Object.entries(lineProgress || {})
        .filter(([pgn, line]) => known.has(pgn) && (Number(line?.completions) || 0) > 0)
        .map(([pgn]) => pgn);

    return [...new Set(completed)];
}
