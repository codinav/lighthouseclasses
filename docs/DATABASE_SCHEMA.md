# Database Schema

PostgreSQL, managed with Prisma. This is the complete production schema the demo data layer
(`src/lib/data.ts`, `src/lib/progress.ts`) mirrors.

## ER overview

```
users ─┬─ enrollments ──── courses ─┬─ modules ── lessons ─┬─ lesson_progress
       ├─ subscriptions             ├─ reviews             ├─ notes
       ├─ payments ── invoices      ├─ quizzes ── questions├─ bookmarks
       ├─ xp_events / streaks       ├─ assignments         └─ transcripts
       ├─ user_badges ── badges     └─ live_classes ─┬─ live_attendance
       ├─ notifications                              └─ live_messages
       ├─ wishlists                 instructors ── payouts
       ├─ certificates              coupons ── coupon_redemptions
       └─ forum_threads ── forum_posts ── post_likes
```

## Prisma schema

```prisma
// ---------- Identity & access ----------

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime?
  phone         String?   @unique
  passwordHash  String?                    // null for social-only accounts
  name          String
  avatarUrl     String?
  role          Role      @default(STUDENT)
  timezone      String    @default("Asia/Kolkata")
  locale        String    @default("en-IN")
  createdAt     DateTime  @default(now())
  deletedAt     DateTime?                  // soft delete for DPDP compliance

  oauthAccounts   OAuthAccount[]
  refreshTokens   RefreshToken[]
  enrollments     Enrollment[]
  subscription    Subscription?
  payments        Payment[]
  lessonProgress  LessonProgress[]
  notes           Note[]
  bookmarks       Bookmark[]
  wishlist        WishlistItem[]
  quizAttempts    QuizAttempt[]
  submissions     AssignmentSubmission[]
  certificates    Certificate[]
  xpEvents        XpEvent[]
  streak          Streak?
  badges          UserBadge[]
  notifications   Notification[]
  prefs           NotificationPref[]
  threads         ForumThread[]
  posts           ForumPost[]
  liveAttendance  LiveAttendance[]
  instructor      Instructor?

  @@index([role])
}

enum Role {
  STUDENT
  INSTRUCTOR
  MODERATOR
  ADMIN
}

model RolePermission {                      // fine-grained RBAC: role -> permission slugs
  role       Role
  permission String                         // e.g. "courses:publish", "payments:refund"
  @@id([role, permission])
}

model OAuthAccount {
  id             String @id @default(cuid())
  userId         String
  provider       String                     // "google" | "apple"
  providerUserId String
  user           User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerUserId])
}

model RefreshToken {
  id        String    @id @default(cuid())
  userId    String
  tokenHash String    @unique
  familyId  String                          // rotation family for reuse detection
  expiresAt DateTime
  revokedAt DateTime?
  userAgent String?
  ip        String?
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, familyId])
}

model OtpCode {
  id        String   @id @default(cuid())
  email     String
  codeHash  String
  purpose   String                          // "verify_email" | "reset_password" | "login"
  attempts  Int      @default(0)
  expiresAt DateTime
  @@index([email, purpose])
}

// ---------- Catalog ----------

model Instructor {
  id         String  @id @default(cuid())
  userId     String  @unique
  slug       String  @unique
  title      String                          // "Mathematics · IIT Bombay, PhD"
  bio        String
  longBio    String
  specialties String[]
  featured   Boolean @default(false)
  payoutInfo Json?                           // masked account ref, PAN status
  user       User    @relation(fields: [userId], references: [id])
  courses    Course[]
  payouts    Payout[]
}

model Category {
  id      String   @id @default(cuid())
  name    String   @unique
  icon    String
  courses Course[]
}

model Course {
  id            String       @id @default(cuid())
  slug          String       @unique
  title         String
  subtitle      String
  description   String
  categoryId    String
  instructorId  String
  level         Level
  language      String
  priceInr      Int                            // paise
  originalInr   Int
  status        CourseStatus @default(DRAFT)
  outcomes      String[]
  requirements  String[]
  includes      String[]
  tags          String[]
  coverGradient String                         // design-system cover art key
  coverIcon     String
  trailerAssetId String?
  isFeatured    Boolean      @default(false)
  publishedAt   DateTime?
  updatedAt     DateTime     @updatedAt
  createdAt     DateTime     @default(now())

  category    Category     @relation(fields: [categoryId], references: [id])
  instructor  Instructor   @relation(fields: [instructorId], references: [id])
  modules     Module[]
  enrollments Enrollment[]
  reviews     Review[]
  quizzes     Quiz[]
  assignments Assignment[]
  liveClasses LiveClass[]
  certificates Certificate[]

  @@index([categoryId, status])
  @@index([instructorId])
}

enum Level { BEGINNER INTERMEDIATE ADVANCED ALL_LEVELS }
enum CourseStatus { DRAFT REVIEW PUBLISHED ARCHIVED }

model Module {
  id       String   @id @default(cuid())
  courseId String
  title    String
  position Int
  course   Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  lessons  Lesson[]
  @@unique([courseId, position])
}

model Lesson {
  id          String     @id @default(cuid())
  moduleId    String
  title       String
  type        LessonType @default(VIDEO)
  position    Int
  durationSec Int
  isFreePreview Boolean  @default(false)
  videoAssetId String?                        // Mux/Stream asset
  resourceUrl  String?                        // PDFs etc.
  module      Module     @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  progress    LessonProgress[]
  transcript  TranscriptLine[]
  notes       Note[]
  bookmarks   Bookmark[]
  @@unique([moduleId, position])
}

enum LessonType { VIDEO QUIZ ASSIGNMENT RESOURCE }

model TranscriptLine {
  id       String @id @default(cuid())
  lessonId String
  startSec Int
  text     String
  lesson   Lesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  @@index([lessonId, startSec])
}

// ---------- Learning state ----------

model Enrollment {
  id         String   @id @default(cuid())
  userId     String
  courseId   String
  source     String                           // "purchase" | "subscription" | "admin_grant"
  paymentId  String?
  createdAt  DateTime @default(now())
  completedAt DateTime?
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  course Course @relation(fields: [courseId], references: [id])
  @@unique([userId, courseId])
}

model LessonProgress {
  userId       String
  lessonId     String
  watchedSec   Int      @default(0)
  lastPosition Int      @default(0)           // resume point
  completedAt  DateTime?
  updatedAt    DateTime @updatedAt
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  lesson Lesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  @@id([userId, lessonId])
  @@index([userId, updatedAt])                // "continue learning" query
}

model Note {
  id        String   @id @default(cuid())
  userId    String
  lessonId  String
  atSec     Int
  text      String
  createdAt DateTime @default(now())
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  lesson Lesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  @@index([userId, lessonId])
}

model Bookmark {
  id       String @id @default(cuid())
  userId   String
  lessonId String
  atSec    Int
  label    String?
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  lesson Lesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  @@index([userId])
}

model WishlistItem {
  userId    String
  courseId  String
  createdAt DateTime @default(now())
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@id([userId, courseId])
}

// ---------- Assessment ----------

model Quiz {
  id          String  @id @default(cuid())
  courseId    String
  lessonId    String? @unique                 // quiz-type lesson link
  title       String
  durationMin Int
  xp          Int
  course    Course         @relation(fields: [courseId], references: [id], onDelete: Cascade)
  questions QuizQuestion[]
  attempts  QuizAttempt[]
}

model QuizQuestion {
  id          String   @id @default(cuid())
  quizId      String
  position    Int
  question    String
  options     String[]
  answerIndex Int
  explanation String
  quiz Quiz @relation(fields: [quizId], references: [id], onDelete: Cascade)
  @@unique([quizId, position])
}

model QuizAttempt {
  id          String   @id @default(cuid())
  quizId      String
  userId      String
  answers     Int[]                            // -1 = skipped
  score       Int
  total       Int
  durationSec Int
  createdAt   DateTime @default(now())
  quiz Quiz @relation(fields: [quizId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([quizId, score])                     // leaderboard
  @@index([userId, createdAt])
}

model Assignment {
  id       String   @id @default(cuid())
  courseId String
  title    String
  brief    String
  points   Int
  dueAt    DateTime?
  course      Course                 @relation(fields: [courseId], references: [id], onDelete: Cascade)
  submissions AssignmentSubmission[]
}

model AssignmentSubmission {
  id           String    @id @default(cuid())
  assignmentId String
  userId       String
  fileUrl      String
  submittedAt  DateTime  @default(now())
  gradedAt     DateTime?
  score        Int?
  feedback     String?
  assignment Assignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([assignmentId, userId])
}

model Certificate {
  id         String   @id                      // public verify ID e.g. "LH-2026-8F3K2A"
  userId     String
  courseId   String
  issuedAt   DateTime @default(now())
  hours      Int
  revokedAt  DateTime?
  pdfUrl     String
  user   User   @relation(fields: [userId], references: [id])
  course Course @relation(fields: [courseId], references: [id])
  @@unique([userId, courseId])
}

// ---------- Gamification ----------

model XpEvent {
  id        String   @id @default(cuid())
  userId    String
  kind      String                             // "lesson_complete" | "quiz" | "streak_day" | ...
  amount    Int
  refId     String?                            // lesson/quiz id
  createdAt DateTime @default(now())
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, createdAt])
}

model Streak {
  userId       String   @id
  current      Int      @default(0)
  longest      Int      @default(0)
  lastActiveOn DateTime?                       // date in user's tz
  freezesLeft  Int      @default(1)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Badge {
  id          String      @id @default(cuid())
  slug        String      @unique              // "week-of-fire"
  title       String
  description String
  icon        String
  xp          Int
  users       UserBadge[]
}

model UserBadge {
  userId   String
  badgeId  String
  earnedAt DateTime @default(now())
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  badge Badge @relation(fields: [badgeId], references: [id])
  @@id([userId, badgeId])
}

// ---------- Commerce ----------

model Plan {
  id            String         @id              // "spark" | "beacon" | "lighthouse"
  name          String
  monthlyInr    Int
  yearlyInr     Int
  features      String[]
  subscriptions Subscription[]
}

model Subscription {
  id                 String    @id @default(cuid())
  userId             String    @unique
  planId             String
  billing            String                      // "monthly" | "yearly"
  status             String                      // "active" | "past_due" | "cancelled"
  razorpaySubId      String?   @unique
  currentPeriodEnd   DateTime
  cancelAtPeriodEnd  Boolean   @default(false)
  user User @relation(fields: [userId], references: [id])
  plan Plan @relation(fields: [planId], references: [id])
}

model Payment {
  id              String        @id @default(cuid())
  userId          String
  amountInr       Int                             // paise
  gstInr          Int
  state           PaymentState  @default(CREATED)
  method          String?                         // "upi" | "card" | "netbanking" | "emi"
  razorpayOrderId String        @unique
  razorpayPayId   String?       @unique
  couponId        String?
  itemType        String                          // "course" | "plan"
  itemRef         String
  createdAt       DateTime      @default(now())
  capturedAt      DateTime?
  user    User     @relation(fields: [userId], references: [id])
  coupon  Coupon?  @relation(fields: [couponId], references: [id])
  invoice Invoice?
  @@index([userId, createdAt])
  @@index([state])
}

enum PaymentState { CREATED CAPTURED FAILED REFUND_PENDING REFUNDED }

model Invoice {
  id        String   @id                          // "INV-2026-0642" (sequential per FY)
  paymentId String   @unique
  gstin     String?
  pdfUrl    String
  issuedAt  DateTime @default(now())
  payment Payment @relation(fields: [paymentId], references: [id])
}

model Coupon {
  id          String    @id @default(cuid())
  code        String    @unique
  kind        String                              // "percent" | "flat"
  value       Int
  scope       Json?                               // {courseIds?, categoryIds?, planIds?}
  maxUses     Int?
  usedCount   Int       @default(0)
  expiresAt   DateTime?
  active      Boolean   @default(true)
  payments    Payment[]
  redemptions CouponRedemption[]
}

model CouponRedemption {
  couponId  String
  userId    String
  createdAt DateTime @default(now())
  coupon Coupon @relation(fields: [couponId], references: [id])
  @@id([couponId, userId])                        // one use per user
}

model Payout {
  id           String   @id @default(cuid())
  instructorId String
  amountInr    Int
  periodStart  DateTime
  periodEnd    DateTime
  status       String                              // "pending" | "paid"
  instructor Instructor @relation(fields: [instructorId], references: [id])
}

// ---------- Live ----------

model LiveClass {
  id         String   @id @default(cuid())
  courseId   String
  title      String
  startsAt   DateTime
  durationMin Int
  roomId     String?                               // SFU room
  recordingLessonId String?
  course     Course           @relation(fields: [courseId], references: [id])
  attendance LiveAttendance[]
  messages   LiveMessage[]
  @@index([startsAt])
}

model LiveAttendance {
  liveClassId String
  userId      String
  joinedAt    DateTime
  leftAt      DateTime?
  attended    Boolean  @default(false)             // >=70% presence
  liveClass LiveClass @relation(fields: [liveClassId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@id([liveClassId, userId])
}

model LiveMessage {
  id          String   @id @default(cuid())
  liveClassId String
  userId      String
  text        String
  createdAt   DateTime @default(now())
  liveClass LiveClass @relation(fields: [liveClassId], references: [id], onDelete: Cascade)
  @@index([liveClassId, createdAt])
}

// ---------- Community & reviews ----------

model Review {
  id        String   @id @default(cuid())
  courseId  String
  userId    String
  rating    Int                                     // 1..5
  text      String
  createdAt DateTime @default(now())
  course Course @relation(fields: [courseId], references: [id], onDelete: Cascade)
  @@unique([courseId, userId])
  @@index([courseId, rating])
}

model ForumThread {
  id        String      @id @default(cuid())
  userId    String
  courseId  String?                                 // null = general forum
  title     String
  tag       String
  createdAt DateTime    @default(now())
  user  User        @relation(fields: [userId], references: [id])
  posts ForumPost[]
  @@index([courseId, createdAt])
}

model ForumPost {
  id        String     @id @default(cuid())
  threadId  String
  userId    String
  text      String
  createdAt DateTime   @default(now())
  thread ForumThread @relation(fields: [threadId], references: [id], onDelete: Cascade)
  user   User        @relation(fields: [userId], references: [id])
  likes  PostLike[]
  @@index([threadId, createdAt])
}

model PostLike {
  postId String
  userId String
  post ForumPost @relation(fields: [postId], references: [id], onDelete: Cascade)
  @@id([postId, userId])
}

// ---------- Notifications ----------

model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String                                  // "live" | "assignment" | "achievement" | ...
  title     String
  body      String
  href      String?
  readAt    DateTime?
  createdAt DateTime @default(now())
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, readAt, createdAt])
}

model NotificationPref {
  userId  String
  channel String                                    // "email" | "push" | "inapp"
  topic   String                                    // "live_reminder" | "streak" | ...
  enabled Boolean @default(true)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@id([userId, channel, topic])
}
```

