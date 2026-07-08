# Design System — "The Beam"

The visual language of Lighthouse Classes. Everything here is implemented as tokens in
`src/app/globals.css` + `tailwind.config.ts`, so design and code never drift.

## 1. Brand idea

A lighthouse: **steady, bright, guiding**. The UI expresses this as deep navy "night sea"
surfaces, ocean-blue action color, and a warm gold reserved for moments of light — CTAs,
achievements, streaks, the beam itself. Motion is slow, sweeping, and purposeful (beams, waves,
floats), never busy. Generated SVG "cover art" (gradient + concentric beam arcs + subject icon)
replaces stock photography, keeping every surface on-brand, fast, and impossible to break.

## 2. Color — "Warm Ivory" theme

Inspired by the clean, premium warmth of literary learning platforms (Rekhta Learning): ivory
paper, espresso ink, deep crimson accents, and gold reserved for light. Token *names* (`navy`,
`ocean`) are kept for component stability; their *values* implement this palette.

### Core palette

| Token | Hex | Role |
|---|---|---|
| `navy-900` (Ink) | `#211C17` | Espresso — text, dark surfaces, primary buttons |
| `navy-950` | `#161210` | Footer/night sections, immersive player bg |
| `ocean-600` (Primary accent) | `#B3383C` | Deep crimson — CTAs, links, active states, progress |
| `gold-400` (Highlight) | `#F4B400` | Achievements, streaks, the beam. Use sparingly — it must stay special |
| Background light | `#FAF6EE` | Warm ivory app background |
| Card light | `#FFFFFF` | Surfaces (white on ivory = crisp separation) |
| Success | emerald 500 | Completion, valid, discounts |
| Error | rose 500 | Errors, live-now, destructive |

Full 50–950 ramps live in `tailwind.config.ts`.

### Dark mode

Class-based (`.dark` on `<html>`), bootstrapped pre-paint to avoid flash, persisted in
`localStorage`, defaulting to system preference. Dark surfaces are **warm charcoal, not gray** —
`#161210` bg / `#211C17` card — with cream ink and gold taking over crimson's accent duties.

### Chart palette (validated)

Data visualization uses a **CVD-validated** categorical palette (six-checks validator, passes
light `#ffffff` and dark `#211c17` surfaces):

1. `#B3383C` (crimson) — also the only hue for single-series charts
2. `#C67C02` (chart gold — brand gold `#F4B400` fails the lightness band on light surfaces)
3. `#38649D` (slate — carries direct labels/legend as contrast relief on dark)

Rules: fixed assignment order, never cycled; identity never color-alone (legend + direct
labels); text in ink tokens, never series colors; sr-only data tables accompany charts.

## 3. Typography

| Role | Face | Usage |
|---|---|---|
| Display | **Fraunces** (variable, optical sizing) | h1–h4, stat numbers, quotes. Warm, scholarly serif — the "institution" voice |
| Text/UI | **Plus Jakarta Sans** | Body, buttons, labels, tables. Geometric, friendly, excellent at small sizes |

Scale (mobile-first): body 14–16px · `section-title` 30 → 44px fluid · hero 36 → 60px.
Eyebrows: 11px bold, uppercase, 0.18em tracking, gold. Numerics in tables/timers use
`tabular-nums`. Headlines use `text-wrap: balance`.

## 4. Space, radius, elevation

- **Spacing**: Tailwind 4px grid. Sections `py-16 sm:py-24`; cards `p-5/p-6`; the layout
  container is `max-w-7xl` with `px-4/6/8` gutters.
- **Radius**: pill buttons/chips (`rounded-full`), cards `rounded-3xl` (24px), hero/CTA panels
  `rounded-4xl` (32px), inputs `rounded-2xl`. Nothing sharp — the brand is a smooth beam.
- **Shadows**: `shadow-soft` (resting cards) → `shadow-lifted` (hover/overlays) →
  `shadow-glow`/`shadow-glow-ocean` (gold/ocean emphasis). Navy-tinted, never pure black.
- **Glass**: `glass` utility (70% surface + `backdrop-blur-xl`) for the header, mobile tab bar,
  and floating hero cards.

## 5. Motion

| Token | Use |
|---|---|
| `animate-fade-up` (0.7s, custom ease `cubic-bezier(.22,1,.36,1)`) | Entrances, staggered by 60–90ms |
| `.reveal` + IntersectionObserver | Scroll-triggered section reveals |
| `animate-beam` (7s sweep) | The lighthouse beam |
| `animate-float` (6s) | Floating proof cards, phone mock |
| `animate-pulse-ring` | Live/play affordances |
| `animate-shimmer` | Skeleton loading |
| Micro-interactions | Buttons `active:scale-[0.97]`; cards lift `-translate-y-1`; icons scale/rotate on group-hover |

**Accessibility contract**: `prefers-reduced-motion` collapses all animation to ~0ms globally.

## 6. Core components (`src/components/ui`)

`btn-primary / btn-gold / btn-ocean / btn-ghost` × `btn-sm/md/lg` · `card` + `card-hover` ·
`input-lh` + `label-lh` · `chip` · `eyebrow` · `skeleton` · `Accordion` (animated grid-rows) ·
`Avatar` (deterministic gradient initials) · `Rating` · `ProgressBar` / `ProgressRing` ·
`Counter` (in-view count-up) · `Reveal` · `CourseCover` (generated art) · `Logo` /
`LighthouseMark` (inline SVG mark: gold lantern, striped tower, ocean waves).

## 7. Layout & navigation patterns

- **Mobile-first**: horizontal snap-scroll card rails on mobile become grids at `lg`; the
  desktop header nav collapses to a slide-in sheet; a **floating glass bottom tab bar**
  (Home / Explore / Live / Learning / Profile) gives the app feel — with `safe-area-inset`
  padding for notched phones.
- **Dashboard/Admin**: sticky sidebar at `lg`, content column `min-w-0`; admin gets a bottom
  tab strip on mobile.
- **Immersive surfaces** (player, live room, quiz): own chrome, navy-950 canvas, no footer.

## 8. Voice

Warm, direct, a little literary — "The light is on. Come learn." Sentence case everywhere
except eyebrows. Numbers localized (`en-IN`: 2.4L, ₹2,499). Empty states always offer the next
action ("Nothing in this beam of light → Clear filters").
