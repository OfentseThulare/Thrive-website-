import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { requireCmsIdentity } from "@/lib/cms/auth";

export const metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const identity = await requireCmsIdentity();
  if (identity.roles.length === 0) redirect("/admin/unauthorised");
  return <AdminShell identity={identity}>{children}</AdminShell>;
}
