/**
 * Admin course controls (visibility + price overrides), cached per page load.
 * Applied client-side across catalog, course pages, and checkout — the
 * static build's defaults remain the fallback.
 */
import { fetchCourseSettings, type CourseSettingRow } from "./db";

let cache: Map<string, CourseSettingRow> | null = null;

export async function getCourseSettings(): Promise<Map<string, CourseSettingRow>> {
  if (cache) return cache;
  const rows = await fetchCourseSettings();
  cache = new Map(rows.map((r) => [r.course_slug, r]));
  return cache;
}

export function invalidateCourseSettings() {
  cache = null;
}

export function effectivePrice(slug: string, basePrice: number, map: Map<string, CourseSettingRow>): number {
  const s = map.get(slug);
  return s?.price_override != null && s.price_override > 0 ? s.price_override : basePrice;
}

export function isHidden(slug: string, map: Map<string, CourseSettingRow>): boolean {
  return map.get(slug)?.hidden === true;
}
