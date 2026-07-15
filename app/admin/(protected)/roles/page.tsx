import { notFound } from "next/navigation";

import { manageRoleAction } from "@/app/admin/actions";
import { SubmitButton } from "@/components/admin/submit-button";
import { requireCmsIdentity } from "@/lib/cms/auth";
import { hasCmsRole } from "@/lib/cms/permissions";
import { requireCmsDatabase } from "@/lib/cms/queries";

export default async function RolesPage() {
  const identity = await requireCmsIdentity();
  if (!hasCmsRole(identity.roles, ["owner"])) notFound();
  const supabase = await requireCmsDatabase();
  const { data: profiles } = await supabase.from("profiles").select("id,display_name,created_at").order("display_name");
  const { data: roles } = await supabase.from("user_roles").select("user_id,role,granted_at");
  return <div className="admin-content"><div className="admin-page-heading"><div><p className="eyebrow">Owner controls</p><h1>People and roles</h1><p>Only an owner can grant or revoke CMS permissions. The last owner cannot be removed.</p></div></div><section className="admin-panel">{profiles?.length ? <div className="admin-card-list">{profiles.map((profile) => { const assigned = roles?.filter((role) => role.user_id === profile.id).map((role) => role.role) ?? []; return <article key={profile.id}><h3>{profile.display_name}</h3><code>{profile.id}</code><div className="admin-role-list">{assigned.map((role) => <span key={role}>{role}</span>)}</div><form action={manageRoleAction} className="admin-role-form"><input type="hidden" name="userId" value={profile.id} /><div className="admin-field"><label>Role</label><select name="role"><option value="editor">Editor</option><option value="publisher">Publisher</option><option value="auditor">Auditor</option><option value="scheduler">Scheduler</option><option value="finance">Finance</option><option value="owner">Owner</option></select></div><div className="admin-field"><label>Change</label><select name="operation"><option value="grant">Grant</option><option value="revoke">Revoke</option></select></div><SubmitButton tone="quiet">Apply role change</SubmitButton></form></article>; })}</div> : <div className="admin-empty"><strong>No profiles available</strong><p>Create approved user accounts in Supabase Auth, then initialise their profiles before assigning roles.</p></div>}</section></div>;
}
