import type { MetadataRoute } from "next";

import { siteConfig, siteUrl } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/favicon.ico", "/exam-format", "/diagnostic"],
      disallow: [
        "/admin/",
        "/api/",
        "/auth/",
        "/bookmarks",
        "/dashboard",
        "/diagnostic/result",
        "/diagnostic/take",
        "/forgot-password",
        "/login",
        "/mistakes",
        "/onboarding/",
        "/practice",
        "/profile",
        "/progress",
        "/register",
        "/reset-password",
        "/results",
        "/tests",
      ],
    },
    sitemap: siteUrl("/sitemap.xml"),
    host: siteConfig.url,
  };
}
