import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/exam-format", "/diagnostic", "/privacy"].map((path) => ({
    url: siteUrl(path),
  }));
}
