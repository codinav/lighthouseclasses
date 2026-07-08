import { NextResponse } from "next/server";
import { COURSES } from "@/lib/data";

/**
 * GET /api/courses?q=&category=&level=&limit=
 * Public course catalog. In production this queries Postgres via Prisma with
 * cursor pagination and a search index — see docs/API.md for the full contract.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.toLowerCase() ?? "";
  const category = searchParams.get("category");
  const level = searchParams.get("level");
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);

  let results = COURSES;
  if (q) results = results.filter((c) => [c.title, c.subtitle, c.category, ...c.tags].join(" ").toLowerCase().includes(q));
  if (category) results = results.filter((c) => c.category === category);
  if (level) results = results.filter((c) => c.level === level);

  return NextResponse.json({
    data: results.slice(0, limit).map(({ modules: _modules, ...course }) => course),
    meta: { total: results.length, limit },
  });
}
