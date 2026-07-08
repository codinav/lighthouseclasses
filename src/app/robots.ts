import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/admin", "/learn", "/quiz", "/checkout", "/api"],
      },
    ],
    sitemap: "https://lighthouseclasses.com/sitemap.xml",
  };
}
