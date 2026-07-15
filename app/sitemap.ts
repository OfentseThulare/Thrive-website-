import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/env";
import { publicRoutes } from "@/lib/site-routes";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  return publicRoutes.map((route) => ({
    url: new URL(route.path, base).toString(),
    changeFrequency: "monthly",
    priority: route.priority,
  }));
}
