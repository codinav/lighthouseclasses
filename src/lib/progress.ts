/**
 * Demo learning-state for the signed-in student. In production this comes
 * from the API (see docs/API.md) — enrollments, lesson_progress, streaks.
 */

export interface Enrollment {
  courseSlug: string;
  progress: number; // 0–100
  lastLessonTitle: string;
  lastLessonId: string;
  lastWatchedAt: string;
  timeLeftMin: number;
}

export const ENROLLMENTS: Enrollment[] = [
  {
    courseSlug: "urdu-script-zero-to-reading",
    progress: 67,
    lastLessonTitle: "Aerab: zabar, zer, pesh and reading without them",
    lastLessonId: "l3-1",
    lastWatchedAt: "2026-07-03T21:40:00+05:30",
    timeLeftMin: 356,
  },
  {
    courseSlug: "spoken-english-confidence",
    progress: 34,
    lastLessonTitle: "The 12 sounds Indian speakers miss",
    lastLessonId: "l10-1",
    lastWatchedAt: "2026-07-02T19:15:00+05:30",
    timeLeftMin: 871,
  },
  {
    courseSlug: "the-art-of-the-ghazal",
    progress: 12,
    lastLessonTitle: "Anatomy of a sher",
    lastLessonId: "l5-2",
    lastWatchedAt: "2026-06-29T22:05:00+05:30",
    timeLeftMin: 1267,
  },
];

export const WEEKLY_ACTIVITY = [
  { day: "Mon", minutes: 42 },
  { day: "Tue", minutes: 65 },
  { day: "Wed", minutes: 28 },
  { day: "Thu", minutes: 74 },
  { day: "Fri", minutes: 51 },
  { day: "Sat", minutes: 90 },
  { day: "Sun", minutes: 35 },
];

export const DAILY_GOAL_MIN = 45;
export const TODAY_MINUTES = 32;

export const ASSIGNMENTS = [
  { id: "as1", title: "Write a Matla", course: "The Art of the Ghazal", due: "2026-07-05", status: "pending" as const, points: 100 },
  { id: "as2", title: "Record Your One-Minute Story", course: "Spoken English & Confidence", due: "2026-07-09", status: "pending" as const, points: 80 },
  { id: "as3", title: "Write Your Name & Address in Urdu", course: "Urdu Script: Zero to Reading", due: "2026-07-12", status: "submitted" as const, points: 50 },
  { id: "as4", title: "Letter Drills: One Full Page", course: "Urdu Script: Zero to Reading", due: "2026-06-28", status: "graded" as const, points: 100, score: 92 },
];

export const CERTIFICATES = [
  { id: "LH-2026-8F3K2A", course: "English Grammar, Finally Clear", issued: "2026-06-14", hours: 16 },
  { id: "LH-2026-4B9X7C", course: "Spoken Urdu: Adab & Conversation", issued: "2026-04-02", hours: 20 },
];

export const PAYMENTS = [
  { id: "INV-2026-0642", date: "2026-06-01", description: "Beacon Plan — Annual", amount: 6999, method: "UPI · aarav@okhdfc", status: "Paid" },
  { id: "INV-2026-0413", date: "2026-05-11", description: "Urdu Complete: One-Year Immersion", amount: 11999, method: "Card · HDFC •• 4521", status: "Paid" },
  { id: "INV-2026-0221", date: "2026-05-02", description: "Urdu Script: Zero to Reading", amount: 1499, method: "UPI · aarav@okhdfc", status: "Paid" },
];

export const DOWNLOADS = [
  { id: "d1", title: "Aerab: zabar, zer, pesh and reading without them", course: "Urdu Script: Zero to Reading", size: "164 MB", quality: "720p", expires: "Available offline" },
  { id: "d2", title: "The 12 sounds Indian speakers miss", course: "Spoken English & Confidence", size: "188 MB", quality: "720p", expires: "Available offline" },
  { id: "d3", title: "Urdu alphabet practice workbook (PDF)", course: "Urdu Script: Zero to Reading", size: "3.1 MB", quality: "PDF", expires: "Available offline" },
];

export const BOOKMARKS = [
  { id: "b1", lesson: "The rebels: letters that never connect forward", course: "urdu-script-zero-to-reading", courseTitle: "Urdu Script: Zero to Reading", at: "07:42", note: "The 7 rebel letters — revise before the joining quiz" },
  { id: "b2", lesson: "Ghalib — complexity and wit", course: "the-art-of-the-ghazal", courseTitle: "The Art of the Ghazal", at: "08:15", note: "«dil-e-nādāñ» breakdown" },
  { id: "b3", lesson: "Interviews: the STAR answers, spoken aloud", course: "spoken-english-confidence", courseTitle: "Spoken English & Confidence", at: "14:03", note: "My 'tell me about yourself' draft — redo recording" },
];
