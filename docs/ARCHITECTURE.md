# Architecture

How Lighthouse Classes is built today (demo mode) and how it goes to production. The frontend
you see is the production frontend; this document specifies the backend it plugs into.

## 1. System overview

```
┌────────────────────────────────────────────────────────────────────┐
│  Clients: Web (Next.js, PWA) · Android/iOS (same API)              │
└──────────────────────────┬─────────────────────────────────────────┘
                           │ HTTPS / WSS
┌──────────────────────────▼─────────────────────────────────────────┐
│  Edge: CDN (static assets, ISR pages) · Next.js middleware (authZ) │
├────────────────────────────────────────────────────────────────────┤
│  App tier: Next.js route handlers (/api/*)                        │
│   ├─ Auth service        (sessions, OTP, OAuth)                    │
│   ├─ Catalog service     (courses, search)                         │
│   ├─ Learning service    (progress, notes, quizzes, streaks)       │
│   ├─ Commerce service    (orders, subscriptions, coupons, GST)     │
│   ├─ Live service        (rooms, chat, attendance) ── WebSocket    │
│   └─ Notification service(email, push, in-app)                     │
├────────────────────────────────────────────────────────────────────┤
│  Data tier                                                         │
│   ├─ PostgreSQL (Prisma) — source of truth                         │
│   ├─ Redis — sessions, rate limits, leaderboards, live presence    │
│   ├─ Meilisearch — instant course search                           │
│   ├─ S3-compatible object store — video masters, PDFs, certificates│
│   └─ Mux/Cloudflare Stream — HLS transcoding + signed playback     │
├────────────────────────────────────────────────────────────────────┤
│  Third parties: Razorpay (payments+webhooks) · Resend (email)      │
│  · FCM/APNs (push) · 100ms/LiveKit (live video) · Sentry/PostHog   │
└────────────────────────────────────────────────────────────────────┘
```

**Why this shape:** a modular monolith on Next.js route handlers keeps one deployable unit
(cheap, simple ops) while the service boundaries above are enforced at the folder/module level,
so any hot service (live, commerce) can be extracted later without API changes.

## 2. Frontend architecture

- **Next.js 14 App Router**, strict TypeScript. Marketing/catalog pages are statically
  prerendered (SSG) and revalidated on publish (ISR) — this is why first-load JS stays ≈90 kB.
- **Route groups as products**: `(site)` marketing chrome, `auth` split-screen shell,
  `dashboard` sidebar app, `learn` immersive player, `admin` gated console. Each group owns its
  layout; nothing leaks across.
- **State**: server data flows down as props from server components; interactive islands are
  client components. Cross-cutting client state (theme, session) lives in one context provider.
  Learner-local state (notes, wishlist, resume positions) uses `localStorage` in the demo and
  swaps to API calls behind the same functions.
- **Design system**: tokens as CSS variables (`globals.css`) + Tailwind theme extension; every
  component consumes tokens so light/dark are first-class, not an afterthought.
- **Performance**: no client-side data fetching on public pages, `next/font` with `display:swap`,
  IntersectionObserver-driven reveal animations (GPU-only transforms), zero animation work for
  `prefers-reduced-motion`, code-split routes, SVG-generated artwork instead of hero images.
- **PWA**: installable manifest with shortcuts; add a service worker (Workbox) for offline shell
  + downloaded-lesson playback in production.

## 3. Authentication (production design)

Demo mode simulates auth client-side. Production contract:

1. **Credentials**: argon2id-hashed passwords. `POST /api/auth/login` rate-limited
   (5/15min/IP+email). Generic error messages to avoid user enumeration.
2. **Sessions**: short-lived **access JWT (15 min)** + **rotating refresh token (30 days)**,
   both httpOnly/Secure/SameSite=Lax cookies. Refresh rotation with reuse detection (steal a
   refresh token, use it twice → whole family revoked). Redis holds the revocation list.
3. **Email verification**: 6-digit OTP, 10-minute TTL, hashed at rest, max 5 attempts then
   cooldown. Same channel powers passwordless login and password reset.
4. **Social login**: Google + Apple via OAuth 2.0/OIDC (NextAuth). Accounts link by verified
   email; first social login creates the user row.
