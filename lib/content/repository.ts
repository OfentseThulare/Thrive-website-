import "server-only";

import { pageContentSchema, type PageContent } from "./contracts";
import { seedPages } from "./seed";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageRow = {
  slug: string;
  published_version_id: string;
};

type VersionRow = {
  snapshot: unknown;
};

export async function getPublishedPage(slug: string): Promise<PageContent | null> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return seedPages.get(slug) ?? null;
  }

  const { data: page, error: pageError } = await supabase
    .from("pages")
    .select("slug,published_version_id")
    .eq("slug", slug)
    .eq("status", "published")
    .single<PageRow>();

  if (pageError) {
    if (pageError.code === "PGRST116") return null;
    throw new Error(`Published page query failed: ${pageError.code}`);
  }

  const { data: version, error: versionError } = await supabase
    .from("page_versions")
    .select("snapshot")
    .eq("id", page.published_version_id)
    .single<VersionRow>();

  if (versionError) {
    throw new Error(`Published page version query failed: ${versionError.code}`);
  }

  const publishedPage = pageContentSchema.parse(version.snapshot);

  if (publishedPage.slug !== page.slug || publishedPage.status !== "published") {
    throw new Error("Published page snapshot does not match its route or publication state.");
  }

  return publishedPage;
}
