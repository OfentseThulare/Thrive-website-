import "server-only";

import { contentBlockSchema, pageSeoSchema } from "@/lib/content/contracts";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildDraftPreview, buildPublishedSnapshot } from "./snapshot";

export async function requireCmsDatabase() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("CMS_NOT_CONFIGURED");
  return supabase;
}

export async function getAdminPageDraft(pageId: string) {
  const supabase = await requireCmsDatabase();
  const { data: page, error } = await supabase
    .from("pages")
    .select("id,slug,title,description,status,published_version_id,published_at,page_drafts(title,description,seo,visible,updated_at),sections(id,block_type,position,visible,variant,content,updated_at)")
    .eq("id", pageId)
    .single();
  if (error || !page) return null;

  const draftValue = Array.isArray(page.page_drafts) ? page.page_drafts[0] : page.page_drafts;
  const draft = draftValue ?? {
    title: page.title,
    description: page.description,
    seo: {},
    visible: page.status === "published",
    updated_at: null,
  };
  const sections = [...(page.sections ?? [])].sort((a, b) => a.position - b.position);

  return { ...page, draft, sections };
}

export async function getDraftPreview(slug: string) {
  const supabase = await requireCmsDatabase();
  const { data: page, error } = await supabase
    .from("pages")
    .select("id,slug,title,description,page_drafts(title,description),sections(content,position,visible)")
    .eq("slug", slug)
    .single();
  if (error || !page) return null;
  const draftValue = Array.isArray(page.page_drafts) ? page.page_drafts[0] : page.page_drafts;
  const draft = draftValue ?? { title: page.title, description: page.description };
  const sections = (page.sections ?? [])
    .filter((section) => section.visible)
    .sort((a, b) => a.position - b.position)
    .map((section) => contentBlockSchema.parse(section.content));

  return buildDraftPreview({ slug: page.slug, title: draft.title, description: draft.description, sections });
}

export async function getExpectedPublishedSnapshot(pageId: string) {
  const page = await getAdminPageDraft(pageId);
  if (!page) return null;
  const sections = page.sections
    .filter((section) => section.visible)
    .map((section) => contentBlockSchema.parse(section.content));
  return buildPublishedSnapshot({
    slug: page.slug,
    title: page.draft.title,
    description: page.draft.description,
    seo: pageSeoSchema.parse(page.draft.seo),
    sections,
  });
}
