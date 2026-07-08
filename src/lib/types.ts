export type Level = "Beginner" | "Intermediate" | "Advanced" | "All Levels";

export type LessonType = "video" | "quiz" | "assignment" | "resource";

export interface Lesson {
  id: string;
  title: string;
  type: LessonType;
  durationSec: number;
  free?: boolean;
  /** Custom courses: direct video URL (falls back to sample videos) */
  videoUrl?: string;
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  level: Level;
  language: string;
  price: number;
  originalPrice: number;
  rating: number;
  ratingCount: number;
  students: number;
  durationHours: number;
  teacherId: string;
  description: string;
  outcomes: string[];
  requirements: string[];
  includes: string[];
  modules: Module[];
  tags: string[];
  gradient: string; // tailwind gradient classes for the cover art
  icon: string; // lucide icon name key
  /** optional uploaded cover image URL; falls back to gradient+icon art */
  thumbnail?: string;
  featured?: boolean;
  isNew?: boolean;
  isBestseller?: boolean;
  hasCertificate: boolean;
  updatedAt: string;
  /** true = created in the admin panel (uses query-based routes) */
  custom?: boolean;
}

export interface Teacher {
  id: string;
  slug: string;
  name: string;
  title: string;
  bio: string;
  longBio: string;
  rating: number;
  students: number;
  courseCount: number;
  specialties: string[];
  gradient: string;
  featured?: boolean;
}

export interface Review {
  id: string;
  courseSlug: string;
  author: string;
  rating: number;
  date: string;
  text: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  text: string;
  rating: number;
  course: string;
}

export interface LiveClass {
  id: string;
  title: string;
  teacherId: string;
  courseSlug: string;
  startsAt: string; // ISO
  durationMin: number;
  enrolled: number;
  level: Level;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  courseSlug: string;
  title: string;
  durationMin: number;
  xp: number;
  questions: QuizQuestion[];
}

export interface Plan {
  id: string;
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  features: string[];
  highlighted?: boolean;
}

export interface FAQ {
  q: string;
  a: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  earned: boolean;
  earnedAt?: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readMin: number;
  category: string;
  gradient: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  type: "live" | "assignment" | "announcement" | "achievement" | "reminder";
  read: boolean;
}
