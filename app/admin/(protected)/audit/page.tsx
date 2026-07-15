import { notFound } from "next/navigation";

import { requireCmsIdentity } from "@/lib/cms/auth";
import { hasCmsRole } from "@/lib/cms/permissions";
import { requireCmsDatabase } from "@/lib/cms/queries";

export default async function AuditPage() {
  const identity = await requireCmsIdentity();
  if (!hasCmsRole(identity.roles, ["owner", "publisher", "auditor"])) notFound();
  const supabase = await requireCmsDatabase();
  const { data, error } = await supabase.from("content_audit_log").select("id,actor_id,action,entity_type,entity_id,after_data,occurred_at").order("occurred_at", { ascending: false }).limit(100);
  return <div className="admin-content"><div className="admin-page-heading"><div><p className="eyebrow">Accountability</p><h1>Audit trail</h1><p>Append-only records show who changed or published content and when.</p></div></div><section className="admin-panel">{error ? <div className="admin-error" role="alert">Audit events could not be loaded.</div> : data?.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Reference</th></tr></thead><tbody>{data.map((event) => <tr key={event.id}><td><time>{new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" }).format(new Date(event.occurred_at))}</time></td><td><code>{event.actor_id?.slice(0, 8) ?? "system"}</code></td><td><strong>{event.action.replaceAll(".", " ")}</strong></td><td>{event.entity_type.replaceAll("_", " ")}</td><td><code>{event.entity_id.slice(0, 20)}</code></td></tr>)}</tbody></table></div> : <div className="admin-empty"><strong>No audit events yet</strong><p>Recorded content actions will appear here.</p></div>}</section></div>;
}
