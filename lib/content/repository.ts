import "server-only";

import { cache } from "react";

import {
  resolvePublishedPage,
  type PublishedPageRow,
  type PublishedPageSource,
  type PublishedVersionRow,
} from "./published-page";
import {
  resolveReusableCollections,
  type PublishedReusableSource,
} from "./reusable";
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

export const getPublishedPageView = cache(async function getPublishedPageView(slug: string) {
  const page = await getPublishedPage(slug);
  if (!page) return null;

  if (!page.sections.some((section) => section.blockType === "reusable_collection")) {
    return { page, reusableEntriesBySection: page.sections.map(() => []) };
  }

  const supabase = await createServerSupabaseClient();
  const source: PublishedReusableSource | null = supabase
    ? {
        async getPublishedEntries(entryTypes, keys) {
          const { data, error } = await supabase
            .from("reusable_entries")
            .select("key,entry_type,status,content")
            .eq("status", "published")
            .in("entry_type", [...entryTypes])
            .in("key", [...keys]);

          return { data, error: error ? { code: error.code } : null };
        },
      }
    : null;

  const reusableEntriesBySection = await resolveReusableCollections(page.sections, source);
  return { page, reusableEntriesBySection };
});
