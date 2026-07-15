import "server-only";

import { pageContentSchema, type ContentBlock, type PageContent } from "./contracts";
import { seedPages } from "./seed";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageRow = {
  slug: string;
  title: string;
  description: string;
  status: "draft" | "published";
};

type SectionRow = {
  block_type: ContentBlock["blockType"];
  content: Record<string, unknown>;
};

export async function getPublishedPage(slug: string): Promise<PageContent | null> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return seedPages.get(slug) ?? null;
  }

  const { data: page, error: pageError } = await supabase
    .from("pages")
    .select("slug,title,description,status")
    .eq("slug", slug)
    .eq("status", "published")
    .single<PageRow>();

  if (pageError) {
    if (pageError.code === "PGRST116") return null;
    throw new Error(`Published page query failed: ${pageError.code}`);
  }

  const { data: sections, error: sectionError } = await supabase
    .from("sections")
    .select("block_type,content")
    .eq("page_slug", slug)
    .eq("visible", true)
    .order("position")
    .returns<SectionRow[]>();

  if (sectionError) {
    throw new Error(`Published section query failed: ${sectionError.code}`);
  }

  return pageContentSchema.parse({
    ...page,
    sections: (sections ?? []).map((section) => ({
      ...section.content,
      blockType: section.block_type,
    })),
  });
}
