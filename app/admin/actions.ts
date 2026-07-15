"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";

import { getSiteUrl } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCmsIdentity } from "@/lib/cms/auth";
import type { CmsActionState } from "@/lib/cms/action-state";
import { safeCmsError } from "@/lib/cms/action-state";
import {
  auditRoles,
  contentRoles,
  publishingRoles,
  requireCmsRole,
} from "@/lib/cms/permissions";
import {
  assetMetadataSchema,
  contentPublicationInputSchema,
  deleteSectionInputSchema,
  navigationInputSchema,
  navigationPublicationInputSchema,
  pageDraftInputSchema,
  publishPageInputSchema,
  restoreVersionInputSchema,
  reusableEntryInputSchema,
  roleManagementInputSchema,
  sectionInputSchema,
  validateAssetFile,
} from "@/lib/cms/schemas";
import { seedPages } from "@/lib/content/seed";

function values(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

async function authorisedClient(roles: Parameters<typeof requireCmsRole>[1]) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("CMS_NOT_CONFIGURED");
  const identity = await getCmsIdentity();
  if (!identity) throw new Error("CMS_UNAUTHENTICATED");
  requireCmsRole(identity.roles, roles);
  if (
    process.env.NODE_ENV === "production"
    && identity.roles.some((role) => role === "owner" || role === "publisher")
  ) {
    const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError || assurance.currentLevel !== "aal2") throw new Error("CMS_MFA_REQUIRED");
  }
  return { supabase, identity };
}

async function audit(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  afterData?: Record<string, unknown>,
) {
  if (!supabase) throw new Error("CMS_NOT_CONFIGURED");
  const { error } = await supabase.rpc("record_content_audit", {
    event_action: action,
    event_entity_type: entityType,
    event_entity_id: entityId,
    event_after_data: afterData ?? null,
  });
  if (error) throw new Error("CMS_AUDIT_FAILED");
}

export async function signInAction(
  _previous: CmsActionState,
  formData: FormData,
): Promise<CmsActionState> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { status: "error", message: "The secure admin service is not configured yet." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
    return { status: "error", message: "Enter a valid email address and password." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { status: "error", message: "Those sign-in details could not be verified." };
  redirect("/admin");
}

export async function requestMagicLinkAction(
  _previous: CmsActionState,
  formData: FormData,
): Promise<CmsActionState> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { status: "error", message: "The secure admin service is not configured yet." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { status: "error", message: "Enter a valid email address." };
  await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: new URL("/auth/callback?next=/admin", getSiteUrl()).toString() },
  });
  return { status: "success", message: "If that address is authorised, a secure sign-in link is on its way." };
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function savePageDraftAction(
  _previous: CmsActionState,
  formData: FormData,
): Promise<CmsActionState> {
  try {
    const input = pageDraftInputSchema.parse(values(formData));
    const { supabase, identity } = await authorisedClient(contentRoles);
    const { error } = await supabase.from("page_drafts").upsert({
      page_id: input.pageId,
      title: input.title,
      description: input.description,
      seo: {
        title: input.metaTitle || null,
        description: input.metaDescription || null,
        canonicalPath: input.canonicalPath || null,
        noIndex: input.noIndex,
      },
      visible: input.visible,
      updated_by: identity.userId,
    });
    if (error) throw new Error("CMS_PAGE_DRAFT_SAVE_FAILED");
    await audit(supabase, identity.userId, "page.draft_updated", "page", input.pageId);
    revalidatePath(`/admin/pages/${input.pageId}`);
    return { status: "success", message: "Draft settings saved. The public page has not changed." };
  } catch (error) {
    return safeCmsError(error);
  }
}

export async function saveSectionAction(
  _previous: CmsActionState,
  formData: FormData,
): Promise<CmsActionState> {
  try {
    const input = sectionInputSchema.parse(values(formData));
    const { supabase, identity } = await authorisedClient(contentRoles);
    const record = {
      page_slug: input.pageSlug,
      block_type: input.content.blockType,
      schema_version: 1,
      position: input.position,
      visible: input.visible,
      variant: input.variant,
      content: input.content,
      updated_by: identity.userId,
      ...(input.sectionId ? {} : { created_by: identity.userId }),
    };
    const mutation = input.sectionId
      ? supabase.from("sections").update(record).eq("id", input.sectionId)
      : supabase.from("sections").insert(record);
    const { error } = await mutation;
    if (error) throw new Error("CMS_SECTION_SAVE_FAILED");
    await audit(supabase, identity.userId, "section.draft_saved", "page", input.pageSlug, {
      sectionId: input.sectionId ?? "new",
      blockType: input.content.blockType,
    });
    revalidatePath(`/admin/preview/${input.pageSlug}`);
    return { status: "success", message: "Section draft saved. Preview it before publishing." };
  } catch (error) {
    return safeCmsError(error);
  }
}

