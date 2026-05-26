/* global React */
const { useState, useEffect, useMemo, useRef } = React;

// ─────────────────────────────────────────────────────────
// Pawny — the mascot. Variants control mood/expression via CSS hue/filters
// since we only have a single illustration.
// ─────────────────────────────────────────────────────────
function Pawny({ size = 120, mood = 'default', flip = false, style = {} }) {
  const filters = {
    default: 'none',
    happy:   'hue-rotate(-8deg) saturate(1.15) brightness(1.04)',
    think:  'hue-rotate(20deg) saturate(.85) brightness(.96)',
    cheer:  'hue-rotate(-25deg) saturate(1.3) brightness(1.1)',
    sad:    'hue-rotate(180deg) saturate(.45) brightness(.95)',
    dim:    'grayscale(.65) opacity(.7)',
  };
  return (
    <img
      src="assets/pawny-cropped.png"
      alt="Pawny"
      draggable={false}
      style={{
        width: size, height: 'auto', display: 'block', userSelect: 'none',
        transform: flip ? 'scaleX(-1)' : undefined,
        filter: filters[mood] ?? 'none',
        ...style,
      }}
    />
  );
}

// Speech bubble — variant determines the look
function SpeechBubble({ children, tail = 'left', variant = 'storybook', tone = 'tip', style = {} }) {
  if (variant === 'storybook') {
    const toneStyles = {
      tip:   { bg: '#FFFDF7', border: '#3D2E5C', accent: '#8B6FE8' },
      good:  { bg: '#EAF8E6', border: '#2F5A1F', accent: '#4FAE3F' },
      hint:  { bg: '#FFF1DC', border: '#5C3F18', accent: '#E8A87C' },
    }[tone];
    return (
      <div style={{
        position: 'relative',
        background: toneStyles.bg,
        border: `2px solid ${toneStyles.border}`,
        borderRadius: 22,
        padding: '14px 18px',
        boxShadow: `0 4px 0 ${toneStyles.border}`,
        font: '500 15px/1.45 "Plus Jakarta Sans", sans-serif',
        color: '#1F1633',
        maxWidth: 320,
        ...style,
      }}>
        <div style={{ position: 'absolute', bottom: -10, [tail === 'left' ? 'left' : 'right']: 32, width: 18, height: 18, background: toneStyles.bg, border: `2px solid ${toneStyles.border}`, borderTop: 0, borderLeft: 0, transform: 'rotate(45deg)' }} />
        {children}
      </div>
    );
  }
  // quest variant — thicker, blockier
  const toneStyles = {
    tip:   { bg: '#FFFFFF', border: '#1F1633', accent: '#7C5BF2' },
    good:  { bg: '#D7FBD0', border: '#1F4012', accent: '#4FAE3F' },
    hint:  { bg: '#FFE9C7', border: '#3D2410', accent: '#E89A4C' },
  }[tone];
  return (
    <div style={{
      position: 'relative',
      background: toneStyles.bg,
      border: `3px solid ${toneStyles.border}`,
      borderRadius: 18,
      padding: '14px 18px',
      boxShadow: `0 6px 0 ${toneStyles.border}`,
      font: '700 15px/1.4 "Nunito", sans-serif',
      color: '#1F1633',
      maxWidth: 320,
      ...style,
    }}>
      <div style={{ position: 'absolute', bottom: -12, [tail === 'left' ? 'left' : 'right']: 28, width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderTop: `14px solid ${toneStyles.border}` }} />
      <div style={{ position: 'absolute', bottom: -8, [tail === 'left' ? 'left' : 'right']: 31, width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderTop: `11px solid ${toneStyles.bg}` }} />
      {children}
    </div>
  );
}

// Unicode chess pieces wrapped in a styled span (used in hero, board, etc)
function ChessGlyph({ piece = '♞', size = 60, color = '#3D2E5C', opacity = 1, style = {} }) {
  return (
    <span style={{
      font: `${size}px/1 "DM Sans", sans-serif`,
      color, opacity, lineHeight: 1, display: 'inline-block',
      ...style,
    }}>{piece}</span>
  );
}

// Logo wordmark — Pawny silhouette + text
function Logo({ variant = 'storybook', size = 'md' }) {
  const sizes = { sm: { px: 22, m: 26 }, md: { px: 28, m: 34 }, lg: { px: 40, m: 48 } };
  const s = sizes[size];
  const font = variant === 'storybook'
    ? `800 ${s.px}px/1 "Fraunces", serif`
    : `900 ${s.px}px/1 "Nunito", sans-serif`;
  const ls = variant === 'storybook' ? '-0.02em' : '-0.025em';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <LogoMark size={s.m} variant={variant} />
      <span style={{ font, color: variant === 'storybook' ? '#2A1B4A' : '#1F1633', letterSpacing: ls }}>
        chessengineered<span style={{ color: variant === 'storybook' ? '#8B6FE8' : '#7C5BF2' }}>.</span>
      </span>
    </div>
  );
}

// Logo mark — abstracted Pawny head/crown
function LogoMark({ size = 32, variant = 'storybook' }) {
  const primary = variant === 'storybook' ? '#8B6FE8' : '#7C5BF2';
  const dark = variant === 'storybook' ? '#3D2E5C' : '#1F1633';
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* crown */}
      <path d="M11 9 L14 4 L17 8 L20 3 L23 8 L26 4 L29 9 L29 13 L11 13 Z" fill={primary} stroke={dark} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="20" cy="9" r="1.5" fill={dark} />
      {/* head */}
      <ellipse cx="20" cy="22" rx="11" ry="10" fill={primary} stroke={dark} strokeWidth="2.2" />
      {/* glasses */}
      <circle cx="16" cy="22" r="3" fill="#FFFDF7" stroke={dark} strokeWidth="1.8" />
      <circle cx="24" cy="22" r="3" fill="#FFFDF7" stroke={dark} strokeWidth="1.8" />
      <circle cx="16" cy="22" r="1.2" fill={dark} />
      <circle cx="24" cy="22" r="1.2" fill={dark} />
      <path d="M19 22 L21 22" stroke={dark} strokeWidth="1.8" strokeLinecap="round" />
      {/* base ring */}
      <rect x="9" y="32" width="22" height="5" rx="2.5" fill={primary} stroke={dark} strokeWidth="2" />
    </svg>
  );
}

// Generic UI atoms
function Pill({ children, bg = '#EFE6D6', color = '#3D2E5C', border = null, style = {} }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 999,
      background: bg, color,
      border: border ? `1.5px solid ${border}` : 'none',
      font: '700 11px/1 "Plus Jakarta Sans", sans-serif',
      letterSpacing: '.04em', textTransform: 'uppercase',
      ...style,
    }}>{children}</span>
  );
}

Object.assign(window, { Pawny, SpeechBubble, ChessGlyph, Logo, LogoMark, Pill });
