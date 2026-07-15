import "server-only";

import { redirect } from "next/navigation";
import { requireCmsIdentity } from "@/lib/cms/auth";
import { hasCmsRole } from "@/lib/cms/permissions";
import { requireCmsDatabase } from "@/lib/cms/queries";

export async function requireFinanceAccess() {
  const identity = await requireCmsIdentity();
  if (!hasCmsRole(identity.roles, ["owner", "finance", "auditor"])) redirect("/admin/unauthorised");
  const supabase = await requireCmsDatabase();
  let editable = false;
  if (hasCmsRole(identity.roles, ["owner", "finance"])) {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    editable = !error && data.currentLevel === "aal2";
  }
  return { identity, supabase, editable };
}
