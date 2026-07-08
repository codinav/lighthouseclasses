# 🗼 Lighthouse Classes

**Guiding Every Learner Towards Excellence.**

A production-ready, mobile-first learning platform built with Next.js 14, TypeScript, and
Tailwind CSS — courses, live classes, an advanced video player, quizzes, gamification, payments,
and a full admin panel, wrapped in a bespoke lighthouse-inspired design language.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run typecheck  # strict TypeScript check
```

**Demo credentials** — authentication is fully simulated client-side:

| To see… | Sign in with |
|---|---|
| Student experience | any valid email + any 6+ char password |
| Admin panel (`/admin`) | an email starting with `admin` (e.g. `admin@lh.com`) |
| OTP verification | any 6-digit code **ending in an even digit** |
| Coupons at checkout | `LIGHT20` (20% off) · `WELCOME10` (10% off) |
| Certificate verification | `LH-2026-8F3K2A` or `LH-2026-4B9X7C` |

## What's inside

| Surface | Route(s) | Highlights |
|---|---|---|
| Homepage | `/` | Animated lighthouse hero with rotating beam, live search with suggestions, categories, featured courses, teachers, testimonials carousel, animated stats, live-class countdowns, app section, FAQ |
| Course catalog | `/courses` | Instant search, category/level/language/price filters, 5 sort orders, loading skeletons, empty states |
| Course detail | `/courses/[slug]` | Trailer, curriculum with free previews, outcomes, instructor, reviews, FAQs, sticky enroll card, wishlist + native share |
| Auth | `/auth/login`, `/auth/register`, `/auth/verify`, `/auth/forgot-password` | Social login (Google/Apple), password strength meter, 6-digit OTP with paste support & resend timer, session cookie + route-protecting middleware |
| Student dashboard | `/dashboard/*` | Streak, XP/levels, daily goal ring, weekly activity chart, continue learning, assignments, certificates (with previews), achievements, wishlist & bookmarks, downloads, notifications, full settings with payment history |
| Video player | `/learn/[slug]` | Resume watching, speed & quality menus, subtitles, Picture-in-Picture, fullscreen, keyboard shortcuts, timestamped notes & bookmarks, clickable transcript, lesson completion tracking, next-lesson autoplay countdown |
| Quizzes | `/quiz/q1`, `/quiz/q2` | Timed MCQs, instant evaluation with explanations, XP scoring, results ring, leaderboard |
| Live classes | `/live`, `/live/[id]` | Schedule with real countdowns, classroom with chat, raise-hand, mic/cam controls, attendance |
| Checkout | `/checkout` | UPI/Card/Netbanking/EMI, coupons, GST breakdown, Razorpay-shaped flow, success invoice |
| Admin panel | `/admin/*` | Revenue chart, plan-share donut, category bars (palette CVD-validated), students/courses/payments tables, coupon management, role-gated |
| Community | `/community` | Forums, study groups, announcements |
| Content & legal | `/about`, `/blog`, `/careers`, `/contact`, `/faq`, `/support`, `/pricing`, `/privacy`, `/terms`, `/refund`, `/certificates/verify`, custom 404 | Complete |

Plus: **dark mode** (system-aware + toggle, no flash), **PWA manifest** with shortcuts,
**SEO** (per-page metadata, OpenGraph, `sitemap.xml`, `robots.txt`), **accessibility**
(landmarks, focus rings, `prefers-reduced-motion`, aria labels, skip link, sr-only data tables),
and an app-style **floating bottom navigation** on mobile.

## Project structure

```
src/
├── app/
│   ├── (site)/          # Public pages with header/footer chrome
│   ├── auth/            # Split-screen auth shell (login/register/OTP/forgot)
│   ├── dashboard/       # Student dashboard (guarded, sidebar layout)
│   ├── learn/[slug]/    # Immersive video learning room
│   ├── live/[id]/       # Live classroom
│   ├── quiz/[id]/       # Quiz runner
│   ├── checkout/        # Payment flow
│   ├── admin/           # Admin panel (role-gated)
│   ├── api/             # REST route handlers (demo contracts)
│   ├── layout.tsx       # Fonts, providers, theme bootstrap
│   ├── sitemap.ts / robots.ts / icon.svg
│   └── globals.css      # Design tokens + component classes
├── components/          # ui/, layout/, home/, course/, player/, quiz/, live/, dashboard/, admin/, auth/, misc/
├── lib/                 # types, data (mock content), progress, admin-data, providers (theme+auth), utils
└── middleware.ts        # Session-cookie route protection
```

## Documentation

| Doc | Contents |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, production auth (JWT + refresh rotation), RBAC, video pipeline, payments, live classes, caching, deployment |
| [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Full PostgreSQL schema (Prisma), 25+ models, indexes, ER overview |
| [docs/API.md](docs/API.md) | REST API contract — every endpoint, request/response shapes, errors, webhooks |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Brand, color (incl. chart-safe palette), typography, spacing, radii, shadows, motion, components |
| [docs/IA_AND_FLOWS.md](docs/IA_AND_FLOWS.md) | Information architecture, complete sitemap, user flows for students/instructors/admins, wireframe rationale |

## What's demo vs. production-ready

The **frontend is production-grade**: strict TypeScript, componentized, statically prerendered,
lean bundles (≈87–118 kB first load), accessible, responsive.

The **backend is intentionally simulated** so the whole product is explorable without
infrastructure: auth persists to `localStorage` + a session cookie, content is a typed in-repo
dataset, and payment/OTP flows are mocked with realistic latency. Every simulated seam has a
documented production contract — see `docs/ARCHITECTURE.md` and `docs/API.md` for exactly what
to swap in (NextAuth/JWT, Prisma/Postgres, Razorpay, Mux/HLS, WebSockets).

---

© 2026 Lighthouse Classes. Built as a complete product blueprint — design system, IA, frontend,
and backend architecture in one repository.