5. **Middleware** (`src/middleware.ts`): verifies the access JWT signature (jose, edge-safe) for
   `/dashboard`, `/learn`, `/quiz`, `/live/[id]`, `/checkout`, `/admin`; redirects to
   `/auth/login?next=…`. The demo checks cookie presence only — the swap is one function.
6. **RBAC**: roles `student | instructor | moderator | admin` as a JWT claim, checked in
   middleware (route level) and in every mutating handler (action level). Admin UI additionally
   gates client-side for UX (`src/app/admin/layout.tsx`), but authority lives server-side.
   Fine-grained permissions (e.g. `courses:publish`, `payments:refund`) map roles → permission
   sets in the `role_permissions` table so new roles don't require deploys.

## 4. Video pipeline

- **Ingest**: instructors upload masters to S3 via presigned URLs; a transcode job (Mux or
  ffmpeg workers) produces HLS ladders (360p→1080p) + thumbnails + audio track.
- **Delivery**: signed, expiring HLS URLs per lesson request; tokens bound to user + lesson so
  links can't be shared. DRM (Widevine/FairPlay) optional for flagship programs.
- **Player**: the custom player in `components/player/learn-room.tsx` already implements resume,
  speed, quality menu, PiP, captions, transcripts, notes, completion (≥90% watched), and
  next-lesson autoplay. In production it swaps `<video src>` for `hls.js` and posts progress
  beacons (`POST /api/progress`) every 15s + on pause/unload.
- **Offline**: mobile apps store encrypted downloads keyed to the device; web offers PWA cached
  playback for members.

## 5. Commerce

- **Orders**: server computes price (never the client), applies coupon rules, creates a Razorpay
  order, persists `payments(state=created)`. Client opens Razorpay Checkout (UPI/cards/
  netbanking/EMI).
- **Truth via webhooks**: `payment.captured` → mark paid, grant enrollment/subscription, issue
  GST invoice (sequential numbering), fire receipt email. Client success callbacks are hints
  only. Webhook handlers are idempotent (unique event id).
- **Subscriptions**: Razorpay Subscriptions for Beacon/Lighthouse; renewal webhooks extend
  `subscriptions.current_period_end`; dunning emails on failure with 3-day grace.
- **Refunds**: 7-day policy encoded server-side (checks watch-% from `lesson_progress`); refund
  via Razorpay API, state machine `captured → refund_pending → refunded`.

## 6. Live classes

- **Rooms**: 100ms/LiveKit SFU for video; room tokens minted per user with role (host/viewer).
- **Interaction**: WebSocket channel (or the SFU data channel) carries chat, polls, raise-hand;
  Redis pub/sub fans out. Messages persisted to `live_messages` for replay.
- **Attendance**: join/leave events land in `live_attendance`; ≥70% presence marks attended
  (feeds streaks and program analytics).
- **Recordings**: SFU recording → transcode pipeline → attached to the course as a lesson within
  an hour (the promise the UI makes).

## 7. Gamification & notifications

- XP events (lesson complete, quiz score, streak day, helpful answer) append to `xp_events`;
  Redis sorted sets serve leaderboards; levels/badges derive from totals (recomputable).
- Streaks computed in the user's timezone with one "streak freeze" per week for paid plans.
- Notification service consumes domain events → per-user preference matrix (email/push/in-app)
  → Resend / FCM / `notifications` table. Digest batching prevents spam.

## 8. Search, caching, analytics

- Meilisearch indexes courses (title, tags, teacher, transcripts) — powers the instant
  suggestions in the header and hero. Postgres `tsvector` is the fallback.
- Cache layers: CDN for static/ISR pages · Redis for hot reads (catalog lists, leaderboards) ·
  SWR headers on public APIs. Learner progress is never cached stale.
- PostHog (product analytics + feature flags) and Sentry (errors, web vitals). Event taxonomy
  lives in `lib/analytics.ts` in production so events are typed.

## 9. Deployment & environments

- Vercel (or containers on Fly/Railway) for the app; managed Postgres (Neon/RDS) with PITR
  backups; Upstash Redis; S3/R2 for objects. `dev → preview (per PR) → staging → prod`.
- CI: typecheck, lint, unit tests, Playwright smoke on preview, then promote. DB migrations via
  Prisma Migrate with `--create-only` review.
- Security headers set in `next.config.mjs` (nosniff, frame-deny, referrer policy); add CSP with
  per-request nonces at the edge. Secrets via platform env; none in the repo.
