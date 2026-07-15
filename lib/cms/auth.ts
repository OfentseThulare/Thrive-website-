import "server-only";

import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cmsRoleSchema, type CmsRole } from "./permissions";

export type CmsIdentity = { userId: string; email: string | null; roles: CmsRole[] };

export async function getCmsIdentity(): Promise<CmsIdentity | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const { data: roleRows, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id);

  if (roleError) throw new Error("CMS_ROLE_LOOKUP_FAILED");

  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    roles: (roleRows ?? []).map((row) => cmsRoleSchema.parse(row.role)),
  };
}

export async function requireCmsIdentity(): Promise<CmsIdentity> {
  const identity = await getCmsIdentity();
  if (!identity) redirect("/admin/login");
  return identity;
}
