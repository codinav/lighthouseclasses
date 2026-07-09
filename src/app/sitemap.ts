import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/data";

const BASE = "https://lighthouseclasses.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    "",
    "/courses",
    "/platts",
    "/teachers",
    "/live",
    "/pricing",
    "/community",
    "/about",
    "/blog",
    "/careers",
    "/contact",
    "/faq",
    "/support",
    "/privacy",
    "/terms",
    "/refund",
    "/certificates/verify",
  ].map((path) => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const posts = BLOG_POSTS.map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...staticPages, ...posts];
}
