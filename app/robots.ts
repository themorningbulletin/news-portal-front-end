import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/*/admin", "/*/account", "/*/login", "/*/search", "/*/newsletter/"],
      },
    ],
    sitemap: [`${SITE_URL}/sitemap.xml`, ...(process.env.NEWS_SITEMAP_ENABLED === "true" ? [`${SITE_URL}/news-sitemap.xml`] : [])],
    host: SITE_URL,
  };
}
