# API Reference

REST contract for the Lighthouse Classes backend. Three endpoints ship as working demo route
handlers (`src/app/api/*`); the rest are the specified production surface the frontend already
calls conceptually.

## Conventions

- Base URL `/api`. JSON in/out. Success: `{ "data": …, "meta"?: … }`.
  Errors: `{ "error": { "code": "STRING_CODE", "message": "Human readable" } }`.
- Auth: httpOnly access-JWT cookie (`lh_at`) checked by middleware; role claims drive RBAC.
- Pagination: `?cursor=<id>&limit=20` → `meta: { nextCursor, total? }`.
- Rate limits (Redis): auth 5/15min, OTP 3/10min, writes 60/min, reads 300/min.
- Idempotency: mutating commerce endpoints accept an `Idempotency-Key` header.

## Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | `{name, email, password}` → creates user, sends OTP. `201` |
| POST | `/auth/verify-otp` | — | `{email, code, purpose}` → verifies; issues session cookies |
| POST | `/auth/login` ✅ demo | — | `{email, password}` → sets session cookies, returns user |
| POST | `/auth/refresh` | refresh cookie | Rotates refresh token, new access JWT |
| POST | `/auth/logout` | ✓ | Revokes refresh family, clears cookies |
| POST | `/auth/forgot-password` | — | Always `200` (no enumeration); emails reset link |
| POST | `/auth/reset-password` | — | `{token, password}` → resets, revokes all sessions |
| GET | `/auth/oauth/:provider` | — | Redirect to Google/Apple; callback links by verified email |
| GET | `/me` | ✓ | Profile + plan + streak + xp summary |
| PATCH | `/me` | ✓ | Update name/avatar/timezone/notification prefs |
| DELETE | `/me` | ✓ | DPDP erasure request (soft delete + 30-day purge job) |

## Catalog

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/courses` ✅ demo | — | `?q&category&level&language&price_min&price_max&sort&cursor` |
| GET | `/courses/:slug` | — | Full course incl. curriculum (lesson video URLs omitted) |
| GET | `/courses/:slug/reviews` | — | Paginated reviews + rating histogram |
| POST | `/courses/:slug/reviews` | ✓ enrolled | `{rating, text}` — one per user, editable |
| GET | `/categories` | — | Categories with counts |
| GET | `/teachers` / `/teachers/:slug` | — | Instructor directory / profile + courses |
| GET | `/search/suggest?q=` | — | Instant suggestions (Meilisearch), ≤8 results, <50ms target |

## Learning

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/enrollments` | ✓ | My courses with progress % and resume pointers |
| GET | `/lessons/:id/play` | ✓ entitled | Signed HLS URL + transcript + resume position |
| POST | `/progress` | ✓ | Beacon `{lessonId, positionSec, watchedDeltaSec}` (15s cadence) |
| POST | `/lessons/:id/complete` | ✓ | Marks complete (server re-checks ≥90% watched) → XP event |
| GET/POST | `/lessons/:id/notes` | ✓ | Timestamped notes CRUD (`DELETE /notes/:id`) |
| GET/POST | `/lessons/:id/bookmarks` | ✓ | Bookmarks CRUD |
| GET/POST/DELETE | `/wishlist(/:courseId)` | ✓ | Wishlist |
| GET | `/quizzes/:id` | ✓ entitled | Questions **without** `answerIndex` |
| POST | `/quizzes/:id/attempts` | ✓ | `{answers[], durationSec}` → server grades → score, explanations, XP |
| GET | `/quizzes/:id/leaderboard` | ✓ | Top N + my rank |
| GET | `/assignments` | ✓ | My assignments with status |
| POST | `/assignments/:id/submissions` | ✓ | Presigned upload → submission row |
| GET | `/certificates` | ✓ | My certificates |
| GET | `/certificates/verify/:id` | — | Public: `{valid, course, learner, issuedAt, hours}` or 404 |

## Gamification

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/gamification/summary` | ✓ | XP, level, streak, next-level delta, weekly activity |
| GET | `/gamification/badges` | ✓ | Earned + locked badges |
| GET | `/leaderboards/weekly` | ✓ | Weekly XP board (Redis) |

## Live classes

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/live` | — | Upcoming schedule (7 days) |
| POST | `/live/:id/join` | ✓ entitled | Room token (SFU) + WS channel; writes attendance join |
| POST | `/live/:id/raise-hand` | ✓ | Queue position broadcast |
| GET | `/live/:id/messages` | ✓ | Chat history (replay) |
| WS | `/ws/live/:id` | ✓ | chat / polls / hand events |

## Commerce

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/payments/order` ✅ demo | ✓ | `{courseSlug?|planId?, coupon?}` → server-priced Razorpay order |
| POST | `/payments/webhook` | Razorpay sig | `payment.captured/failed`, `subscription.*` — idempotent; grants access |
| GET | `/payments` | ✓ | My payment history + invoice URLs |
| POST | `/payments/:id/refund` | ✓ | Policy-checked (7d, <20% watched) refund request |
| POST | `/coupons/validate` | ✓ | `{code, itemRef}` → discount preview |
| GET/PATCH | `/subscription` | ✓ | Current plan / cancel-at-period-end, upgrade (prorated) |

## Community & notifications

| Method | Path | Auth | Description |
|---|---|---|---|
| GET/POST | `/forum/threads` | ✓ read: — | List (by course/tag) / create |
| GET/POST | `/forum/threads/:id/posts` | ✓ | Replies |
| POST/DELETE | `/forum/posts/:id/like` | ✓ | Like toggle |
| GET | `/notifications` | ✓ | Paginated, unread count in `meta` |
| POST | `/notifications/read-all` | ✓ | Mark all read |
| POST | `/push/subscribe` | ✓ | Register FCM/APNs/web-push token |

## Admin (`role >= ADMIN` unless noted)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/analytics/overview` | Tiles: revenue, actives, signups, completion |
| GET | `/admin/analytics/revenue?months=12` | Series for charts |
| GET/PATCH | `/admin/students(/:id)` | Search, plan changes, suspend |
| GET/POST/PATCH | `/admin/courses(/:id)` | CMS: draft → review → publish (instructors: own drafts only) |
| GET | `/admin/payments` | Ledger + export |
| POST | `/admin/payments/:id/refund` | Force refund (`payments:refund` permission) |
| GET/POST/PATCH | `/admin/coupons(/:id)` | Coupon CRUD |
| GET/POST | `/admin/live(/:id)` | Schedule management |
| POST | `/admin/certificates/:id/revoke` | Revoke with reason |
| POST | `/admin/notifications/broadcast` | Segmented announcement |

## Error codes

`BAD_REQUEST` · `INVALID_EMAIL` · `INVALID_CREDENTIALS` · `OTP_EXPIRED` · `OTP_ATTEMPTS_EXCEEDED`
· `UNAUTHORIZED` · `FORBIDDEN` (role/permission) · `NOT_ENTITLED` (no enrollment/plan) ·
`ITEM_NOT_FOUND` · `COUPON_INVALID` · `COUPON_EXHAUSTED` · `REFUND_WINDOW_CLOSED` ·
`RATE_LIMITED` (429 + `Retry-After`) · `CONFLICT` (idempotency replay mismatch) · `INTERNAL`.
