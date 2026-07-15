"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";

import { getSiteUrl } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCmsIdentity } from "@/lib/cms/auth";
import type { CmsActionState, MfaEnrolActionState } from "@/lib/cms/action-state";
import { safeCmsError } from "@/lib/cms/action-state";
import {
  auditRoles,
  contentRoles,
  publishingRoles,
  CmsMfaRequiredError,
  requireCmsRole,
} from "@/lib/cms/permissions";
import {
  assetMetadataSchema,
  contentPublicationInputSchema,
  deleteSectionInputSchema,
  mfaEnrolInputSchema,
  mfaFactorInputSchema,
  mfaUnenrolInputSchema,
  mfaVerifyInputSchema,
  navigationInputSchema,
  navigationPublicationInputSchema,
  pageDraftInputSchema,
  publishPageInputSchema,
  restoreVersionInputSchema,
  reusableEntryInputSchema,
  roleManagementInputSchema,
  revokeInvitationInputSchema,
  sectionInputSchema,
  staffInvitationInputSchema,
  validateAssetFile,
} from "@/lib/cms/schemas";
import { seedPages } from "@/lib/content/seed";

function values(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

async function authenticatedRoleClient(roles: Parameters<typeof requireCmsRole>[1]) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("CMS_NOT_CONFIGURED");
  const identity = await getCmsIdentity();
  if (!identity) throw new Error("CMS_UNAUTHENTICATED");
  requireCmsRole(identity.roles, roles);
  return { supabase, identity };
}

async function authorisedClient(roles: Parameters<typeof requireCmsRole>[1]) {
  const { supabase, identity } = await authenticatedRoleClient(roles);
  if (identity.roles.some((role) => role === "owner" || role === "publisher")) {
    const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError || assurance.currentLevel !== "aal2") throw new CmsMfaRequiredError();
  }
  return { supabase, identity };
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
    options: {
      emailRedirectTo: new URL("/auth/callback?next=/admin", getSiteUrl()).toString(),
      shouldCreateUser: true,
    },
  });
  return { status: "success", message: "If that address is authorised, a secure sign-in link is on its way." };
}

export async function signOutAction() {
  const supabase = await createServerSupabaseClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function enrolMfaAction(
  _previous: MfaEnrolActionState,
  formData: FormData,
): Promise<MfaEnrolActionState> {
  try {
    const input = mfaEnrolInputSchema.parse(values(formData));
    const { supabase } = await authenticatedRoleClient(publishingRoles);
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) throw new Error("CMS_MFA_FACTORS_FAILED");
    if ((factors?.all ?? []).some((factor) => factor.factor_type === "totp" && factor.status === "unverified")) {
      return {
        status: "error",
        message: "A pending authenticator setup already exists. Cancel it below before starting again.",
      };
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: input.friendlyName });
    if (error || !data.totp) throw new Error("CMS_MFA_ENROL_FAILED");
    return {
      status: "enrolment",
      message: "Scan the QR code, then enter the six-digit code to finish enrolment.",
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    };
  } catch (error) {
    return safeCmsError(error);
  }
}

export async function cancelPendingMfaAction(
  _previous: CmsActionState,
  formData: FormData,
): Promise<CmsActionState> {
  try {
    const input = mfaFactorInputSchema.parse(values(formData));
    const { supabase } = await authenticatedRoleClient(publishingRoles);
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    const pendingFactor = (factors?.all ?? []).find(
      (factor) => factor.id === input.factorId && factor.factor_type === "totp" && factor.status === "unverified",
    );
    if (factorsError || !pendingFactor) {
      return { status: "error", message: "That pending authenticator setup could not be verified." };
    }
    const { error } = await supabase.auth.mfa.unenroll({ factorId: pendingFactor.id });
    if (error) throw new Error("CMS_MFA_CANCEL_FAILED");
    revalidatePath("/admin/security");
    return { status: "success", message: "The pending authenticator setup was cancelled." };
  } catch (error) {
    return safeCmsError(error);
  }
}

export async function verifyMfaAction(
  _previous: CmsActionState,
  formData: FormData,
): Promise<CmsActionState> {
  try {
    const input = mfaVerifyInputSchema.parse(values(formData));
    const { supabase } = await authenticatedRoleClient(publishingRoles);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: input.factorId, code: input.code });
    if (error) return { status: "error", message: "That authenticator code could not be verified." };
    revalidatePath("/admin", "layout");
    return { status: "success", message: "Two-step verification is active for this session." };
  } catch (error) {
    return safeCmsError(error);
  }
}

