/**
 * Supabase data layer — real accounts, enrollments, and learning progress.
 *
 * Every function is safe to call unconditionally: when Supabase isn't
 * configured or a table doesn't exist yet, reads return empty and writes
 * no-op, so the UI falls back to demo data. Users are keyed by email
 * (demo-grade auth); moving to Supabase Auth later swaps the key for a uuid.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionUser } from "./providers";
import { sb } from "./sb";

function getClient(): Promise<SupabaseClient | null> {
  return Promise.resolve(sb());
}

/* ------------------------------------------------------------------ */
/* Row shapes                                                          */
/* ------------------------------------------------------------------ */

export interface ProfileRow {
  email: string;
  name: string;
  avatar_url: string | null;
  provider: string;
  role: string;
  plan: string;
  phone: string | null;
  marketing_opt_in: boolean | null;
  admin_sections: string | null; // csv of section keys; empty/null = full access
  created_at: string;
  last_active_at: string;
}

export interface EnrollmentRow {
  email: string;
  course_slug: string;
  source: string;
  progress: number;
  last_lesson_id: string | null;
  last_lesson_title: string | null;
  updated_at: string;
  created_at: string;
}

export interface LessonProgressRow {
  lesson_id: string;
  position_sec: number;
  completed: boolean;
}

/* ------------------------------------------------------------------ */
/* Profiles                                                            */
/* ------------------------------------------------------------------ */

export async function upsertProfile(user: SessionUser, marketingOptIn?: boolean, phone?: string): Promise<void> {
  const db = await getClient();
  if (!db) return;
  try {
    const row: Record<string, unknown> = {
      email: user.email.toLowerCase(),
      name: user.name,
      avatar_url: user.avatarUrl ?? null,
      provider: user.provider,
      // role is intentionally NOT written here — it's managed exclusively by
      // the master admin (Admin → Team); logins must never overwrite grants.
      plan: user.plan,
      last_active_at: new Date().toISOString(),
    };
    // Only write consent when explicitly given (signup) — later logins
    // must never overwrite the user's choice.
    if (marketingOptIn !== undefined) row.marketing_opt_in = marketingOptIn;
    // Phone is captured at signup; don't clobber it on later logins.
    if (phone !== undefined && phone.trim()) row.phone = phone.trim();
    await db.from("profiles").upsert(row, { onConflict: "email" });
  } catch {}
}

/** Realtime channel names for admin subscriptions. */
export const SIGNUPS_CHANNEL = "admin-live-signups";

export async function touchProfile(email: string): Promise<void> {
  const db = await getClient();
  if (!db) return;
  try {
    await db.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("email", email);
  } catch {}
}

export async function updateProfilePlan(email: string, plan: string): Promise<void> {
  const db = await getClient();
  if (!db) return;
  try {
    await db.from("profiles").update({ plan }).eq("email", email);
  } catch {}
}