## Notes on key decisions

- **`LessonProgress` composite PK** `(userId, lessonId)` with `@@index([userId, updatedAt])`
  makes both "resume this lesson" and "continue learning" O(index).
- **Money in paise (Int)** — never floats. GST stored per payment for invoice fidelity.
- **Payment truth is the webhook**, so `PaymentState` is a strict machine and
  `razorpayOrderId/PayId` are unique for idempotency.
- **Certificates keyed by their public verify ID**, so `/certificates/verify` is a primary-key
  lookup; revocation is a timestamp, preserving history.
- **Soft-delete users (`deletedAt`)** for DPDP-compliant erasure workflows while keeping
  financial records intact (payments reference users without cascade).
- **Leaderboards** read `@@index([quizId, score])` (or Redis sorted sets at scale).


## Migration — homepage "featured" flag (2026-07)

The built-in demo catalog was removed; all courses live in `courses_custom`.
Featured-on-homepage needs one new column. Run once in the Supabase SQL editor:

```sql
alter table courses_custom add column if not exists featured boolean not null default false;
```


## Migration — teachers/live are admin-only; course thumbnail (2026-07)

The built-in demo teachers and live classes were removed; everything lives in
Supabase. Faculty (homepage "Meet the faculty" + about "Meet the team") reads
the `teachers` table; the live schedule reads `live_classes`. Courses gained an
optional cover image. Run once in the Supabase SQL editor:

```sql
alter table courses_custom add column if not exists thumbnail text;
-- (if not already added) homepage feature flag:
alter table courses_custom add column if not exists featured boolean not null default false;
```
