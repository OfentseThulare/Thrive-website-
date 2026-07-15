import Link from "next/link";

import { signOutAction } from "@/app/admin/actions";
import type { CmsIdentity } from "@/lib/cms/auth";
import { hasCmsRole } from "@/lib/cms/permissions";
import { BrandMark } from "@/components/brand-mark";

export function AdminShell({ identity, children, mfaRequired }: { identity: CmsIdentity; children: React.ReactNode; mfaRequired: boolean }) {
  const links = [
    { href: "/admin", label: "Overview", show: true },
    { href: "/admin/pages", label: "Pages", show: hasCmsRole(identity.roles, ["owner", "publisher", "editor", "auditor"]) },
    { href: "/admin/reusable", label: "Reusable content", show: hasCmsRole(identity.roles, ["owner", "publisher", "editor", "auditor"]) },
    { href: "/admin/assets", label: "Images", show: hasCmsRole(identity.roles, ["owner", "publisher", "editor", "auditor"]) },
    { href: "/admin/navigation", label: "Navigation", show: hasCmsRole(identity.roles, ["owner", "publisher", "editor", "auditor"]) },
    { href: "/admin/audit", label: "Audit trail", show: hasCmsRole(identity.roles, ["owner", "publisher", "auditor"]) },
    { href: "/admin/roles", label: "People and roles", show: hasCmsRole(identity.roles, ["owner"]) },
    { href: "/admin/invitations", label: "Invitations", show: hasCmsRole(identity.roles, ["owner"]) },
    { href: "/admin/security", label: "Security", show: hasCmsRole(identity.roles, ["owner", "publisher"]) },
  ];

  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/admin"><BrandMark /><span><strong>Thrive CMS</strong><small>Content workspace</small></span></Link>
        <nav aria-label="Content management">{links.filter((link) => link.show).map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav>
        <div className="admin-account"><p>{identity.email ?? "Authenticated user"}</p><div className="admin-role-list">{identity.roles.map((role) => <span key={role}>{role}</span>)}</div><form action={signOutAction}><button type="submit">Sign out</button></form></div>
      </aside>
      <div className="admin-workspace"><header className="admin-topbar"><Link href="/" target="_blank">View public website <span aria-hidden="true">↗</span></Link></header>{mfaRequired ? <div className="admin-mfa-banner" role="alert"><span>Two-step verification is required before privileged changes.</span><Link href="/admin/security?reason=verification-required">Verify now</Link></div> : null}{children}</div>
    </div>
  );
}
