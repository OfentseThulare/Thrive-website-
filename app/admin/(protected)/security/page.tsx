import { notFound } from "next/navigation";

import { MfaEnrolForm, MfaUnenrolForm, MfaVerifyForm } from "@/components/admin/mfa-forms";
import { requireCmsIdentity } from "@/lib/cms/auth";
import { hasCmsRole } from "@/lib/cms/permissions";
import { requireCmsDatabase } from "@/lib/cms/queries";

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const identity = await requireCmsIdentity();
  if (!hasCmsRole(identity.roles, ["owner", "publisher"])) notFound();
  const supabase = await requireCmsDatabase();
  const [{ data: factors }, { data: assurance }] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  const verified = factors?.totp.filter((factor) => factor.status === "verified") ?? [];
  const elevated = assurance?.currentLevel === "aal2";
  const reason = (await searchParams).reason;
  return (
    <div className="admin-content">
      <div className="admin-page-heading"><div><p className="eyebrow">Account security</p><h1>Two-step verification</h1><p>Owners and publishers must verify an authenticator before changing or publishing content.</p></div><span className={`admin-status admin-status-${elevated ? "published" : "draft"}`}>{elevated ? "Verified session" : "Verification required"}</span></div>
      {reason ? <div className="admin-config-warning" role="alert"><strong>Verify before continuing</strong><p>This action requires a fresh authenticator check.</p></div> : null}
      {!verified.length ? <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Add an authenticator</h2><p>Use a standards-based TOTP app. Store the manual key securely until setup is complete.</p></div></div><MfaEnrolForm /></section> : null}
      {verified.map((factor) => <section className="admin-panel" key={factor.id}><div className="admin-panel-heading"><div><h2>{factor.friendly_name || "Authenticator app"}</h2><p>{elevated ? "This session is verified." : "Enter the current code to unlock privileged actions."}</p></div></div>{!elevated ? <MfaVerifyForm factorId={factor.id} /> : <MfaUnenrolForm factorId={factor.id} />}</section>)}
    </div>
  );
}