/** Role + granted admin sections stored in the database. */
export async function fetchProfileAccess(
  email: string
): Promise<{ role: "admin" | "student"; sections: string[] } | null> {
  const db = await getClient();
  if (!db) return null;
  try {
    const { data, error } = await db
      .from("profiles")
      .select("role, admin_sections")
      .eq("email", email.toLowerCase())
      .maybeSingle();
    if (error || !data) return null;
    const sections = ((data.admin_sections as string | null) ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return { role: data.role === "admin" ? "admin" : "student", sections };
  } catch {
    return null;
  }
}

export async function fetchAdmins(): Promise<ProfileRow[]> {
  const db = await getClient();
  if (!db) return [];
  try {
    const { data, error } = await db.from("profiles").select("*").eq("role", "admin").order("created_at");
    return error || !data ? [] : (data as ProfileRow[]);
  } catch {
    return [];
  }
}

/**
 * Grant limited admin access with specific sections (empty = full access).
 * Pre-grants work even before first sign-in.
 */
export async function grantAdmin(email: string, sections: string[] = []): Promise<{ ok: boolean; error?: string }> {
  const db = await getClient();
  if (!db) return { ok: false, error: "Supabase isn't configured." };
  try {
    const target = email.trim().toLowerCase();
    const csv = sections.join(",");
    const { data, error } = await db
      .from("profiles")
      .update({ role: "admin", admin_sections: csv })
      .eq("email", target)
      .select("email");
    if (error) return { ok: false, error: error.message };
    if (data && data.length > 0) return { ok: true };
    // No profile yet — pre-grant: they become admin the moment they sign up
    const { error: insErr } = await db.from("profiles").insert({
      email: target,
      name: "Invited admin",
      provider: "email",
      role: "admin",
      admin_sections: csv,
    });
    return insErr ? { ok: false, error: insErr.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to grant access." };
  }
}

/** Master-only: remove a student account's platform data entirely. */
export async function deleteProfile(email: string): Promise<{ ok: boolean; error?: string }> {
  const db = await getClient();
  if (!db) return { ok: false, error: "Supabase isn't configured." };
  try {
    const target = email.toLowerCase();
    await db.from("lesson_progress").delete().eq("email", target);
    await db.from("enrollments").delete().eq("email", target);
    const { error } = await db.from("profiles").delete().eq("email", target);
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete." };
  }
}

export async function revokeAdmin(email: string): Promise<{ ok: boolean; error?: string }> {
  const db = await getClient();
  if (!db) return { ok: false, error: "Supabase isn't configured." };
  try {
    const { error } = await db.from("profiles").update({ role: "student" }).eq("email", email.trim().toLowerCase());
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to revoke access." };
  }
}

export async function fetchProfiles(): Promise<ProfileRow[]> {
  const db = await getClient();
  if (!db) return [];
  try {
    const { data, error } = await db
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return error || !data ? [] : (data as ProfileRow[]);
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Enrollments                                                         */
/* ------------------------------------------------------------------ */

export async function recordEnrollment(
  email: string,
  courseSlug: string,
  source: "purchase" | "subscription" | "watch"
): Promise<void> {
  const db = await getClient();
  if (!db) return;
  try {
    // Don't downgrade a purchase to "watch" on repeat visits
    await db
      .from("enrollments")
      .upsert({ email, course_slug: courseSlug, source }, { onConflict: "email,course_slug", ignoreDuplicates: true });
  } catch {}
}

export async function updateEnrollmentProgress(
  email: string,
  courseSlug: string,
  progress: number,
  lastLessonId: string,
  lastLessonTitle: string
): Promise<void> {
  const db = await getClient();
  if (!db) return;
  try {
    await db
      .from("enrollments")
      .update({
        progress: Math.max(0, Math.min(100, Math.round(progress))),
        last_lesson_id: lastLessonId,
        last_lesson_title: lastLessonTitle,
        updated_at: new Date().toISOString(),
      })
      .eq("email", email)
      .eq("course_slug", courseSlug);
  } catch {}
}

export async function fetchEnrollments(email: string): Promise<EnrollmentRow[]> {
  const db = await getClient();
  if (!db) return [];
  try {
    const { data, error } = await db
      .from("enrollments")
      .select("*")
      .eq("email", email)
      .order("updated_at", { ascending: false });
    return error || !data ? [] : (data as EnrollmentRow[]);
  } catch {
    return [];
  }
}

export async function fetchAllEnrollmentCounts(): Promise<Map<string, number>> {
  const db = await getClient();
  const counts = new Map<string, number>();
  if (!db) return counts;
  try {
    const { data, error } = await db.from("enrollments").select("email").limit(2000);
    if (error || !data) return counts;
    for (const row of data as { email: string }[]) {
      counts.set(row.email, (counts.get(row.email) ?? 0) + 1);
    }
    return counts;
  } catch {
    return counts;
  }
}

/* ------------------------------------------------------------------ */
/* Lesson progress                                                     */
/* ------------------------------------------------------------------ */

export async function saveLessonProgress(
  email: string,
  courseSlug: string,
  lessonId: string,
  positionSec: number,
  completed: boolean
): Promise<void> {
  const db = await getClient();
  if (!db) return;
  try {
    await db.from("lesson_progress").upsert(
      {
        email,
        course_slug: courseSlug,
        lesson_id: lessonId,
        position_sec: Math.round(positionSec),
        completed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email,lesson_id" }
    );
  } catch {}
}

export interface UserProgressRow {
  course_slug: string;
  lesson_id: string;
  updated_at: string | null;
}

/** Every completed lesson for a user, across all courses (feeds XP/badges). */
export async function fetchAllUserProgress(email: string): Promise<UserProgressRow[]> {
  const db = await getClient();
  if (!db) return [];
  try {
    const { data, error } = await db
      .from("lesson_progress")
      .select("course_slug, lesson_id, updated_at")
      .eq("email", email)
      .eq("completed", true);
    return error || !data ? [] : (data as UserProgressRow[]);
  } catch {
    return [];
  }
}

export async function fetchCourseProgress(email: string, courseSlug: string): Promise<LessonProgressRow[]> {
  const db = await getClient();
  if (!db) return [];
  try {
    const { data, error } = await db
      .from("lesson_progress")
      .select("lesson_id, position_sec, completed")
      .eq("email", email)
      .eq("course_slug", courseSlug);
    return error || !data ? [] : (data as LessonProgressRow[]);
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Analytics (admin)                                                   */
/* ------------------------------------------------------------------ */

export interface EnrollmentLite {
  email: string;
  course_slug: string;
  source: string;
  created_at: string;
}

export async function fetchAllEnrollments(): Promise<EnrollmentLite[]> {
  const db = await getClient();
  if (!db) return [];
  try {
    const { data, error } = await db
      .from("enrollments")
      .select("email, course_slug, source, created_at")
      .limit(5000);
    return error || !data ? [] : (data as EnrollmentLite[]);
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Live classes (admin-scheduled)                                      */
/* ------------------------------------------------------------------ */

export interface LiveClassRow {
  id: string;
  title: string;
  course_slug: string;
  teacher_id: string;
  starts_at: string;
  duration_min: number;
  level: string;
  enrolled: number;
  created_at?: string;
}

export async function fetchLiveClassesDb(): Promise<LiveClassRow[]> {
  const db = await getClient();
  if (!db) return [];
  try {
    const { data, error } = await db.from("live_classes").select("*").order("starts_at");
    return error || !data ? [] : (data as LiveClassRow[]);
  } catch {
    return [];
  }
}

export async function createLiveClassDb(row: Omit<LiveClassRow, "created_at">): Promise<{ ok: boolean; error?: string }> {
  const db = await getClient();
  if (!db) return { ok: false, error: "Supabase isn't configured." };
  try {
    const { error } = await db.from("live_classes").insert(row);
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create class." };
  }
}

export async function updateLiveClassDb(id: string, patch: Partial<LiveClassRow>): Promise<{ ok: boolean; error?: string }> {
  const db = await getClient();
  if (!db) return { ok: false, error: "Supabase isn't configured." };
  try {
    const { error } = await db.from("live_classes").update(patch).eq("id", id);
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update class." };
  }
}

export async function deleteLiveClassDb(id: string): Promise<{ ok: boolean; error?: string }> {
  const db = await getClient();
  if (!db) return { ok: false, error: "Supabase isn't configured." };
  try {
    const { error } = await db.from("live_classes").delete().eq("id", id);
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete class." };
  }
}

/* ------------------------------------------------------------------ */
/* Course settings (visibility + price overrides)                      */
/* ------------------------------------------------------------------ */

export interface CourseSettingRow {
  course_slug: string;
  hidden: boolean;
  price_override: number | null;
}

export async function fetchCourseSettings(): Promise<CourseSettingRow[]> {
  const db = await getClient();
  if (!db) return [];
  try {
    const { data, error } = await db.from("course_settings").select("*");
    return error || !data ? [] : (data as CourseSettingRow[]);
  } catch {
    return [];
  }
}

export async function upsertCourseSetting(row: CourseSettingRow): Promise<{ ok: boolean; error?: string }> {
  const db = await getClient();
  if (!db) return { ok: false, error: "Supabase isn't configured." };
  try {
    const { error } = await db.from("course_settings").upsert(row, { onConflict: "course_slug" });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save." };
  }
}

/* ------------------------------------------------------------------ */
/* Coupons                                                             */
/* ------------------------------------------------------------------ */

export interface CouponRow {
  code: string;
  kind: "percent" | "flat";
  value: number;
  active: boolean;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  created_at?: string;
}

export async function fetchCoupons(): Promise<CouponRow[]> {
  const db = await getClient();
  if (!db) return [];
  try {
    const { data, error } = await db.from("coupons").select("*").order("created_at", { ascending: false });
    return error || !data ? [] : (data as CouponRow[]);
  } catch {
    return [];
  }
}

export async function createCoupon(row: Omit<CouponRow, "used_count" | "created_at">): Promise<{ ok: boolean; error?: string }> {
  const db = await getClient();
  if (!db) return { ok: false, error: "Supabase isn't configured." };
  try {
    const { error } = await db.from("coupons").insert({ ...row, used_count: 0 });
    if (error) {
      if (/duplicate/i.test(error.message)) return { ok: false, error: "A coupon with this code already exists." };
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create coupon." };
  }
}

export async function setCouponActive(code: string, active: boolean): Promise<{ ok: boolean; error?: string }> {
  const db = await getClient();
  if (!db) return { ok: false, error: "Supabase isn't configured." };
  try {
    const { error } = await db.from("coupons").update({ active }).eq("code", code);
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}

export async function deleteCoupon(code: string): Promise<{ ok: boolean; error?: string }> {
  const db = await getClient();
  if (!db) return { ok: false, error: "Supabase isn't configured." };
  try {
    const { error } = await db.from("coupons").delete().eq("code", code);
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed." };
  }
}

/**
 * Validate a coupon for checkout. Returns the discount in rupees for the
 * given amount, or an error string. Falls back to null when the coupons
 * table isn't available (checkout then uses the built-in demo codes).
 */
export async function validateCoupon(
  code: string,
  amount: number
): Promise<{ ok: true; discount: number; code: string } | { ok: false; error: string } | null> {
  const db = await getClient();
  if (!db) return null;
  try {
    const { data, error } = await db.from("coupons").select("*").eq("code", code.toUpperCase()).maybeSingle();
    if (error) return null; // table missing → fallback
    if (!data) return { ok: false, error: "That coupon code doesn't exist." };
    const c = data as CouponRow;
    if (!c.active) return { ok: false, error: "This coupon is no longer active." };
    if (c.expires_at && new Date(c.expires_at).getTime() < Date.now()) {
      return { ok: false, error: "This coupon has expired." };
    }
    if (c.max_uses !== null && c.used_count >= c.max_uses) {
      return { ok: false, error: "This coupon has reached its usage limit." };
    }
    const discount = c.kind === "percent" ? Math.round((amount * c.value) / 100) : Math.min(c.value, amount);
    return { ok: true, discount, code: c.code };
  } catch {
    return null;
  }
}

export async function recordCouponUse(code: string): Promise<void> {
  const db = await getClient();
  if (!db) return;
  try {
    const { data } = await db.from("coupons").select("used_count").eq("code", code).maybeSingle();
    if (data) await db.from("coupons").update({ used_count: (data.used_count as number) + 1 }).eq("code", code);
  } catch {}
}

/* ------------------------------------------------------------------ */
/* Teachers (admin-managed: overrides for built-ins + custom teachers) */
/* ------------------------------------------------------------------ */

export interface TeacherRowDb {
  id: string;
  slug: string;
  name: string;
  title: string;
  bio: string;
  long_bio: string;
  specialties: string; // comma-separated
  gradient: string;
  featured: boolean;
  hidden: boolean;
  created_at?: string;
}

export async function fetchTeachersDb(): Promise<TeacherRowDb[]> {
  const db = await getClient();
  if (!db) return [];
  try {
    const { data, error } = await db.from("teachers").select("*").order("created_at");
    return error || !data ? [] : (data as TeacherRowDb[]);
  } catch {
    return [];
  }
}

export async function upsertTeacherDb(row: Omit<TeacherRowDb, "created_at">): Promise<{ ok: boolean; error?: string }> {
  const db = await getClient();
  if (!db) return { ok: false, error: "Supabase isn't configured." };
  try {
    const { error } = await db.from("teachers").upsert(row, { onConflict: "id" });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save teacher." };
  }
}

export async function deleteTeacherDb(id: string): Promise<{ ok: boolean; error?: string }> {
  const db = await getClient();
  if (!db) return { ok: false, error: "Supabase isn't configured." };
  try {
    const { error } = await db.from("teachers").delete().eq("id", id);
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete teacher." };
  }
}

/* ------------------------------------------------------------------ */
/* Custom courses (created in the admin panel)                         */
/* ------------------------------------------------------------------ */

export interface CustomLessonJson {
  title: string;
  durationMin: number;
  videoUrl?: string;
  free?: boolean;
  type?: "video" | "quiz" | "assignment";
}

export interface CustomModuleJson {
  title: string;
  lessons: CustomLessonJson[];
}

export interface CustomCourseRow {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  level: string;
  language: string;
  price: number;
  original_price: number;
  teacher_id: string;
  outcomes: string; // newline-separated
  includes: string; // newline-separated
  modules_json: CustomModuleJson[];
  gradient: string;
  icon: string;
  /** optional uploaded cover image URL */
  thumbnail: string;
  hidden: boolean;
  /** show on the homepage "Featured courses" section */
  featured: boolean;
  created_at?: string;
}

export async function fetchCustomCourses(): Promise<CustomCourseRow[]> {
  const db = await getClient();
  if (!db) return [];
  try {
    const { data, error } = await db.from("courses_custom").select("*").order("created_at");
    return error || !data ? [] : (data as CustomCourseRow[]);
  } catch {
    return [];
  }
}

export async function upsertCustomCourse(row: Omit<CustomCourseRow, "created_at">): Promise<{ ok: boolean; error?: string }> {
  const db = await getClient();
  if (!db) return { ok: false, error: "Supabase isn't configured." };
  try {
    const { error } = await db.from("courses_custom").upsert(row, { onConflict: "slug" });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save course." };
  }
}

export async function deleteCustomCourse(slug: string): Promise<{ ok: boolean; error?: string }> {
  const db = await getClient();
  if (!db) return { ok: false, error: "Supabase isn't configured." };
  try {
    const { error } = await db.from("courses_custom").delete().eq("slug", slug);
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete course." };
  }
}

/* ------------------------------------------------------------------ */
/* Community: threads, replies, groups, announcements                  */
/* ------------------------------------------------------------------ */

export interface ThreadRow {
  id: string;
  title: string;
  body: string;
  tag: string;
  author_name: string;
  author_email: string;
  pinned: boolean;
  likes: number;
  reply_count: number;
  created_at: string;
}

export interface PostRow {
  id: string;
  thread_id: string;
  author_name: string;
  author_email: string;
  text: string;
  created_at: string;
}

export interface GroupRow {
  id: string;
  name: string;
  description: string;
  members: number;
  created_at?: string;
}

export interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  href: string | null;
  active: boolean;
  created_at?: string;
}

export async function fetchThreads(): Promise<ThreadRow[]> {
  const db = await getClient();
  if (!db) return [];
  try {
    const { data, error } = await db
      .from("community_threads")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);
    return error || !data ? [] : (data as ThreadRow[]);
  } catch {
    return [];
  }
}

export async function fetchThread(id: string): Promise<ThreadRow | null> {
  const db = await getClient();
  if (!db) return null;
  try {
    const { data, error } = await db.from("community_threads").select("*").eq("id", id).maybeSingle();
    return error || !data ? null : (data as ThreadRow);
  } catch {
    return null;
  }
}

export async function createThread(
  title: string,
  body: string,
  tag: string,
  authorName: string,
  authorEmail: string
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const db = await getClient();
  if (!db) return { ok: false, error: "Supabase isn't configured." };
  try {
    const id = crypto.randomUUID();
    const { error } = await db.from("community_threads").insert({
      id, title, body, tag, author_name: authorName, author_email: authorEmail,
      pinned: false, likes: 0, reply_count: 0,
    });
    return error ? { ok: false, error: error.message } : { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to post." };
  }
}

export async function fetchPosts(threadId: string): Promise<PostRow[]> {
  const db = await getClient();
  if (!db) return [];
  try {
    const { data, error } = await db
      .from("community_posts").select("*").eq("thread_id", threadId).order("created_at");
    return error || !data ? [] : (data as PostRow[]);
  } catch {
    return [];
  }
}

export async function addPost(threadId: string, authorName: string, authorEmail: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const db = await getClient();
  if (!db) return { ok: false, error: "Supabase isn't configured." };
  try {
    const { error } = await db.from("community_posts").insert({
      id: crypto.randomUUID(), thread_id: threadId, author_name: authorName, author_email: authorEmail, text,
    });
    if (error) return { ok: false, error: error.message };
    const { data } = await db.from("community_threads").select("reply_count").eq("id", threadId).maybeSingle();
    if (data) await db.from("community_threads").update({ reply_count: (data.reply_count as number) + 1 }).eq("id", threadId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to reply." };
  }
}

export async function likeThread(id: string): Promise<void> {
  const db = await getClient();
  if (!db) return;
  try {
    const { data } = await db.from("community_threads").select("likes").eq("id", id).maybeSingle();
    if (data) await db.from("community_threads").update({ likes: (data.likes as number) + 1 }).eq("id", id);
  } catch {}
}

export async function setThreadPinned(id: string, pinned: boolean): Promise<void> {
  const db = await getClient();
  if (!db) return;
  try {
    await db.from("community_threads").update({ pinned }).eq("id", id);
  } catch {}
}

export async function deleteThread(id: string): Promise<{ ok: boolean; error?: string }> {
  const db = await getClient();
  if (!db) return { ok: false, error: "Supabase isn't configured." };
  try {
    await db.from("community_posts").delete().eq("thread_id", id);
    const { error } = await db.from("community_threads").delete().eq("id", id);
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete." };
  }
}

export async function fetchGroups(): Promise<GroupRow[]> {
  const db = await getClient();
  if (!db) return [];
  try {
    const { data, error } = await db.from("community_groups").select("*").order("created_at");
    return error || !data ? [] : (data as GroupRow[]);
  } catch {
    return [];
  }
}

export async function upsertGroup(row: Omit<GroupRow, "created_at">): Promise<{ ok: boolean; error?: string }> {
  const db = await getClient();
  if (!db) return { ok: false, error: "Supabase isn't configured." };
  try {
    const { error } = await db.from("community_groups").upsert(row, { onConflict: "id" });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save group." };
  }
}

export async function deleteGroup(id: string): Promise<void> {
  const db = await getClient();
  if (!db) return;
  try {
    await db.from("community_groups").delete().eq("id", id);
  } catch {}
}

export async function fetchAnnouncements(): Promise<AnnouncementRow[]> {
  const db = await getClient();
  if (!db) return [];
  try {
    const { data, error } = await db.from("announcements").select("*").order("created_at", { ascending: false });
    return error || !data ? [] : (data as AnnouncementRow[]);
  } catch {
    return [];
  }
}

export async function fetchActiveAnnouncement(): Promise<AnnouncementRow | null> {
  const db = await getClient();
  if (!db) return null;
  try {
    const { data, error } = await db
      .from("announcements").select("*").eq("active", true)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    return error || !data ? null : (data as AnnouncementRow);
  } catch {
    return null;
  }
}

export async function upsertAnnouncement(row: Omit<AnnouncementRow, "created_at">): Promise<{ ok: boolean; error?: string }> {
  const db = await getClient();
  if (!db) return { ok: false, error: "Supabase isn't configured." };
  try {
    const { error } = await db.from("announcements").upsert(row, { onConflict: "id" });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save." };
  }
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const db = await getClient();
  if (!db) return;
  try {
    await db.from("announcements").delete().eq("id", id);
  } catch {}
}
