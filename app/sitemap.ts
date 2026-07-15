import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  return [{ url: new URL("/", base).toString(), changeFrequency: "monthly", priority: 1 }];
}
