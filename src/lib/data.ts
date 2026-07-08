import type {
  Achievement,
  BlogPost,
  Course,
  FAQ,
  LiveClass,
  Module,
  Plan,
  Quiz,
  Teacher,
} from "./types";

/* ------------------------------------------------------------------ */
/* Categories — launch catalog: Urdu, English & Persian                */
/* ------------------------------------------------------------------ */

export const CATEGORIES = [
  { name: "Urdu Language", icon: "Languages", count: 2, gradient: "from-ocean-600 to-navy-800" },
  { name: "Urdu Poetry", icon: "Feather", count: 3, gradient: "from-rose-500 to-pink-700" },
  { name: "Spoken English", icon: "Mic", count: 2, gradient: "from-emerald-500 to-teal-700" },
  { name: "English Grammar & Writing", icon: "BookOpen", count: 2, gradient: "from-violet-500 to-indigo-700" },
  { name: "Persian Language", icon: "ScrollText", count: 1, gradient: "from-amber-500 to-orange-700" },
  { name: "Persian Poetry", icon: "Quote", count: 1, gradient: "from-cyan-500 to-sky-700" },
  { name: "Calligraphy", icon: "PenTool", count: 1, gradient: "from-fuchsia-500 to-purple-700" },
  { name: "Flagship Programs", icon: "Target", count: 1, gradient: "from-gold-400 to-amber-600" },
] as const;

/* ------------------------------------------------------------------ */
/* Teachers                                                            */
/* ------------------------------------------------------------------ */

/** Faculty is admin-created (Supabase) — see src/lib/teachers.ts. */
export const TEACHERS: Teacher[] = [];

/* ------------------------------------------------------------------ */
/* Curriculum builder                                                  */
/* ------------------------------------------------------------------ */

