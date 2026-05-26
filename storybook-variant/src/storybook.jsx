/* global React, Pawny, SpeechBubble, Logo, LogoMark, Pill, ChessBoard, ChessGlyph */

// Opening data shared by both variants
const OPENINGS = [
  { slug: 'italian-game',     name: 'Italian Game',        side: 'white', lines: 24, done: 12, status: 'inprogress', desc: "Classical, principled, and full of traps. The original chess opening — still ferocious in 2024.", featured: true },
  { slug: 'alapin-sicilian',  name: 'Alapin Sicilian',     side: 'white', lines: 21, done: 21, status: 'mastered',   desc: 'A practical antidote to the Sicilian. Shut down Najdorf players before they uncork their prep.' },
  { slug: 'london-system',    name: 'London System',       side: 'white', lines: 18, done: 4,  status: 'inprogress', desc: 'Setup-based, easy to learn, hard to beat. The Volkswagen Golf of openings.' },
  { slug: 'caro-kann',        name: 'Caro-Kann',           side: 'black', lines: 19, done: 0,  status: 'free',       desc: 'Solid, structurally sound, and the favorite of Karpov, Petrosian and a million club players.' },
  { slug: 'kings-indian',     name: "King's Indian Def.",  side: 'black', lines: 22, done: 0,  status: 'locked',     desc: 'Let White grab the center. Then punch them in the face with f5-g4-h4.' },
  { slug: 'najdorf-sicilian', name: 'Najdorf Sicilian',    side: 'black', lines: 31, done: 0,  status: 'locked',     desc: 'The sharpest weapon in chess. Fischer\'s favorite. Will get you to 2000.' },
  { slug: 'queens-gambit',    name: "Queen's Gambit",      side: 'white', lines: 26, done: 0,  status: 'locked',     desc: 'The opening of the Netflix era. Quiet positional pressure that wins games.' },
  { slug: 'bishops-opening',  name: "Bishop's Opening",    side: 'white', lines: 19, done: 0,  status: 'locked',     desc: "Trappy from move 2. Your opponent will not see the Urusov Gambit coming." },
  { slug: 'french-defense',   name: 'French Defense',      side: 'black', lines: 23, done: 0,  status: 'locked',     desc: "Solid structures and beautiful pawn breaks. The connoisseur's choice." },
];

// Helper for the training move list
const ITALIAN_LINE = [
  { n: 1, w: 'e4',   b: 'e5',   c: 'White stakes a flag in the center.' },
  { n: 2, w: 'Nf3',  b: 'Nc6',  c: 'Both sides develop and attack/defend the e-pawn.' },
  { n: 3, w: 'Bc4',  b: 'Bc5',  c: 'The Giuoco Piano — Italian for "quiet game". It is not actually quiet.' },
  { n: 4, w: 'c3',   b: 'Nf6',  c: 'White prepares d4, Black piles pressure on e4.' },
  { n: 5, w: 'd4',   b: 'exd4', c: 'The central break — the real opening starts now.' },
  { n: 6, w: 'cxd4', b: 'Bb4+', c: 'The Möller attack territory. Sharpest path forward.' },
  { n: 7, w: 'Nc3',  b: 'Nxe4', c: '' },
  { n: 8, w: '0-0',  b: 'Bxc3', c: '' },
];

