# Information Architecture & User Flows

## 1. Sitemap (implemented)

```
/                             Home
├── /courses                  Catalog (search, filters, sort)
│   └── /courses/[slug]       Course detail (trailer, curriculum, reviews, enroll)
├── /teachers                 Faculty directory
│   └── /teachers/[slug]      Instructor profile + courses
├── /live                     Live schedule (public)
│   └── /live/[id]            🔒 Live classroom (chat, raise-hand, attendance)
├── /pricing                  Plans (monthly/yearly toggle)
├── /community                Forums, groups, announcements
├── /blog                     The Beacon
│   └── /blog/[slug]          Article
├── /about · /careers · /contact · /faq · /support
├── /privacy · /terms · /refund
├── /certificates/verify      Public certificate verification
│
├── /auth/login · /auth/register · /auth/verify (OTP) · /auth/forgot-password
│
├── 🔒 /dashboard             Student home (streak, goal, continue learning, activity chart)
│   ├── /my-courses           In progress + completed
│   ├── /assignments          Due / submitted / graded
│   ├── /certificates         Previews + verify IDs
│   ├── /achievements         XP, levels, badge grid
│   ├── /wishlist             Wishlist + lesson bookmarks
│   ├── /downloads            Offline content + storage meter
│   ├── /notifications        Inbox
│   └── /settings             Profile, theme, notification prefs, plan, payment history
│
├── 🔒 /learn/[slug]          Video learning room (player + lessons/notes/transcript)
├── 🔒 /quiz/[id]             Quiz runner (intro → timed MCQs → results + leaderboard)
├── 🔒 /checkout              Payment (methods, coupons, GST, success)
│
├── 🔒 /admin                 Analytics (revenue, plan share, category enrollments)
│   ├── /students · /courses · /payments · /coupons
│
└── 404                       Custom "Lost in the fog"

🔒 = session required (middleware). /admin additionally requires the admin role (RBAC).
```

Content model: **Category → Course → Module → Lesson (video | quiz | assignment | resource)**,
with Instructor, Review, LiveClass, Certificate hanging off Course, and all learner state
(progress, notes, streaks, XP) hanging off User × Lesson.

## 2. Primary user flows

### Student — discover → enroll → learn (the money path)
```
Home hero search ─┬→ /courses?q=… → filter/sort → Course detail
                  └→ suggestion → Course detail
Course detail → free preview lesson (/learn, green rows) ────────┐
             → Enroll now → 🔒 /checkout (login wall w/ ?next=)  │
Checkout → method + coupon → pay → success → Start learning ←────┘
/learn: watch → auto-resume · notes · transcript → lesson ≥90% = complete
      → quiz lesson → /quiz/[id] → instant feedback → XP + leaderboard
      → module done → next-lesson autoplay → course 100% → certificate issued
Dashboard reinforces the loop: streak + daily goal + "Continue learning" card.
```
Design intent: **minimum clicks to resume** — from opening the app, one tap
(dashboard card or bottom-nav "Learning") returns the student to the exact second they left.

### Student — first-run
```
/auth/register (or Google/Apple, skips OTP) → email OTP (/auth/verify, auto-advance boxes,
paste support, resend timer) → /dashboard with starter recommendations → first lesson
→ "First Light" badge (+50 XP) → streak day 1 begins.
```

### Student — live class
```
Reminder (push/email, 30 min) → /live countdown card → Join → 🔒 room
→ attendance auto-marked on join → chat / raise hand (queued) → class ends
→ recording appears in course within 1h → absent students get the recording notification.
```

### Instructor (production flow; admin console today)
```
Apply → audition → onboarded as INSTRUCTOR role
→ /admin/courses: New course → draft outline (modules/lessons) → upload masters
  (presigned S3 → auto-transcode) → attach quizzes/assignments → submit for review
→ moderator review → publish (ISR revalidates catalog)
→ weekly: live classes, Q&A inbox, earnings dashboard → monthly payout.
```

### Admin
```
/admin: monitor tiles + revenue/plan/category charts
→ students: search → view → change plan / suspend
→ payments: reconcile (webhook ledger) → refund within policy
→ coupons: create scoped codes with limits/expiry
→ courses: review queue → publish/reject with notes
→ broadcast announcements (segmented, respects notification prefs).
```

## 3. Key screen wireframes (rationale)

```
HOME (mobile)                      LEARN ROOM (desktop)
┌─────────────────────┐            ┌──────────────────────────┬──────────┐
│ ⛯ Logo    🔍 ◐ ☰    │            │ ‹ course · lesson · prog │ Lessons  │
│  eyebrow            │            │ ┌──────────────────────┐ │ Notes    │
│  H1 with gold turn  │            │ │       VIDEO          │ │ Transcr. │
│  search pill        │            │ │  (controls overlay)  │ │──────────│
│  [Start free] [CTA] │            │ └──────────────────────┘ │ ▸ module │
│  stats row          │            │ title · next lesson  ►   │  ✓ done  │
│  ── wave divider ── │            │ shortcuts hint           │  ● now   │
│  category 2×4 grid  │            └──────────────────────────┴──────────┘
│  course rail →→     │            Sidebar = the "companion": everything
│  …                  │            secondary lives there so video keeps
│ [⌂][◎][live][▤][👤] │            100% attention. Tabs never navigate away.
└─────────────────────┘
```

- **Home** sells in one screen: identity (beam hero) → proof (stats) → action (search + CTA).
  Every following section is a horizontally scrollable rail on mobile — thumb-friendly, no
  pogo-sticking.
- **Course detail** keeps a **sticky enroll card** (desktop) / inline CTA (mobile) so price +
  action are always one glance away while the left column builds trust (outcomes → curriculum
  → instructor → reviews).
- **Dashboard** leads with *motion state* (streak, goal ring, continue-learning) rather than
  navigation — the job of that screen is to restart a session in one tap.
- **Quiz** shows one question at a time with instant explanations: retrieval practice with
  immediate feedback beats end-scored tests for retention.
- **Checkout** is chrome-free (logo + secure badge only) to minimize abandonment; methods are
  radio cards ordered by Indian usage (UPI first).

## 4. Navigation model

- **Mobile**: floating glass bottom bar — Home / Explore / Live / Learning / Profile — the five
  jobs-to-be-done. Header shrinks to logo + search + menu sheet.
- **Desktop**: top nav (Courses, Live, Teachers, Pricing, Community) + user avatar menu;
  dashboard/admin add a left rail.
- **Global search** (header icon) is a command-palette overlay: type → arrow/click → course.
  Available on every page — search is the platform's fastest path to value.

## 5. States & edge cases covered

Loading skeletons (catalog, filter changes) · empty states with next actions (wishlist, search,
notes) · error states (login, OTP, coupon, certificate-not-found) · offline-ish (downloads
page, PWA) · access-denied (admin gate explains how to get access) · 404 (branded, offers home/
courses) · unread/read, live/upcoming, earned/locked, paid/refunded dual states throughout.
