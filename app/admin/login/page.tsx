import { redirect } from "next/navigation";

import { LoginForm } from "@/components/admin/login-form";
import { BrandMark } from "@/components/brand-mark";
import { getCmsIdentity } from "@/lib/cms/auth";
import { getPublicSupabaseEnvironment } from "@/lib/env";

export const metadata = { title: "Admin sign in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const identity = await getCmsIdentity();
  if (identity) redirect("/admin");
  const configured = getPublicSupabaseEnvironment() !== null;
  return <div className="admin-login-page"><section className="admin-login-card"><div className="admin-login-brand"><BrandMark /><div><p>Thrive Through Cancer</p><span>Secure content workspace</span></div></div><p className="eyebrow">Authorised access only</p><h1>Welcome back</h1><p>Manage approved website content, previews and publication history.</p>{!configured ? <div className="admin-config-warning" role="status"><strong>Admin service not configured</strong><p>Public seed content remains available. Add the approved Supabase project settings to enable secure sign-in.</p></div> : null}<LoginForm configured={configured} /><p className="admin-security-note">Sign-in responses do not reveal whether an account exists. Contact the site owner if access is required.</p></section></div>;
}
