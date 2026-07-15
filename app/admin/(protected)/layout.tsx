import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { requireCmsIdentity } from "@/lib/cms/auth";
import { hasCmsRole } from "@/lib/cms/permissions";
import { requireCmsDatabase } from "@/lib/cms/queries";

export const metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const identity = await requireCmsIdentity();
  if (identity.roles.length === 0) redirect("/admin/unauthorised");
  let mfaRequired = false;
  if (hasCmsRole(identity.roles, ["owner", "publisher"])) {
    const supabase = await requireCmsDatabase();
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    mfaRequired = data?.currentLevel !== "aal2";
  }
  return <AdminShell identity={identity} mfaRequired={mfaRequired}>{children}</AdminShell>;
}
