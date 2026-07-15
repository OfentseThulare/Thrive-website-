import "server-only";

import { cache } from "react";

import {
  resolvePublishedPage,
  type PublishedPageRow,
  type PublishedPageSource,
  type PublishedVersionRow,
} from "./published-page";
import { seedPages } from "./seed";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const getPublishedPage = cache(async function getPublishedPage(slug: string) {
  const supabase = await createServerSupabaseClient();

  const source: PublishedPageSource | null = supabase
    ? {
        async getPublishedPage(pageSlug) {
          const { data, error } = await supabase
            .from("pages")
            .select("slug,published_version_id")
            .eq("slug", pageSlug)
            .eq("status", "published")
            .single<PublishedPageRow>();

          return { data, error: error ? { code: error.code } : null };
        },
        async getPublishedVersion(versionId) {
          const { data, error } = await supabase
            .from("page_versions")
            .select("snapshot")
            .eq("id", versionId)
            .single<PublishedVersionRow>();

          return { data, error: error ? { code: error.code } : null };
        },
      }
    : null;

  return resolvePublishedPage({ slug, source, seedPages });
});
