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

export function adminDateTimeLocal(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    hourCycle: "h23", timeZone: "Africa/Johannesburg",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}