// ─────────────────────────────────────────────────────────
//  STORYBOOK – REPERTOIRE (DESKTOP)
// ─────────────────────────────────────────────────────────
function StorybookRepertoire() {
  const tab = 'all';
  return (
    <div style={{
      width: 1440, background: '#FBF7F0', color: '#2A1B4A',
      fontFamily: '"Plus Jakarta Sans", sans-serif', minHeight: 1280,
    }}>
      <StorybookNav active="openings" />

      {/* Hero */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'radial-gradient(circle at 80% 30%, #EAD8FF 0%, #FBF7F0 60%)',
        borderBottom: '2px solid #2A1B4A',
        padding: '64px 64px 48px',
      }}>
        {/* decorative pieces */}
        <ChessGlyph piece="♜" size={120} color="#3D2E5C" opacity={0.07} style={{ position: 'absolute', left: 40, top: 40 }} />
        <ChessGlyph piece="♞" size={160} color="#3D2E5C" opacity={0.06} style={{ position: 'absolute', right: 380, bottom: -20 }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ maxWidth: 720 }}>
            <div style={{ font: '700 12px/1 "JetBrains Mono", monospace', letterSpacing: '.2em', color: '#8B6FE8', marginBottom: 14 }}>YOUR REPERTOIRE</div>
            <h1 style={{ font: '700 84px/.92 "Fraunces", serif', margin: 0, letterSpacing: '-0.035em' }}>
              Master your <em style={{ color: '#8B6FE8', fontStyle: 'italic' }}>opening</em>,<br />one line at a time.
            </h1>
            <p style={{ font: '500 19px/1.5 "Plus Jakarta Sans"', color: '#5B4A7A', marginTop: 22, maxWidth: 520 }}>
              Interactive, move-by-move training. Pawny coaches you through every variation until it feels like your own.
            </p>
          </div>
          <div style={{ position: 'relative', paddingBottom: 0 }}>
            <Pawny size={280} />
            <SpeechBubble variant="storybook" tone="tip" tail="right" style={{ position: 'absolute', right: 220, top: 24, maxWidth: 240 }}>
              <strong>Welcome back!</strong> You're 3 lines from finishing the Italian. Shall we?
            </SpeechBubble>
          </div>
        </div>

        {/* progress strip */}
        <div style={{ marginTop: 36, padding: 20, background: '#FFFDF7', borderRadius: 20, border: '2px solid #2A1B4A', boxShadow: '0 4px 0 #E5D7BD', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <Stat n="12 / 24" label="Lines today" />
          <Stat n="14" label="Day streak" hue="#E8A87C" emoji="🔥" />
          <Stat n="2" label="Openings mastered" hue="#4FAE3F" />
          <Stat n="+1,240" label="XP this week" hue="#8B6FE8" />
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ padding: '36px 64px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <FilterChip active>All · 28</FilterChip>
          <FilterChip><Dot c="#F4E9D2" /> White · 14</FilterChip>
          <FilterChip><Dot c="#2A1B4A" /> Black · 14</FilterChip>
          <div style={{ width: 1, height: 26, background: '#C4B7A5', margin: '0 6px' }} />
          <FilterChip><span style={{ color: '#E8A87C' }}>★</span> In progress</FilterChip>
          <FilterChip>Mastered</FilterChip>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <SearchBox placeholder="Search 647 lines…" />
          <span style={{ font: '600 13px/1 "Plus Jakarta Sans"', color: '#7A6995' }}>Sort: <strong style={{ color: '#3D2E5C' }}>Recommended ↓</strong></span>
        </div>
      </div>

      {/* Featured */}
      <div style={{ padding: '0 64px' }}>
        <FeaturedCard opening={OPENINGS[0]} />
      </div>

      {/* Section header */}
      <div style={{ padding: '36px 64px 16px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h2 style={{ font: '800 30px/1 "Fraunces", serif', margin: 0, letterSpacing: '-0.02em' }}>
          The whole repertoire <span style={{ color: '#8B6FE8' }}>·</span> 28 openings
        </h2>
        <span style={{ font: '600 13px/1 "Plus Jakarta Sans"', color: '#7A6995' }}>Showing all</span>
      </div>

      {/* Grid */}
      <div style={{ padding: '0 64px 64px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
        {OPENINGS.slice(1).map(o => <OpeningCard key={o.slug} opening={o} />)}
      </div>

      <StorybookFooter />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  STORYBOOK – TRAINING (DESKTOP)
// ─────────────────────────────────────────────────────────
function StorybookTraining() {
  return (
    <div style={{
      width: 1440, background: '#FBF7F0', color: '#2A1B4A',
      fontFamily: '"Plus Jakarta Sans", sans-serif',
    }}>
      <StorybookNav active="training" />

      <div style={{ padding: '32px 64px 64px' }}>
        {/* breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: '600 13px/1 "Plus Jakarta Sans"', color: '#7A6995', marginBottom: 18 }}>
          <span>Repertoire</span><span>›</span><span>White</span><span>›</span><strong style={{ color: '#3D2E5C' }}>Italian Game</strong>
        </div>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <Pill bg="#F4E9D2" color="#5C3F18" border="#5C3F18">⚪ White</Pill>
              <Pill bg="#F5F0FF" color="#5B49B8" border="#8B6FE8">Open game · classical</Pill>
              <Pill bg="#FFE3CB" color="#5C3F18" border="#E8A87C">★ Trending</Pill>
            </div>
            <h1 style={{ font: '700 64px/.95 "Fraunces", serif', margin: 0, letterSpacing: '-0.03em' }}>
              The <em style={{ color: '#8B6FE8', fontStyle: 'italic' }}>Italian</em> Game
            </h1>
            <p style={{ font: '500 17px/1.5 "Plus Jakarta Sans"', color: '#5B4A7A', marginTop: 12, maxWidth: 560 }}>
              The oldest opening still played at the top level. Develop, attack the f7 square, prepare a center push.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <CozyBtn variant="secondary">▶ Watch overview · 4 min</CozyBtn>
            <CozyBtn>Continue practice →</CozyBtn>
          </div>
        </div>

        {/* Main: 3 columns — sidebar | board | pawny coach */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 320px', gap: 24, alignItems: 'flex-start' }}>

          {/* LEFT — line list */}
          <div style={{ background: '#FFFDF7', border: '2px solid #2A1B4A', borderRadius: 20, padding: 20, boxShadow: '0 4px 0 #E5D7BD' }}>
            <div style={{ font: '700 12px/1 "JetBrains Mono"', color: '#8B6FE8', letterSpacing: '.16em', marginBottom: 14 }}>LINES · 24</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                { n: 'Main line · Giuoco Piano', s: 'done' },
                { n: 'Evans Gambit', s: 'done' },
                { n: 'Two Knights Defense', s: 'active' },
                { n: 'Hungarian Defense', s: 'todo' },
                { n: 'Giuoco Pianissimo', s: 'todo' },
                { n: 'Möller Attack', s: 'todo' },
                { n: 'Fried Liver Attack', s: 'todo' },
                { n: 'Modern Italian (h3)', s: 'todo' },
                { n: 'Italian with d3', s: 'locked' },
              ].map((l, i) => <LineRow key={i} {...l} idx={i+1} />)}
            </div>
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px dashed #C4B7A5' }}>
              <div style={{ font: '700 12px/1 "Plus Jakarta Sans"', color: '#7A6995', marginBottom: 8 }}>Mastery</div>
              <Progress2 value={50} />
              <div style={{ font: '600 12px/1 "Plus Jakarta Sans"', color: '#5B4A7A', marginTop: 6 }}>12 of 24 lines perfected</div>
            </div>
          </div>

          {/* CENTER — board + move flow */}
          <div>
            <div style={{ background: '#FFFDF7', border: '2px solid #2A1B4A', borderRadius: 24, padding: 28, boxShadow: '0 4px 0 #E5D7BD' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 36, height: 36, borderRadius: 8, background: '#2A1B4A', color: '#FFFDF7', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: '900 14px/1 "Plus Jakarta Sans"' }}>B</span>
                  <div>
                    <div style={{ font: '700 14px/1 "Plus Jakarta Sans"' }}>Black to move</div>
                    <div style={{ font: '500 12px/1.2 "Plus Jakarta Sans"', color: '#7A6995', marginTop: 2 }}>Two Knights Defense · move 3</div>
                  </div>
                </div>
                <div style={{ font: '700 13px/1 "JetBrains Mono"', color: '#7A6995' }}>3/12</div>
              </div>

              <BoardItalian />

              {/* Move tape */}
              <div style={{ marginTop: 18, padding: 14, background: '#F5F0FF', borderRadius: 14, border: '1.5px solid #D4C4F4' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, font: '600 14px/1.6 "JetBrains Mono"' }}>
                  <MoveTag>1. e4 e5</MoveTag>
                  <MoveTag>2. Nf3 Nc6</MoveTag>
                  <MoveTag active>3. Bc4 …</MoveTag>
                  <MoveTag faded>?</MoveTag>
                </div>
              </div>

              {/* Action row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <IconBtn>⟲</IconBtn>
                  <IconBtn>‹</IconBtn>
                  <IconBtn>›</IconBtn>
                  <IconBtn>↻</IconBtn>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <CozyBtn variant="ghost">💡 Hint</CozyBtn>
                  <CozyBtn variant="secondary">Skip line</CozyBtn>
                  <CozyBtn>Show answer</CozyBtn>
                </div>
              </div>
            </div>

            {/* Move-by-move journal */}
            <div style={{ marginTop: 24, background: '#FFFDF7', border: '2px solid #2A1B4A', borderRadius: 20, padding: 24, boxShadow: '0 4px 0 #E5D7BD' }}>
              <h3 style={{ font: '800 20px/1 "Fraunces", serif', margin: '0 0 16px', letterSpacing: '-0.01em' }}>The line, narrated.</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ITALIAN_LINE.slice(0, 5).map(m => <JournalRow key={m.n} {...m} />)}
              </div>
            </div>
          </div>

          {/* RIGHT — Pawny coach + stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ background: '#FFFDF7', border: '2px solid #2A1B4A', borderRadius: 20, padding: 20, boxShadow: '0 4px 0 #E5D7BD', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <Pawny size={84} />
                <div style={{ flex: 1, paddingTop: 6 }}>
                  <div style={{ font: '900 14px/1 "Fraunces", serif' }}>Pawny says…</div>
                  <SpeechBubble variant="storybook" tone="tip" style={{ marginTop: 10, maxWidth: 'none' }}>
                    Bishop to <strong>c4</strong> eyes f7 — the weakest square in Black's camp. What follows is theory.
                  </SpeechBubble>
                </div>
              </div>
              <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <MiniStat label="Time" value="1:24" />
                <MiniStat label="Accuracy" value="92%" />
              </div>
            </div>

            <div style={{ background: '#2A1B4A', color: '#FFFDF7', borderRadius: 20, padding: 24, boxShadow: '0 4px 0 #1a1130', border: '2px solid #2A1B4A' }}>
              <div style={{ font: '700 11px/1 "JetBrains Mono"', letterSpacing: '.18em', color: '#E8A87C', marginBottom: 12 }}>NEXT UP</div>
              <h4 style={{ font: '800 22px/1.1 "Fraunces", serif', margin: 0, letterSpacing: '-0.01em' }}>Two Knights Defense — Fried Liver trap</h4>
              <p style={{ font: '500 13px/1.45 "Plus Jakarta Sans"', color: '#C4B5E8', marginTop: 8 }}>Sharp. Tactical. Win in 8 moves if Black blinks.</p>
              <button style={{ marginTop: 14, width: '100%', padding: '12px 16px', background: '#E8A87C', color: '#2A1B4A', border: 'none', borderRadius: 12, font: '800 14px/1 "Plus Jakarta Sans"', cursor: 'pointer', boxShadow: '0 3px 0 #b3805a' }}>
                Queue this line →
              </button>
            </div>

            <div style={{ background: '#FFF1DC', border: '2px solid #5C3F18', borderRadius: 20, padding: 18, boxShadow: '0 4px 0 #E8A87C' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 28 }}>🔥</span>
                <div>
                  <div style={{ font: '900 18px/1 "Fraunces", serif' }}>Day 14 streak</div>
                  <div style={{ font: '500 12px/1.2 "Plus Jakarta Sans"', color: '#5C3F18', marginTop: 4 }}>One more line keeps it alive.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  STORYBOOK – MOBILE FRAMES
// ─────────────────────────────────────────────────────────
function StorybookMobile() {
  return (
    <div style={{
      width: 880, padding: '48px 40px', boxSizing: 'border-box', background: '#ECE7DD',
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40,
      fontFamily: '"Plus Jakarta Sans", sans-serif',
    }}>
      {/* Phone 1 — Repertoire */}
      <PhoneFrame label="Repertoire">
        <div style={{ background: '#FBF7F0', color: '#2A1B4A', minHeight: '100%' }}>
          <MobileNav />
          {/* Mini hero */}
          <div style={{ padding: '20px 18px 14px', background: 'radial-gradient(circle at 80% 20%, #EAD8FF 0%, #FBF7F0 70%)', position: 'relative', borderBottom: '1.5px solid #2A1B4A' }}>
            <div style={{ font: '600 10px/1 "JetBrains Mono"', letterSpacing: '.2em', color: '#8B6FE8' }}>YOUR REPERTOIRE</div>
            <h1 style={{ font: '700 32px/1 "Fraunces", serif', margin: '6px 0 0', letterSpacing: '-0.02em' }}>
              Master your<br /><em style={{ color: '#8B6FE8', fontStyle: 'italic' }}>opening</em>.
            </h1>
            <Pawny size={66} style={{ position: 'absolute', right: 14, top: 14 }} />
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <MiniPill bg="#FFF1DC" border="#E8A87C">🔥 14d</MiniPill>
              <MiniPill bg="#F5F0FF" border="#8B6FE8">12/24 today</MiniPill>
              <MiniPill bg="#EAF8E6" border="#4FAE3F">+120 XP</MiniPill>
            </div>
          </div>

          {/* Filters */}
          <div style={{ padding: '14px 18px 8px', display: 'flex', gap: 8, overflow: 'hidden' }}>
            <FilterChip active small>All</FilterChip>
            <FilterChip small><Dot c="#F4E9D2" /> White</FilterChip>
            <FilterChip small><Dot c="#2A1B4A" /> Black</FilterChip>
            <FilterChip small>★ Pro</FilterChip>
          </div>

          {/* Featured small */}
          <div style={{ padding: '6px 18px 14px' }}>
            <div style={{ background: 'linear-gradient(135deg, #8B6FE8, #6B49D6)', borderRadius: 18, padding: 18, color: '#FFFDF7', border: '2px solid #2A1B4A', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 0 #2A1B4A' }}>
              <div style={{ font: '700 10px/1 "JetBrains Mono"', letterSpacing: '.18em', color: '#E8A87C' }}>CONTINUE</div>
              <div style={{ font: '800 26px/1 "Fraunces", serif', marginTop: 8, letterSpacing: '-0.02em' }}>Italian Game</div>
              <div style={{ font: '500 12px/1.3 "Plus Jakarta Sans"', marginTop: 6, color: '#E0D6FF', maxWidth: 220 }}>12/24 lines — you're 3 away from the medal.</div>
              <div style={{ marginTop: 12, height: 8, background: 'rgba(255,255,255,.2)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: '50%', height: '100%', background: '#E8A87C' }} />
              </div>
              <ChessGlyph piece="♗" size={120} color="#FFFFFF" opacity={0.12} style={{ position: 'absolute', right: -10, top: -20 }} />
            </div>
          </div>

          {/* List */}
          <div style={{ padding: '0 18px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {OPENINGS.slice(1, 5).map(o => <MobileCard key={o.slug} opening={o} />)}
          </div>
        </div>
      </PhoneFrame>

      {/* Phone 2 — Training */}
      <PhoneFrame label="Training">
        <div style={{ background: '#FBF7F0', minHeight: '100%', color: '#2A1B4A' }}>
          {/* training nav: back + close */}
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1.5px solid #2A1B4A' }}>
            <button style={{ width: 36, height: 36, border: '2px solid #2A1B4A', borderRadius: 10, background: '#FFFDF7', font: '700 16px/1 "Plus Jakarta Sans"', cursor: 'pointer' }}>‹</button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ font: '600 10px/1 "JetBrains Mono"', color: '#8B6FE8', letterSpacing: '.2em' }}>LINE 3 / 12</div>
              <div style={{ font: '800 14px/1 "Fraunces", serif', marginTop: 4 }}>Italian · Two Knights</div>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FFF1DC', border: '2px solid #E8A87C', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 12px/1 "Plus Jakarta Sans"', color: '#5C3F18' }}>🔥14</div>
          </div>

          {/* Progress dots */}
          <div style={{ padding: '10px 18px', display: 'flex', gap: 4 }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 5, borderRadius: 999, background: i < 3 ? '#8B6FE8' : i === 3 ? '#E8A87C' : '#E5D7BD' }} />
            ))}
          </div>

          {/* Pawny hint */}
          <div style={{ padding: '14px 18px 0', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <Pawny size={48} />
            <SpeechBubble variant="storybook" tone="tip" style={{ flex: 1, padding: '10px 12px', fontSize: 13 }}>
              <strong>Bc4.</strong> Eye that f7 square.
            </SpeechBubble>
          </div>

          {/* Board */}
          <div style={{ padding: '16px 18px' }}>
            <BoardItalian size={320} />
          </div>

          {/* Move tape */}
          <div style={{ padding: '0 18px' }}>
            <div style={{ background: '#F5F0FF', borderRadius: 12, border: '1.5px solid #D4C4F4', padding: 10, display: 'flex', flexWrap: 'wrap', gap: 4, font: '600 12px/1.5 "JetBrains Mono"' }}>
              <MoveTag small>1. e4 e5</MoveTag>
              <MoveTag small>2. Nf3 Nc6</MoveTag>
              <MoveTag small active>3. Bc4 …</MoveTag>
            </div>
          </div>

          {/* CTA */}
          <div style={{ padding: '14px 18px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button style={{ padding: '14px', borderRadius: 14, border: '2px solid #2A1B4A', background: '#8B6FE8', color: '#FFFDF7', font: '800 15px/1 "Plus Jakarta Sans"', boxShadow: '0 4px 0 #2A1B4A', cursor: 'pointer' }}>Show me the move →</button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ flex: 1, padding: '12px', borderRadius: 12, border: '2px solid #2A1B4A', background: '#FFFDF7', font: '700 13px/1 "Plus Jakarta Sans"', boxShadow: '0 3px 0 #2A1B4A', cursor: 'pointer', color: '#2A1B4A' }}>💡 Hint</button>
              <button style={{ flex: 1, padding: '12px', borderRadius: 12, border: '2px solid #2A1B4A', background: '#FFFDF7', font: '700 13px/1 "Plus Jakarta Sans"', boxShadow: '0 3px 0 #2A1B4A', cursor: 'pointer', color: '#2A1B4A' }}>Skip line</button>
            </div>
          </div>
        </div>
      </PhoneFrame>
    </div>
  );
}

// ─── Storybook sub-components ───────────────────────────

function StorybookNav({ active }) {
  return (
    <nav style={{
      padding: '18px 64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderBottom: '2px solid #2A1B4A', background: '#FBF7F0', position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
        <Logo variant="storybook" size="md" />
        <div style={{ display: 'flex', gap: 6 }}>
          {['Openings','Puzzles','Endgames','Profile'].map(item => (
            <a key={item} style={{
              padding: '8px 14px', borderRadius: 10,
              font: `${item === (active === 'openings' ? 'Openings' : (active === 'training' ? 'Openings' : '')) ? '800' : '600'} 14px/1 "Plus Jakarta Sans"`,
              color: '#3D2E5C', textDecoration: 'none',
              background: (item === 'Openings' && (active === 'openings' || active === 'training')) ? '#F5F0FF' : 'transparent',
              border: (item === 'Openings' && (active === 'openings' || active === 'training')) ? '1.5px solid #D4C4F4' : '1.5px solid transparent',
            }}>{item}</a>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#FFF1DC', border: '2px solid #E8A87C', borderRadius: 999, font: '800 13px/1 "Plus Jakarta Sans"', color: '#5C3F18' }}>🔥 14</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#F5F0FF', border: '2px solid #8B6FE8', borderRadius: 999, font: '800 13px/1 "Plus Jakarta Sans"', color: '#5B49B8' }}>★ Pro</span>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#8B6FE8', border: '2px solid #2A1B4A', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '800 13px/1 "Plus Jakarta Sans"', color: '#FFFDF7' }}>JM</div>
      </div>
    </nav>
  );
}

function StorybookFooter() {
  return (
    <footer style={{ padding: '32px 64px', background: '#2A1B4A', color: '#C4B5E8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <LogoMark size={32} variant="storybook" />
        <span style={{ font: '500 13px/1 "Plus Jakarta Sans"' }}>chessengineered.com · made with caffeine & blunders</span>
      </div>
      <div style={{ display: 'flex', gap: 22, font: '500 13px/1 "Plus Jakarta Sans"' }}>
        <span>Repertoire</span><span>Puzzles</span><span>Pricing</span><span>About Pawny</span>
      </div>
    </footer>
  );
}

function Stat({ n, label, hue = '#8B6FE8', emoji }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px dashed #C4B7A5', padding: '0 14px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ font: '900 30px/1 "Fraunces", serif', letterSpacing: '-0.02em', color: hue }}>{n}</span>
        {emoji && <span style={{ fontSize: 22 }}>{emoji}</span>}
      </div>
      <div style={{ font: '600 12px/1 "Plus Jakarta Sans"', color: '#7A6995', marginTop: 6, textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>
    </div>
  );
}

function FilterChip({ children, active, small }) {
  const padding = small ? '6px 12px' : '10px 16px';
  const fs = small ? 12 : 14;
  return (
    <button style={{
      padding, borderRadius: 999, border: '2px solid #2A1B4A',
      background: active ? '#2A1B4A' : '#FFFDF7',
      color: active ? '#FBF7F0' : '#3D2E5C',
      font: `700 ${fs}px/1 "Plus Jakarta Sans"`,
      display: 'inline-flex', alignItems: 'center', gap: 6,
      cursor: 'pointer', boxShadow: active ? 'none' : '0 2px 0 #2A1B4A',
    }}>{children}</button>
  );
}

function Dot({ c }) {
  return <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block', border: '1px solid #2A1B4A' }} />;
}

function SearchBox({ placeholder }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#FFFDF7', border: '2px solid #2A1B4A', borderRadius: 12, font: '500 13px/1 "Plus Jakarta Sans"', color: '#7A6995', minWidth: 260, boxShadow: '0 2px 0 #2A1B4A' }}>
      <span>⌕</span><span>{placeholder}</span>
    </div>
  );
}

function FeaturedCard({ opening }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0,
      borderRadius: 24, overflow: 'hidden',
      border: '2px solid #2A1B4A', boxShadow: '0 6px 0 #2A1B4A',
      background: '#FFFDF7',
    }}>
      <div style={{ background: 'linear-gradient(135deg, #8B6FE8 0%, #6B49D6 100%)', padding: 36, color: '#FFFDF7', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ font: '700 11px/1 "JetBrains Mono"', letterSpacing: '.2em', color: '#FFE3CB' }}>CONTINUE WHERE YOU LEFT OFF</div>
          <h2 style={{ font: '800 56px/1 "Fraunces", serif', margin: '12px 0 0', letterSpacing: '-0.03em' }}>The <em style={{ fontStyle: 'italic', color: '#FFE3CB' }}>Italian</em> Game</h2>
          <p style={{ font: '500 15px/1.5 "Plus Jakarta Sans"', color: '#E0D6FF', marginTop: 12, maxWidth: 320 }}>{opening.desc}</p>
        </div>
        <div style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,.2)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${(opening.done/opening.lines)*100}%`, height: '100%', background: '#E8A87C' }} />
            </div>
            <span style={{ font: '700 13px/1 "JetBrains Mono"', color: '#FFE3CB' }}>{opening.done}/{opening.lines}</span>
          </div>
          <button style={{ marginTop: 18, padding: '14px 22px', background: '#E8A87C', color: '#2A1B4A', border: '2px solid #2A1B4A', borderRadius: 14, font: '800 15px/1 "Plus Jakarta Sans"', cursor: 'pointer', boxShadow: '0 3px 0 #2A1B4A' }}>
            Resume training →
          </button>
        </div>
        <ChessGlyph piece="♗" size={300} color="#FFFFFF" opacity={0.1} style={{ position: 'absolute', right: -40, top: 40 }} />
      </div>
      <div style={{ padding: 36, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <Pawny size={88} />
          <SpeechBubble variant="storybook" tone="tip" style={{ marginTop: 8, flex: 1 }}>
            <strong>You're getting there.</strong> 12 lines down, 12 to go. The Möller Attack is up next — sharpest line we've got.
          </SpeechBubble>
        </div>
        <div style={{ marginTop: 24 }}>
          <div style={{ font: '700 11px/1 "JetBrains Mono"', color: '#8B6FE8', letterSpacing: '.2em', marginBottom: 12 }}>WHAT'S INSIDE</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {['Giuoco Piano','Evans Gambit','Two Knights','Möller Attack','Fried Liver','Modern Italian'].map(l => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, font: '600 13px/1 "Plus Jakarta Sans"', color: '#3D2E5C' }}>
                <span style={{ color: '#8B6FE8' }}>♟</span> {l}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OpeningCard({ opening }) {
  const o = opening;
  const locked = o.status === 'locked';
  const mastered = o.status === 'mastered';
  return (
    <div style={{
      background: '#FFFDF7', border: '2px solid #2A1B4A', borderRadius: 20,
      overflow: 'hidden', boxShadow: '0 4px 0 #2A1B4A',
      position: 'relative',
      opacity: locked ? 0.92 : 1,
    }}>
      {/* Thumb */}
      <div style={{ aspectRatio: '16/9', background: o.side === 'white' ? 'linear-gradient(135deg, #F4E9D2, #E5D7BD)' : 'linear-gradient(135deg, #2A1B4A, #1a1130)', position: 'relative', borderBottom: '2px solid #2A1B4A', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <MiniBoardThumb side={o.side} />
        {locked && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,253,247,.55)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FFFDF7', border: '2px solid #2A1B4A', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 0 #2A1B4A' }}>🔒</div>
          </div>
        )}
        {mastered && (
          <div style={{ position: 'absolute', top: 12, right: 12, padding: '4px 10px', background: '#4FAE3F', color: '#FFFDF7', border: '2px solid #2A1B4A', borderRadius: 999, font: '800 11px/1 "Plus Jakarta Sans"', boxShadow: '0 2px 0 #2A1B4A' }}>✓ Mastered</div>
        )}
      </div>

      <div style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <h3 style={{ font: '800 20px/1.05 "Fraunces", serif', margin: 0, letterSpacing: '-0.01em' }}>{o.name}</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            {o.side === 'white' ? <Pill bg="#F4E9D2" color="#5C3F18" border="#5C3F18">White</Pill> : <Pill bg="#2A1B4A" color="#FFFDF7" border="#2A1B4A">Black</Pill>}
            {o.status === 'free' && <Pill bg="#EAF8E6" color="#2F5A1F" border="#2F5A1F">Free</Pill>}
          </div>
        </div>
        <p style={{ font: '500 13px/1.45 "Plus Jakarta Sans"', color: '#5B4A7A', margin: '8px 0 14px', minHeight: 50 }}>{o.desc}</p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ font: '700 12px/1 "JetBrains Mono"', color: '#7A6995' }}>{o.done}/{o.lines} lines</span>
          {o.status === 'mastered' ? <span style={{ font: '700 12px/1 "Plus Jakarta Sans"', color: '#4FAE3F' }}>100%</span> :
           o.status === 'inprogress' ? <span style={{ font: '700 12px/1 "Plus Jakarta Sans"', color: '#8B6FE8' }}>{Math.round(o.done/o.lines*100)}%</span> :
           <span style={{ font: '700 12px/1 "Plus Jakarta Sans"', color: '#7A6995' }}>—</span>}
        </div>

        <div style={{ height: 8, background: '#EFE6D6', borderRadius: 999, overflow: 'hidden', border: '1.5px solid #2A1B4A' }}>
          <div style={{ width: `${(o.done/o.lines)*100}%`, height: '100%', background: mastered ? '#4FAE3F' : '#8B6FE8' }} />
        </div>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ font: '700 13px/1 "Plus Jakarta Sans"', color: locked ? '#7A6995' : '#8B6FE8' }}>
            {locked ? 'Upgrade to unlock' : o.status === 'free' ? 'Start free →' : o.status === 'mastered' ? 'Review →' : 'Continue →'}
          </span>
        </div>
      </div>
    </div>
  );
}

function MiniBoardThumb({ side }) {
  // a stylized 4x4 mini board with a couple of glyphs
  const sq = side === 'white' ? 'storybook' : 'storybook';
  return (
    <div style={{ width: 200, height: 130, display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gridTemplateRows: 'repeat(5, 1fr)', borderRadius: 8, overflow: 'hidden', border: '2px solid #2A1B4A', boxShadow: '0 3px 0 #2A1B4A' }}>
      {Array.from({ length: 40 }).map((_, i) => {
        const r = Math.floor(i/8), f = i%8;
        const isLight = (r+f) % 2 === 0;
        const piece = { 11: '♚', 13: '♞', 21: '♟', 28: '♟', 33: '♕', 36: '♗' }[i];
        return (
          <div key={i} style={{ background: isLight ? '#F4E9D2' : '#B89671', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: piece && [13, 28, 33].includes(i) ? '#FFFDF7' : '#2A1B4A', textShadow: piece && [13, 28, 33].includes(i) ? '0 1px 0 rgba(0,0,0,.4)' : 'none' }}>
            {piece}
          </div>
        );
      })}
    </div>
  );
}

function CozyBtn({ children, variant = 'primary' }) {
  const styles = {
    primary:   { bg: '#8B6FE8', color: '#FFFDF7', border: '#2A1B4A' },
    secondary: { bg: '#FFFDF7', color: '#3D2E5C', border: '#2A1B4A' },
    ghost:     { bg: 'transparent', color: '#8B6FE8', border: 'transparent', shadow: false },
  }[variant];
  return (
    <button style={{
      background: styles.bg, color: styles.color,
      border: `2px solid ${styles.border}`,
      boxShadow: styles.shadow === false ? 'none' : `0 3px 0 ${styles.border}`,
      borderRadius: 12, padding: '12px 18px',
      font: '800 14px/1 "Plus Jakarta Sans"', cursor: 'pointer',
    }}>{children}</button>
  );
}

function LineRow({ n, s, idx }) {
  const statusColors = {
    done:   { bg: '#EAF8E6', dot: '#4FAE3F', text: '#2F5A1F' },
    active: { bg: '#F5F0FF', dot: '#8B6FE8', text: '#5B49B8' },
    todo:   { bg: 'transparent', dot: '#C4B7A5', text: '#5B4A7A' },
    locked: { bg: 'transparent', dot: '#E5D7BD', text: '#9C8F7A' },
  }[s];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 10px', borderRadius: 10,
      background: statusColors.bg,
      border: s === 'active' ? '1.5px solid #8B6FE8' : '1.5px solid transparent',
    }}>
      <span style={{ width: 22, font: '700 11px/1 "JetBrains Mono"', color: '#7A6995' }}>{String(idx).padStart(2, '0')}</span>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: statusColors.dot, flexShrink: 0 }} />
      <span style={{ flex: 1, font: '600 13px/1.3 "Plus Jakarta Sans"', color: statusColors.text }}>{n}</span>
      {s === 'done' && <span style={{ font: '700 11px/1 "Plus Jakarta Sans"', color: '#4FAE3F' }}>✓</span>}
      {s === 'locked' && <span style={{ fontSize: 12, opacity: 0.5 }}>🔒</span>}
    </div>
  );
}

function Progress2({ value }) {
  return (
    <div style={{ height: 10, background: '#EFE6D6', borderRadius: 999, overflow: 'hidden', border: '1.5px solid #2A1B4A' }}>
      <div style={{ width: `${value}%`, height: '100%', background: '#8B6FE8' }} />
    </div>
  );
}

function MoveTag({ children, active, faded, small }) {
  const padding = small ? '4px 8px' : '6px 10px';
  return (
    <span style={{
      padding, borderRadius: 8,
      background: active ? '#8B6FE8' : faded ? 'transparent' : 'rgba(255,253,247,.7)',
      color: active ? '#FFFDF7' : faded ? '#C4B7A5' : '#3D2E5C',
      border: active ? '1.5px solid #2A1B4A' : faded ? '1.5px dashed #C4B7A5' : '1.5px solid transparent',
    }}>{children}</span>
  );
}

function IconBtn({ children }) {
  return (
    <button style={{
      width: 40, height: 40, borderRadius: 10,
      border: '2px solid #2A1B4A', background: '#FFFDF7',
      font: '700 16px/1 "Plus Jakarta Sans"', color: '#3D2E5C',
      cursor: 'pointer', boxShadow: '0 2px 0 #2A1B4A',
    }}>{children}</button>
  );
}

function MiniStat({ label, value }) {
  return (
    <div style={{ background: '#F5F0FF', borderRadius: 12, padding: '8px 12px', border: '1.5px solid #D4C4F4' }}>
      <div style={{ font: '600 10px/1 "JetBrains Mono"', color: '#8B6FE8', letterSpacing: '.12em' }}>{label.toUpperCase()}</div>
      <div style={{ font: '900 18px/1 "Fraunces", serif', marginTop: 4 }}>{value}</div>
    </div>
  );
}

function JournalRow({ n, w, b, c }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '36px 80px 1fr', gap: 12, alignItems: 'center', padding: '10px 12px', background: '#F5F0FF', borderRadius: 10, border: '1px solid #E0D6FF' }}>
      <span style={{ font: '700 13px/1 "JetBrains Mono"', color: '#7A6995' }}>{n}.</span>
      <span style={{ font: '700 14px/1 "JetBrains Mono"', color: '#3D2E5C' }}>{w} {b}</span>
      <span style={{ font: '500 13px/1.4 "Plus Jakarta Sans"', color: '#5B4A7A' }}>{c}</span>
    </div>
  );
}

// shared "Italian" board for the central display
function BoardItalian({ size = 480 }) {
  const board = window.italianPosition();
  return (
    <window.ChessBoard
      size={size}
      position={board}
      variant="storybook"
      highlights={{ lastMove: { from: 'f1', to: 'c4' } }}
      arrow={{ from: 'c4', to: 'f7', color: '#E8A87C' }}
    />
  );
}

// Mobile components
function PhoneFrame({ label, children }) {
  return (
    <div>
      <div style={{ font: '700 11px/1 "JetBrains Mono", monospace', color: '#7A6995', letterSpacing: '.2em', marginBottom: 12 }}>{label.toUpperCase()} · STORYBOOK</div>
      <div style={{
        width: 380, height: 760,
        background: '#1F1633', borderRadius: 48, padding: 10,
        boxShadow: '0 18px 60px rgba(0,0,0,.18)',
      }}>
        <div style={{
          width: '100%', height: '100%', borderRadius: 38, overflow: 'hidden', position: 'relative',
          background: '#FBF7F0',
        }}>
          {/* status bar */}
          <div style={{ height: 32, background: 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 22px', font: '700 12px/1 "Plus Jakarta Sans"', color: '#2A1B4A', zIndex: 5 }}>
            <span>9:41</span>
            <span style={{ width: 80, height: 24, background: '#1F1633', borderRadius: 999 }} />
            <span>●●●●</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function MobileNav() {
  return (
    <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1.5px solid #2A1B4A' }}>
      <Logo variant="storybook" size="sm" />
      <div style={{ display: 'flex', gap: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#FFF1DC', border: '1.5px solid #E8A87C', borderRadius: 999, font: '800 11px/1 "Plus Jakarta Sans"', color: '#5C3F18' }}>🔥 14</span>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#8B6FE8', border: '1.5px solid #2A1B4A', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '800 11px/1 "Plus Jakarta Sans"', color: '#FFFDF7' }}>JM</div>
      </div>
    </div>
  );
}

function MiniPill({ children, bg, border }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 10px', background: bg, border: `1.5px solid ${border}`, borderRadius: 999, font: '700 11px/1 "Plus Jakarta Sans"', color: '#3D2E5C' }}>{children}</span>
  );
}

function MobileCard({ opening }) {
  const o = opening;
  const locked = o.status === 'locked';
  return (
    <div style={{ background: '#FFFDF7', border: '2px solid #2A1B4A', borderRadius: 16, padding: 14, boxShadow: '0 3px 0 #2A1B4A', display: 'flex', gap: 12, opacity: locked ? 0.85 : 1 }}>
      <div style={{ width: 64, height: 64, borderRadius: 10, background: o.side === 'white' ? '#F4E9D2' : '#2A1B4A', border: '2px solid #2A1B4A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 30, color: o.side === 'white' ? '#5C3F18' : '#FFFDF7' }}>
        {o.side === 'white' ? '♗' : '♛'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <h4 style={{ font: '800 15px/1 "Fraunces", serif', margin: 0, letterSpacing: '-0.01em', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.name}</h4>
          {locked && <span style={{ fontSize: 12 }}>🔒</span>}
        </div>
        <div style={{ font: '500 11px/1.3 "Plus Jakarta Sans"', color: '#7A6995', marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{o.desc}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 6, background: '#EFE6D6', borderRadius: 999, overflow: 'hidden', border: '1px solid #C4B7A5' }}>
            <div style={{ width: `${(o.done/o.lines)*100}%`, height: '100%', background: '#8B6FE8' }} />
          </div>
          <span style={{ font: '700 11px/1 "JetBrains Mono"', color: '#7A6995' }}>{o.done}/{o.lines}</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { StorybookRepertoire, StorybookTraining, StorybookMobile, OPENINGS });