export async function deleteSectionAction(formData: FormData) {
  const input = deleteSectionInputSchema.parse(values(formData));
  const { supabase, identity } = await authorisedClient(contentRoles);
  const { error } = await supabase.from("sections").delete().eq("id", input.sectionId);
  if (error) throw new Error("CMS_SECTION_DELETE_FAILED");
  await audit(supabase, identity.userId, "section.draft_deleted", "section", input.sectionId);
  revalidatePath(`/admin/preview/${input.pageSlug}`);
}

export async function publishPageAction(
  _previous: CmsActionState,
  formData: FormData,
): Promise<CmsActionState> {
  try {
    const input = publishPageInputSchema.parse(values(formData));
    const { supabase } = await authorisedClient(publishingRoles);
    const { error } = await supabase.rpc("publish_page", {
      target_page_id: input.pageId,
      expected_snapshot: input.expectedSnapshot,
      change_summary: input.changeSummary || null,
    });
    if (error) throw new Error("CMS_PUBLISH_FAILED");
    revalidatePath("/", "layout");
    revalidatePath("/sitemap.xml");
    return { status: "success", message: "The validated revision is now live." };
  } catch (error) {
    return safeCmsError(error);
  }
}

export async function restoreVersionAction(formData: FormData) {
  const input = restoreVersionInputSchema.parse(values(formData));
  const { supabase } = await authorisedClient(publishingRoles);
  const { error } = await supabase.rpc("restore_page_version", {
    target_page_id: input.pageId,
    target_version_id: input.versionId,
  });
  if (error) throw new Error("CMS_RESTORE_FAILED");
  revalidatePath("/", "layout");
}

export async function saveReusableEntryAction(
  _previous: CmsActionState,
  formData: FormData,
): Promise<CmsActionState> {
  try {
    const input = reusableEntryInputSchema.parse(values(formData));
    const { supabase, identity } = await authorisedClient(contentRoles);
    const record = {
      entry_type: input.entryType,
      key: input.key,
      status: "draft" as const,
      content: input.content,
      updated_by: identity.userId,
      ...(input.entryId ? {} : { created_by: identity.userId }),
    };
    const mutation = input.entryId
      ? supabase.from("reusable_entries").update(record).eq("id", input.entryId)
      : supabase.from("reusable_entries").insert(record);
    const { error } = await mutation;
    if (error) throw new Error("CMS_ENTRY_SAVE_FAILED");
    await audit(supabase, identity.userId, "reusable_entry.draft_saved", "reusable_entry", input.entryId ?? input.key);
    revalidatePath("/admin/reusable");
    return { status: "success", message: "Reusable draft saved." };
  } catch (error) {
    return safeCmsError(error);
  }
}

export async function saveNavigationAction(
  _previous: CmsActionState,
  formData: FormData,
): Promise<CmsActionState> {
  try {
    const input = navigationInputSchema.parse(values(formData));
    const { supabase, identity } = await authorisedClient(contentRoles);
    const record = { ...input, itemId: undefined } as Record<string, unknown>;
    delete record.itemId;
    Object.assign(record, { status: "draft", visible: false });
    const dbRecord = {
      location: input.location,
      label: input.label,
      href: input.href,
      position: input.position,
      status: "draft" as const,
      visible: false,
    };
    const mutation = input.itemId
      ? supabase.from("navigation_items").update(dbRecord).eq("id", input.itemId)
      : supabase.from("navigation_items").insert(dbRecord);
    const { error } = await mutation;
    if (error) throw new Error("CMS_NAVIGATION_SAVE_FAILED");
    await audit(supabase, identity.userId, "navigation.draft_saved", "navigation_item", input.itemId ?? input.href);
    revalidatePath("/admin/navigation");
    return { status: "success", message: "Navigation draft saved. A publisher must make it live." };
  } catch (error) {
    return safeCmsError(error);
  }
}

export async function publishNavigationAction(formData: FormData) {
  const input = navigationPublicationInputSchema.parse(values(formData));
  const { supabase } = await authorisedClient(publishingRoles);
  const { error } = await supabase.rpc("set_navigation_publication", {
    target_item_id: input.itemId,
    make_public: input.makePublic,
  });
  if (error) throw new Error("CMS_NAVIGATION_PUBLISH_FAILED");
  revalidatePath("/", "layout");
}

