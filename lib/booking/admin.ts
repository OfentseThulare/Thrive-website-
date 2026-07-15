import "server-only";

import { redirect } from "next/navigation";
import { requireCmsIdentity } from "@/lib/cms/auth";
import { hasCmsRole, type CmsRole } from "@/lib/cms/permissions";
import { requireCmsDatabase } from "@/lib/cms/queries";

export async function requireScheduleAccess(roles: readonly CmsRole[]) {
  const identity = await requireCmsIdentity();
  if (!hasCmsRole(identity.roles, roles)) redirect("/admin/unauthorised");
  return { identity, supabase: await requireCmsDatabase(), editable: hasCmsRole(identity.roles, ["owner", "scheduler"]) };
}

export function adminFormat(value: string) {
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" }).format(new Date(value));
}