export async function unenrolMfaAction(
  _previous: CmsActionState,
  formData: FormData,
): Promise<CmsActionState> {
  try {
    const input = mfaUnenrolInputSchema.parse(values(formData));
    const { supabase } = await authorisedClient(publishingRoles);
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    const verifiedFactor = (factors?.all ?? []).find(
      (factor) => factor.id === input.factorId && factor.factor_type === "totp" && factor.status === "verified",
    );
    if (factorsError || !verifiedFactor) {
      return { status: "error", message: "That verified authenticator could not be found." };
    }
    const { error } = await supabase.auth.mfa.unenroll({ factorId: verifiedFactor.id });
    if (error) throw new Error("CMS_MFA_UNENROL_FAILED");
    const { error: signOutError } = await supabase.auth.signOut({ scope: "global" });
    if (signOutError) throw new Error("CMS_MFA_SIGN_OUT_FAILED");
  } catch (error) {
    return safeCmsError(error);
  }
  redirect("/admin/login?reason=security-reset");
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
    const { data: saved, error } = await mutation.select("id").maybeSingle();
    if (error || !saved) throw new Error("CMS_SECTION_SAVE_FAILED");
    revalidatePath(`/admin/preview/${input.pageSlug}`);
    return { status: "success", message: "Section draft saved. Preview it before publishing." };
  } catch (error) {
    return safeCmsError(error);
  }
}

export async function deleteSectionAction(
  _previous: CmsActionState,
  formData: FormData,
): Promise<CmsActionState> {
  try {
    const input = deleteSectionInputSchema.parse(values(formData));
    const { supabase } = await authorisedClient(contentRoles);
    const { data: deleted, error } = await supabase.from("sections").delete().eq("id", input.sectionId).select("id").maybeSingle();
    if (error || !deleted) throw new Error("CMS_SECTION_DELETE_FAILED");
    revalidatePath(`/admin/preview/${input.pageSlug}`);
    return { status: "success", message: "Draft section removed." } satisfies CmsActionState;
  } catch (error) {
    return safeCmsError(error);
  }
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

export async function restoreVersionAction(
  _previous: CmsActionState,
  formData: FormData,
): Promise<CmsActionState> {
  try {
    const input = restoreVersionInputSchema.parse(values(formData));
    const { supabase } = await authorisedClient(publishingRoles);
    const { error } = await supabase.rpc("restore_page_version", {
      target_page_id: input.pageId,
      target_version_id: input.versionId,
    });
    if (error) throw new Error("CMS_RESTORE_FAILED");
    revalidatePath("/", "layout");
    return { status: "success", message: "The selected version is live." };
  } catch (error) {
    return safeCmsError(error);
  }
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
    const { data: saved, error } = await mutation.select("id").maybeSingle();
    if (error || !saved) throw new Error("CMS_ENTRY_SAVE_FAILED");
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
    const { supabase } = await authorisedClient(contentRoles);
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
    const { data: saved, error } = await mutation.select("id").maybeSingle();
    if (error || !saved) throw new Error("CMS_NAVIGATION_SAVE_FAILED");
    revalidatePath("/admin/navigation");
    return { status: "success", message: "Navigation draft saved. A publisher must make it live." };
  } catch (error) {
    return safeCmsError(error);
  }
}

export async function publishNavigationAction(
  _previous: CmsActionState,
  formData: FormData,
): Promise<CmsActionState> {
  try {
    const input = navigationPublicationInputSchema.parse(values(formData));
    const { supabase } = await authorisedClient(publishingRoles);
    const { error } = await supabase.rpc("set_navigation_publication", {
      target_item_id: input.itemId,
      make_public: input.makePublic,
    });
    if (error) throw new Error("CMS_NAVIGATION_PUBLISH_FAILED");
    revalidatePath("/", "layout");
    return { status: "success", message: input.makePublic ? "Navigation item published." : "Navigation item returned to draft." };
  } catch (error) {
    return safeCmsError(error);
  }
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
      "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif",
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
    revalidatePath("/admin/assets");
    return { status: "success", message: "Image uploaded privately. It is not public until approved." };
  } catch (error) {
    return safeCmsError(error);
  }
}

