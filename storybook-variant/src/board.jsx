/* global React */

// Mini chess board renderer. Uses unicode pieces.
// position: array of 64 entries (a8..h1, row-major), each '' or piece char.
// highlights: { from: 'e2', to: 'e4' } etc.
// Variant changes the board color palette.
function ChessBoard({
  position,
  highlights = {},
  size = 480,
  variant = 'storybook',
  showCoords = true,
  flipped = false,
  arrow = null, // { from, to, color }
}) {
  const palettes = {
    storybook: { light: '#F4E9D2', dark: '#B89671', border: '#3D2E5C', coords: '#7A5C2E' },
    quest:     { light: '#EDE0FA', dark: '#7C5BF2', border: '#1F1633', coords: '#FFFFFFAA' },
  };
  const p = palettes[variant];
  const files = ['a','b','c','d','e','f','g','h'];
  const ranks = [8,7,6,5,4,3,2,1];
  const sq = size / 8;

  // Default starting position if none
  const board = position || defaultPosition();

  const coordToIdx = (s) => {
    const f = files.indexOf(s[0]);
    const r = ranks.indexOf(parseInt(s[1]));
    return r * 8 + f;
  };
  const coordToXY = (s) => {
    const f = files.indexOf(s[0]);
    const r = ranks.indexOf(parseInt(s[1]));
    return { x: f * sq + sq/2, y: r * sq + sq/2 };
  };

  const highlightSquares = new Set([highlights.from, highlights.to].filter(Boolean).map(coordToIdx));
  const lastMove = highlights.lastMove ? [coordToIdx(highlights.lastMove.from), coordToIdx(highlights.lastMove.to)] : [];

  return (
    <div style={{
      width: size,
      borderRadius: variant === 'storybook' ? 18 : 14,
      overflow: 'hidden',
      border: `3px solid ${p.border}`,
      boxShadow: variant === 'storybook'
        ? '0 8px 0 rgba(61,46,92,.18), 0 24px 60px rgba(61,46,92,.18)'
        : '0 10px 0 #1F1633',
      background: p.dark,
      position: 'relative',
    }}>
      <div style={{ width: '100%', aspectRatio: '1', display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', position: 'relative' }}>
        {Array.from({ length: 64 }).map((_, i) => {
          const r = Math.floor(i / 8);
          const f = i % 8;
          const isLight = (r + f) % 2 === 0;
          const piece = board[i];
          const isHL = highlightSquares.has(i);
          const isLast = lastMove.includes(i);
          const file = files[flipped ? 7 - f : f];
          const rank = ranks[flipped ? 7 - r : r];
          return (
            <div key={i} style={{
              background: isLight ? p.light : p.dark,
              position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: sq * 0.72, lineHeight: 1,
              fontFamily: '"DM Sans", sans-serif',
              color: piece && piece === piece.toUpperCase() ? '#FFFDF7' : '#1F1633',
              textShadow: piece && piece === piece.toUpperCase()
                ? '0 1px 0 rgba(0,0,0,.35), 0 2px 8px rgba(0,0,0,.25)'
                : '0 1px 2px rgba(255,255,255,.4)',
            }}>
              {isLast && <div style={{ position: 'absolute', inset: 0, background: variant === 'storybook' ? 'rgba(232,168,124,.42)' : 'rgba(251,191,36,.55)' }} />}
              {isHL && (
                <div style={{ position: 'absolute', inset: 4, borderRadius: 8, boxShadow: `inset 0 0 0 3px ${variant === 'storybook' ? '#E8A87C' : '#FBBF24'}` }} />
              )}
              {showCoords && f === 0 && (
                <span style={{ position: 'absolute', left: 4, top: 2, font: '700 9px/1 "Plus Jakarta Sans"', color: isLight ? p.coords : '#FFFDF7AA' }}>{rank}</span>
              )}
              {showCoords && r === 7 && (
                <span style={{ position: 'absolute', right: 4, bottom: 2, font: '700 9px/1 "Plus Jakarta Sans"', color: isLight ? p.coords : '#FFFDF7AA' }}>{file}</span>
              )}
              <span style={{ position: 'relative', zIndex: 1 }}>{pieceGlyph(piece)}</span>
            </div>
          );
        })}
        {arrow && <BoardArrow from={arrow.from} to={arrow.to} color={arrow.color || (variant === 'storybook' ? '#E8A87C' : '#FBBF24')} sq={sq} />}
      </div>
    </div>
  );
}

function BoardArrow({ from, to, color, sq }) {
  const a = squareCenter(from, sq);
  const b = squareCenter(to, sq);
  // shorten end a bit so head doesn't sit on piece
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len;
  const headBack = sq * 0.32;
  const ex = b.x - ux * headBack;
  const ey = b.y - uy * headBack;
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} viewBox={`0 0 ${sq*8} ${sq*8}`}>
      <defs>
        <marker id={`ah-${from}-${to}`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 Z" fill={color} />
        </marker>
      </defs>
      <line x1={a.x} y1={a.y} x2={ex} y2={ey} stroke={color} strokeWidth={sq * 0.16} strokeLinecap="round" markerEnd={`url(#ah-${from}-${to})`} opacity={0.88} />
    </svg>
  );
}

function squareCenter(s, sq) {
  const files = ['a','b','c','d','e','f','g','h'];
  const f = files.indexOf(s[0]);
  const r = 8 - parseInt(s[1]);
  return { x: f * sq + sq/2, y: r * sq + sq/2 };
}

function pieceGlyph(p) {
  if (!p) return '';
  // Use solid unicode pieces; color via CSS
  const m = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟', k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  return m[p] || '';
}

function defaultPosition() {
  // a8..h8, a7..h7, ... a1..h1
  return [
    'r','n','b','q','k','b','n','r',
    'p','p','p','p','p','p','p','p',
    '','','','','','','','',
    '','','','','','','','',
    '','','','','','','','',
    '','','','','','','','',
    'P','P','P','P','P','P','P','P',
    'R','N','B','Q','K','B','N','R',
  ];
}

// Helper: parse a simple position description
function positionFromMoves(moves) {
  // For our purposes we just hand-craft positions; this is a stub
  return defaultPosition();
}

// Common Italian Game position after 1.e4 e5 2.Nf3 Nc6 3.Bc4
function italianPosition() {
  const b = ['','','','','','','','',
             '','','','','','','','',
             '','','','','','','','',
             '','','','','','','','',
             '','','','','','','','',
             '','','','','','','','',
             '','','','','','','','',
             '','','','','','','','',];
  // Black pieces
  ['r','n','b','q','k','b','n','r'].forEach((p, i) => b[i] = p);
  // black pawns row 7 except c-no-wait, just keep standard except e7 moved to e5 and c6 knight
  for (let i = 0; i < 8; i++) b[8 + i] = 'p';
  b[8 + 4] = ''; // e7 empty
  b[24 + 4] = 'p'; // e5
  b[16 + 2] = 'n'; // c6 knight
  b[1] = ''; // b8 empty (knight moved)
  // White
  for (let i = 0; i < 8; i++) b[48 + i] = 'P';
  b[48 + 4] = ''; // e2 empty
  b[32 + 4] = 'P'; // e4
  b[56] = 'R'; b[57] = 'N'; b[58] = 'B'; b[59] = 'Q'; b[60] = 'K'; b[61] = ''; b[62] = 'N'; b[63] = 'R';
  b[40 + 2] = 'B'; // Bc4 (row 3 from top is index 5 → 40, file c is 2)
  // Wait: row index for 4th rank (white side perspective) — rank 4 = row 4 from top → index 32. We placed e4 pawn at 32+4 ✓.
  // Bc4 means c4: rank 4, file c → row 32, file 2 → index 34
  // Fix: above I wrote 40+2 which is rank 3 file c. Correct to 32+2.
  b[40 + 2] = ''; // clear
  b[32 + 2] = 'B';
  // Nf3 means f3: rank 3 file f → row 40, file 5 → index 45
  b[40 + 5] = 'N';
  b[62] = ''; // remove Ng1
  return b;
}

Object.assign(window, { ChessBoard, defaultPosition, italianPosition, pieceGlyph });
