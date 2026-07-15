import { notFound } from "next/navigation";

import { InvitationForm } from "@/components/admin/invitation-form";
import { RevokeInvitationForm } from "@/components/admin/privileged-action-forms";
import { requireCmsIdentity } from "@/lib/cms/auth";
import { hasCmsRole } from "@/lib/cms/permissions";
import { requireCmsDatabase } from "@/lib/cms/queries";

export default async function InvitationsPage() {
  const identity = await requireCmsIdentity();
  if (!hasCmsRole(identity.roles, ["owner"])) notFound();
  const supabase = await requireCmsDatabase();
  const { data, error } = await supabase.from("staff_invitations").select("id,email,role,expires_at,consumed_at,revoked_at,created_at").order("created_at", { ascending: false });
  return <div className="admin-content"><div className="admin-page-heading"><div><p className="eyebrow">Owner controls</p><h1>Staff invitations</h1><p>Only invited addresses may create an admin account. Invitations cannot grant owner access.</p></div></div><section className="admin-panel"><div className="admin-panel-heading"><div><h2>Invite a staff member</h2><p>Two-step verification is required before creating an invitation.</p></div></div><InvitationForm /></section><section className="admin-panel"><div className="admin-panel-heading"><div><h2>Invitation history</h2></div></div>{error ? <div className="admin-error" role="alert">Invitations could not be loaded.</div> : data?.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Email</th><th>Role</th><th>Status</th><th>Expires</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{data.map((invitation) => { const status = invitation.consumed_at ? "consumed" : invitation.revoked_at ? "revoked" : new Date(invitation.expires_at) <= new Date() ? "expired" : "pending"; return <tr key={invitation.id}><td>{invitation.email}</td><td>{invitation.role}</td><td><span className="admin-status admin-status-neutral">{status}</span></td><td>{new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeZone: "Africa/Johannesburg" }).format(new Date(invitation.expires_at))}</td><td>{status === "pending" ? <RevokeInvitationForm invitationId={invitation.id} /> : null}</td></tr>; })}</tbody></table></div> : <div className="admin-empty"><strong>No invitations yet</strong><p>Create the first time-limited invitation above.</p></div>}</section></div>;
}