export async function manageRoleAction(
  _previous: CmsActionState,
  formData: FormData,
): Promise<CmsActionState> {
  try {
    const input = roleManagementInputSchema.parse(values(formData));
    const { supabase } = await authorisedClient(["owner"]);
    const { error } = await supabase.rpc("manage_user_role", {
      target_user_id: input.userId,
      target_role: input.role,
      grant_role: input.operation === "grant",
    });
    if (error) throw new Error("CMS_ROLE_MANAGEMENT_FAILED");
    revalidatePath("/admin/roles");
    return { status: "success", message: "Role assignment updated." };
  } catch (error) {
    return safeCmsError(error);
  }
}

export async function setContentPublicationAction(
  _previous: CmsActionState,
  formData: FormData,
): Promise<CmsActionState> {
  try {
    const input = contentPublicationInputSchema.parse(values(formData));
    const { supabase } = await authorisedClient(publishingRoles);
    const rpc = input.entity === "asset" ? "set_asset_publication" : "set_reusable_publication";
    const { error } = await supabase.rpc(rpc, { target_id: input.entityId, make_public: input.makePublic });
    if (error) throw new Error("CMS_PUBLICATION_STATE_FAILED");
    revalidatePath("/", "layout");
    revalidatePath(input.entity === "asset" ? "/admin/assets" : "/admin/reusable");
    return { status: "success", message: input.makePublic ? "Content published." : "Content returned to draft." };
  } catch (error) {
    return safeCmsError(error);
  }
}

export async function createStaffInvitationAction(
  _previous: CmsActionState,
  formData: FormData,
): Promise<CmsActionState> {
  try {
    const input = staffInvitationInputSchema.parse(values(formData));
    const { supabase } = await authorisedClient(["owner"]);
    const expiresAt = new Date(Date.now() + input.expiresInDays * 86_400_000).toISOString();
    const { data, error } = await supabase.rpc("create_staff_invitation", {
      candidate_email: input.email,
      candidate_role: input.role,
      candidate_expires_at: expiresAt,
    });
    if (error?.message.includes("CMS_INVITATION_USER_EXISTS")) {
      return {
        status: "error",
        message: "That email already has an admin account. Use Role management to change the person's access instead.",
      };
    }
    if (error || !data) throw new Error("CMS_INVITATION_CREATE_FAILED");
    const { error: deliveryError } = await supabase.auth.signInWithOtp({
      email: input.email,
      options: {
        emailRedirectTo: new URL("/auth/callback?next=/admin", getSiteUrl()).toString(),
        shouldCreateUser: true,
      },
    });
    revalidatePath("/admin/invitations");
    return {
      status: "success",
      message: deliveryError
        ? "Invitation created, but email delivery could not be confirmed. The invited person can request a secure sign-in link from the admin page."
        : "Invitation created and a secure sign-in link was requested for the invited person.",
    };
  } catch (error) {
    return safeCmsError(error);
  }
}

export async function revokeStaffInvitationAction(
  _previous: CmsActionState,
  formData: FormData,
): Promise<CmsActionState> {
  try {
    const input = revokeInvitationInputSchema.parse(values(formData));
    const { supabase } = await authorisedClient(["owner"]);
    const { error } = await supabase.rpc("revoke_staff_invitation", { target_id: input.invitationId });
    if (error) throw new Error("CMS_INVITATION_REVOKE_FAILED");
    revalidatePath("/admin/invitations");
    return { status: "success", message: "Invitation revoked." };
  } catch (error) {
    return safeCmsError(error);
  }
}

export async function initialiseCmsContentAction(
  _previous: CmsActionState,
  _formData: FormData,
): Promise<CmsActionState> {
  try {
    const { supabase } = await authorisedClient(["owner"]);
    const payload = Array.from(seedPages.values());
    const { data, error } = await supabase.rpc("import_initial_cms_seed", { seed_payload: payload });
    if (error || !data) throw new Error("CMS_SEED_IMPORT_FAILED");
    revalidatePath("/admin", "layout");
    return { status: "success", message: "Approved seed content imported or repaired atomically." };
  } catch (error) {
    return safeCmsError(error);
  }
}

export async function assertAuditAccessAction() {
  await authorisedClient(auditRoles);
}