let lessonSeq = 0;
function mod(title: string, lessons: [string, number, boolean?][]): Module {
  return {
    id: `m${++lessonSeq}`,
    title,
    lessons: lessons.map(([t, min, free], i) => ({
      id: `l${lessonSeq}-${i + 1}`,
      title: t,
      type: t.startsWith("Quiz:") ? "quiz" : t.startsWith("Assignment:") ? "assignment" : "video",
      durationSec: min * 60,
      free,
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Courses                                                             */
/* ------------------------------------------------------------------ */

/** The built-in demo catalog is gone — courses are admin-created in Supabase. */
export const COURSES: Course[] = [];

/* ------------------------------------------------------------------ */
/* Live classes                                                        */
/* ------------------------------------------------------------------ */

/** Live classes are admin-created (Supabase) — see src/lib/live-classes.ts. */
export const LIVE_CLASSES: LiveClass[] = [];

/* ------------------------------------------------------------------ */
/* Quizzes                                                             */
/* ------------------------------------------------------------------ */

export const QUIZZES: Quiz[] = [
  {
    id: "q1",
    courseSlug: "urdu-script-zero-to-reading",
    title: "Joining Rules Mastery Quiz",
    durationMin: 8,
    xp: 150,
    questions: [
      {
        id: "q1-1",
        question: "Urdu is written and read in which direction?",
        options: ["Left to right", "Right to left", "Top to bottom", "Either direction"],
        answerIndex: 1,
        explanation: "Urdu, like Arabic and Persian, flows right to left. Numbers within Urdu text, however, are written left to right — one of the script's charming quirks.",
      },
      {
        id: "q1-2",
        question: "Which of these letters NEVER joins the letter that comes after it?",
        options: ["ب (be)", "د (daal)", "س (seen)", "ک (kaaf)"],
        answerIndex: 1,
        explanation: "د (daal) is one of the 'rebel' letters — along with ا ر ڑ ز ژ و ے — that connect to the letter before them but never to the one after. Spotting these rebels is the key to reading joined text.",
      },
      {
        id: "q1-3",
        question: "The calligraphic style Urdu is traditionally written in is called:",
        options: ["Naskh", "Kufic", "Nastaliq", "Devanagari"],
        answerIndex: 2,
        explanation: "Nastaliq — the 'hanging' style developed in Persia — is Urdu's traditional script style, famous for its flowing diagonal sweep. Arabic is usually printed in the more upright Naskh.",
      },
      {
        id: "q1-4",
        question: "The word کتاب reads as:",
        options: ["kalaam", "kitaab", "kaatib", "kabaab"],
        answerIndex: 1,
        explanation: "ک (k) + ت (t) + ا (aa) + ب (b) = kitaab, 'book'. Notice how ک and ت take their joined initial/medial forms while ا refuses to connect forward — the rebels at work.",
      },
      {
        id: "q1-5",
        question: "The small marks zabar, zer, and pesh (aerab) indicate:",
        options: ["Punctuation", "Short vowel sounds", "Emphasis", "The end of a sentence"],
        answerIndex: 1,
        explanation: "Aerab mark the short vowels a, i, and u. Everyday Urdu omits them — fluent readers infer vowels from context, which is exactly the skill this course builds in module three.",
      },
    ],
  },
  {
    id: "q2",
    courseSlug: "english-grammar-finally-clear",
    title: "Tense Mastery Quiz",
    durationMin: 8,
    xp: 120,
    questions: [
      {
        id: "q2-1",
        question: "\"I ___ in Delhi since 2019.\" Which is correct?",
        options: ["am living", "live", "have been living", "was living"],
        answerIndex: 2,
        explanation: "'Since 2019' signals an action starting in the past and continuing now — the present perfect continuous. 'I have been living in Delhi since 2019' connects past to present, which simple present cannot.",
      },
      {
        id: "q2-2",
        question: "Which sentence is correct?",
        options: [
          "She is knowing the answer.",
          "She knows the answer.",
          "She know the answer.",
          "She is know the answer.",
        ],
        answerIndex: 1,
        explanation: "'Know' is a stative verb — it describes a state, not an action — so it resists the continuous form. This is one of the classic patterns behind the 'is knowing / is having' errors.",
      },
      {
        id: "q2-3",
        question: "\"___ university near my house is famous.\" Choose the article:",
        options: ["A", "An", "The", "No article"],
        answerIndex: 2,
        explanation: "We're pointing at one specific, identifiable university ('near my house'), so 'the' is required. And note: 'university' starts with a 'yoo' consonant sound, so it would take 'a', never 'an'.",
      },
      {
        id: "q2-4",
        question: "\"The meeting is ___ Monday ___ 4 pm.\" Fill the prepositions:",
        options: ["in / at", "on / at", "at / on", "on / in"],
        answerIndex: 1,
        explanation: "Days take 'on' (on Monday); clock times take 'at' (at 4 pm). The time-preposition ladder — at (points) → on (days) → in (longer periods) — solves these forever.",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Pricing plans                                                       */
/* ------------------------------------------------------------------ */

export const PLANS: Plan[] = [
  {
    id: "spark",
    name: "Spark",
    tagline: "Start your journey",
    monthly: 0,
    yearly: 0,
    features: [
      "Free lessons in every course",
      "Community forums access",
      "1 quiz attempt per day",
      "Learning streak & XP",
      "Mobile app access",
    ],
  },
  {
    id: "beacon",
    name: "Beacon",
    tagline: "For serious learners",
    monthly: 699,
    yearly: 6999,
    features: [
      "Unlimited access to all courses",
      "All quizzes, assignments & certificates",
      "Offline downloads",
      "Live class recordings",
      "Priority doubt support",
      "Ad-free experience",
    ],
    highlighted: true,
  },
  {
    id: "lighthouse",
    name: "Lighthouse",
    tagline: "The complete experience",
    monthly: 1299,
    yearly: 12999,
    features: [
      "Everything in Beacon",
      "All live classes & mushairas with interaction",
      "1-on-1 monthly mentorship",
      "Personalised study plans",
      "Writing & speaking evaluations",
      "Early access to new courses",
    ],
  },
];

/* ------------------------------------------------------------------ */
/* FAQs                                                                */
/* ------------------------------------------------------------------ */

export const FAQS: FAQ[] = [
  { q: "I can't read Urdu script at all. Where do I start?", a: "Start with 'Urdu Script: Zero to Reading' — it assumes nothing and gets most learners reading joined Nastaliq within eight weeks. If your goal is poetry, follow it with 'The Art of the Ghazal'; the two are designed as a pair, and both are included in the One-Year Immersion program." },
  { q: "Do courses come with a certificate?", a: "Yes. Every course includes a verifiable certificate of completion. Each certificate carries a unique verification ID that employers and institutions can validate on our certificate verification page." },
  { q: "How do I access my courses after purchase?", a: "Instantly. The moment your payment is confirmed, the course appears in your dashboard under 'My Courses'. You can start learning on any device — web, Android, or iOS — and your progress syncs automatically." },
  { q: "Can I download lessons and watch offline?", a: "Beacon and Lighthouse members can download lessons in the mobile app and watch without internet — perfect for commutes or areas with patchy connectivity. Downloads stay available as long as your membership is active." },
  { q: "What if I don't like a course I purchased?", a: "We offer a no-questions-asked 7-day refund on all individual course purchases, as long as you've watched less than 20% of the content. Refunds are processed to your original payment method within 5–7 business days." },
  { q: "How do live classes and mushairas work?", a: "Live classes run on our built-in classroom with HD video, live chat, and a raise-hand feature. Monthly mushairas are open-mic evenings where students recite their own work to the ustad and cohort. Can't attend? Every session is recorded and in your dashboard within an hour." },
  { q: "Which language are the courses taught in?", a: "Each course page lists its medium of instruction. Urdu script and grammar courses are taught in Hindi + English; poetry courses in Urdu + English; Persian courses in English; and English courses use Hindi scaffolding where beginners need it." },
  { q: "Do you offer scholarships?", a: "We reserve seats in the One-Year Immersion program for merit and need-based scholarships. Take the Lighthouse Scholarship Test held every quarter — top performers receive 50–100% fee waivers." },
];

/* ------------------------------------------------------------------ */
/* Achievements                                                        */
/* ------------------------------------------------------------------ */

export const ACHIEVEMENTS: Achievement[] = [
  { id: "a1", title: "First Light", description: "Complete your first lesson", icon: "Sunrise", xp: 50, earned: true, earnedAt: "2026-05-02" },
  { id: "a2", title: "Week of Fire", description: "Maintain a 7-day learning streak", icon: "Flame", xp: 200, earned: true, earnedAt: "2026-05-09" },
  { id: "a3", title: "Harf Shanaas", description: "Score 100% on a script quiz", icon: "Zap", xp: 150, earned: true, earnedAt: "2026-05-15" },
  { id: "a4", title: "Night Owl", description: "Complete a lesson after midnight", icon: "Moon", xp: 75, earned: true, earnedAt: "2026-05-21" },
  { id: "a5", title: "Course Conqueror", description: "Complete your first full course", icon: "Trophy", xp: 500, earned: false },
  { id: "a6", title: "Beacon of Knowledge", description: "Reach Level 10", icon: "Lightbulb", xp: 1000, earned: false },
  { id: "a7", title: "Marathon Mind", description: "Maintain a 30-day streak", icon: "Medal", xp: 750, earned: false },
  { id: "a8", title: "Mushaira Star", description: "Recite your own work at a live mushaira", icon: "Star", xp: 300, earned: false },
];

/* ------------------------------------------------------------------ */
/* Blog                                                                */
/* ------------------------------------------------------------------ */

export const BLOG_POSTS: BlogPost[] = [
  { slug: "science-of-spaced-repetition", title: "The Science of Spaced Repetition: Learn Vocabulary You Never Forget", excerpt: "Your brain forgets on a predictable curve. Here's how successful language learners use that curve against itself — and how our review scheduler does it for you automatically.", date: "2026-06-24", readMin: 8, category: "Learning Science", gradient: "from-ocean-600 to-navy-800" },
  { slug: "reading-nastaliq-in-30-days", title: "I Couldn't Read a Word of Urdu. 30 Days Later, I Read Ghalib.", excerpt: "A designer from Mumbai documents her month with the letter-families method — the plateaus, the breakthrough at day 19, and the sher that made it all worth it.", date: "2026-06-15", readMin: 11, category: "Success Stories", gradient: "from-gold-400 to-amber-700" },
  { slug: "ghalib-for-beginners", title: "Ghalib for Absolute Beginners: Five Shers to Fall in Love With", excerpt: "You don't need Persian to feel Ghalib. Start with these five verses — translated, transliterated, and unpacked by Ustad Zafar Hashmi.", date: "2026-06-08", readMin: 6, category: "Poetry", gradient: "from-rose-500 to-pink-800" },
  { slug: "learning-streaks-psychology", title: "Why Streaks Work: The Psychology of Showing Up Daily", excerpt: "A 15-minute daily habit beats a 6-hour Sunday binge — and for language learning the neuroscience is unambiguous. Here's how to build a streak that survives busy weeks.", date: "2026-05-30", readMin: 7, category: "Learning Science", gradient: "from-emerald-500 to-teal-800" },
];

/* ------------------------------------------------------------------ */
/* Lookups                                                             */
/* ------------------------------------------------------------------ */

export function getCourse(slug: string) {
  return COURSES.find((c) => c.slug === slug);
}

export function getTeacher(id: string) {
  return TEACHERS.find((t) => t.id === id);
}

export function getTeacherBySlug(slug: string) {
  return TEACHERS.find((t) => t.slug === slug);
}

export function getCoursesByTeacher(teacherId: string) {
  return COURSES.filter((c) => c.teacherId === teacherId);
}

export function getQuiz(id: string) {
  return QUIZZES.find((q) => q.id === id);
}

export function lessonCount(course: { modules: Module[] }) {
  return course.modules.reduce((n, m) => n + m.lessons.length, 0);
}

/** Real course duration in minutes — the sum of every lesson's length. */
export function courseDurationMin(course: { modules: Module[] }) {
  return Math.round(
    course.modules.reduce((n, m) => n + m.lessons.reduce((s, l) => s + l.durationSec, 0), 0) / 60
  );
}