export async function uploadAssetAction(
  _previous: CmsActionState,
  formData: FormData,
): Promise<CmsActionState> {
  try {
    const metadata = assetMetadataSchema.parse(values(formData));
    const rawFile = formData.get("file");
    if (!(rawFile instanceof File)) throw new Error("CMS_ASSET_MISSING");
    const file = validateAssetFile(rawFile);
    const { supabase, identity } = await authorisedClient(contentRoles);
    const extensionByMime: Record<string, string> = {
      "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "application/pdf": "pdf",
    };
    const extension = extensionByMime[file.type];
    const storagePath = `${identity.userId}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("site-assets").upload(storagePath, rawFile, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) throw new Error("CMS_ASSET_UPLOAD_FAILED");
    const { error: metadataError } = await supabase.from("assets").insert({
      storage_path: storagePath,
      filename: file.name,
      mime_type: file.type,
      byte_size: file.size,
      alt_text: metadata.decorative ? "Decorative image" : metadata.altText,
      focal_point: { x: metadata.focalX, y: metadata.focalY },
      source_url: metadata.sourceUrl || null,
      photographer: metadata.photographer || null,
      licence_source: metadata.licenceSource || null,
      source_identifier: metadata.sourceIdentifier || null,
      restrictions: metadata.restrictions || null,
      status: "draft",
      created_by: identity.userId,
    });
    if (metadataError) {
      await supabase.storage.from("site-assets").remove([storagePath]);
      throw new Error("CMS_ASSET_METADATA_FAILED");
    }
    await audit(supabase, identity.userId, "asset.draft_uploaded", "asset", storagePath, { mimeType: file.type, byteSize: file.size });
    revalidatePath("/admin/assets");
    return { status: "success", message: "Asset uploaded privately. It is not public until approved." };
  } catch (error) {
    return safeCmsError(error);
  }
}

export async function manageRoleAction(formData: FormData) {
  const input = roleManagementInputSchema.parse(values(formData));
  const { supabase } = await authorisedClient(["owner"]);
  const { error } = await supabase.rpc("manage_user_role", {
    target_user_id: input.userId,
    target_role: input.role,
    grant_role: input.operation === "grant",
  });
  if (error) throw new Error("CMS_ROLE_MANAGEMENT_FAILED");
  revalidatePath("/admin/roles");
}

export async function setContentPublicationAction(formData: FormData) {
  const input = contentPublicationInputSchema.parse(values(formData));
  const { supabase, identity } = await authorisedClient(publishingRoles);
  const table = input.entity === "asset" ? "assets" : "reusable_entries";
  const status = input.makePublic ? "published" : "draft";
  const update = input.entity === "asset" ? { status } : { status, updated_by: identity.userId };
  const { error } = await supabase.from(table).update(update).eq("id", input.entityId);
  if (error) throw new Error("CMS_PUBLICATION_STATE_FAILED");
  await audit(supabase, identity.userId, `${input.entity}.status_changed`, input.entity, input.entityId, { status });
  revalidatePath("/", "layout");
  revalidatePath(input.entity === "asset" ? "/admin/assets" : "/admin/reusable");
}

export async function initialiseCmsContentAction() {
  const { supabase, identity } = await authorisedClient(["owner"]);
  const { data: existingPages, error: existingError } = await supabase.from("pages").select("slug");
  if (existingError) throw new Error("CMS_SEED_LOOKUP_FAILED");
  const existingSlugs = new Set((existingPages ?? []).map((page) => page.slug));
  let importedCount = 0;
  for (const page of seedPages.values()) {
    if (existingSlugs.has(page.slug)) continue;
    const { data: inserted, error: pageError } = await supabase.from("pages").insert({
      slug: page.slug,
      title: page.title,
      description: page.description,
      status: "draft",
      created_by: identity.userId,
      updated_by: identity.userId,
    }).select("id").single();
    if (pageError || !inserted) throw new Error("CMS_SEED_PAGE_FAILED");
    const { error: draftError } = await supabase.from("page_drafts").insert({
      page_id: inserted.id,
      title: page.title,
      description: page.description,
      seo: {},
      visible: true,
      updated_by: identity.userId,
    });
    if (draftError) throw new Error("CMS_SEED_DRAFT_FAILED");
    const { error: sectionError } = await supabase.from("sections").insert(page.sections.map((content, position) => ({
      page_slug: page.slug,
      block_type: content.blockType,
      schema_version: 1,
      position,
      visible: true,
      variant: "default",
      content,
      created_by: identity.userId,
      updated_by: identity.userId,
    })));
    if (sectionError) throw new Error("CMS_SEED_SECTION_FAILED");
    importedCount += 1;
  }
  await audit(supabase, identity.userId, "cms.seed_imported", "cms", "initial-content", { pageCount: importedCount });
  revalidatePath("/admin", "layout");
}

export async function assertAuditAccessAction() {
  await authorisedClient(auditRoles);
}
