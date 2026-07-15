import "server-only";

import { redirect } from "next/navigation";
import { requireCmsIdentity } from "@/lib/cms/auth";
import { hasCmsRole } from "@/lib/cms/permissions";
import { requireCmsDatabase } from "@/lib/cms/queries";

export async function requireFinanceAccess() {
  const identity = await requireCmsIdentity();
  if (!hasCmsRole(identity.roles, ["owner", "finance", "auditor"])) redirect("/admin/unauthorised");
  return { identity, supabase: await requireCmsDatabase(), editable: hasCmsRole(identity.roles, ["owner", "finance"]) };
}
