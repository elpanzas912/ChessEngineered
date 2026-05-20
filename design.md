# Design — ChessPeps

A locked design system for this app. Every page redesign reads this file before
emitting code. Do not regenerate per page — extend or amend this file when the
system needs to grow.

## Genre
modern-minimal (austere tone)

## Macrostructure family
- Marketing pages: Catalogue (card grid, minimal hero)
- App pages: Workbench (functional layout, side panels, board centre)

## Theme
- `--color-paper`   oklch(14% 0.008 250)
- `--color-paper-2` oklch(18% 0.010 250)
- `--color-paper-3` oklch(22% 0.012 250)
- `--color-ink`     oklch(94% 0.006 250)
- `--color-ink-2`   oklch(78% 0.008 250)
- `--color-muted`   oklch(60% 0.008 250)
- `--color-rule`    oklch(28% 0.008 250)
- `--color-rule-light` oklch(34% 0.008 250)
- `--color-accent`  oklch(65% 0.18 250)
- `--color-accent-hover` oklch(58% 0.19 250)
- `--color-focus`   oklch(65% 0.18 250)
- `--color-success` oklch(65% 0.18 145)
- `--color-danger`  oklch(60% 0.18 25)
- `--color-warning` oklch(70% 0.15 80)

## Typography
- Display: Geist, weight 600, style normal
- Body: Geist, weight 400
- Mono: JetBrains Mono, weight 400
- Display tracking: -0.02em
- Type scale anchor: `--text-display` = clamp(2.5rem, 5vw + 0.5rem, 4rem)

## Spacing
4-point named scale. Values in `tokens.css`. Pages must use named tokens.

## Motion
- Easings: cubic-bezier(0.16, 1, 0.3, 1) named `--ease-out`
- Reveal pattern: none (composed page)
- Reduced-motion fallback: opacity-only, ≤ 150 ms

## Microinteractions stance
- Silent success (no celebratory toasts)
- Hover delay 800 ms on tooltips; 0 ms on focus
- Buttons: immediate state change

## CTA voice
- Primary CTA: filled, pill-rounded, accent background, black text
- Secondary CTA: outline, pill-rounded, rule border, ink text

## Per-page allowances
- Marketing pages MAY use subtle card hover lift (transform only)
- App pages MUST NOT use enrichment — function carries the page
- No gradient text, no glassmorphism, no bouncy easings

## What pages MUST share
- The wordmark / logotype (Geist 600)
- The accent colour and its placement (≤ 5% per viewport)
- The display + body fonts (Geist)
- The CTA voice (pill shape, border-radius, padding rhythm)
- Section heading rhythm (no chapter numbers, no left-margin labels)

## What pages MAY differ on
- Macrostructure within the page-type family
- Hero presence (app pages have minimal header only)
- Card density in catalogue grid

## Exports

### tokens.css
See `tokens.css` at project root.

### Tailwind v4 `@theme`
```css
@theme {
  --color-paper:   oklch(14% 0.008 250);
  --color-paper-2: oklch(18% 0.010 250);
  --color-ink:     oklch(94% 0.006 250);
  --color-muted:   oklch(60% 0.008 250);
  --color-rule:    oklch(28% 0.008 250);
  --color-accent:  oklch(65% 0.18 250);
  --font-display:  "Geist", sans-serif;
  --font-body:     "Geist", sans-serif;
  --font-mono:     "JetBrains Mono", monospace;
  --spacing-md:    1rem;
  --text-md:       1.125rem;
  --ease-out:      cubic-bezier(0.16, 1, 0.3, 1);
}
```
