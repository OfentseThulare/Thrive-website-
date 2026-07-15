import Link from "next/link";

import { requireCmsIdentity } from "@/lib/cms/auth";
import { requireCmsDatabase } from "@/lib/cms/queries";

export default async function AdminDashboardPage() {
  const identity = await requireCmsIdentity();
  const supabase = await requireCmsDatabase();
  const [pages, drafts, assets, activity] = await Promise.all([
    supabase.from("pages").select("id", { count: "exact", head: true }),
    supabase.from("pages").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("assets").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("content_audit_log").select("id,action,entity_type,occurred_at").order("occurred_at", { ascending: false }).limit(5),
  ]);
  return <div className="admin-content"><div className="admin-page-heading"><div><p className="eyebrow">Content workspace</p><h1>Good to see you</h1><p>Review drafts, preview changes and publish only when everything is ready.</p></div><Link className="admin-button admin-button-primary" href="/admin/pages">Manage pages</Link></div><section className="admin-stat-grid" aria-label="Content summary"><article><span>All pages</span><strong>{pages.count ?? 0}</strong></article><article><span>Unpublished pages</span><strong>{drafts.count ?? 0}</strong></article><article><span>Private images</span><strong>{assets.count ?? 0}</strong></article><article><span>Your access</span><strong>{identity.roles.join(", ")}</strong></article></section><section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow">Recent activity</p><h2>Latest recorded changes</h2></div></div>{activity.data?.length ? <ul className="admin-activity-list">{activity.data.map((item) => <li key={item.id}><span className="admin-status admin-status-neutral">{item.entity_type}</span><strong>{item.action.replaceAll(".", " ")}</strong><time dateTime={item.occurred_at}>{new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" }).format(new Date(item.occurred_at))}</time></li>)}</ul> : <div className="admin-empty"><strong>No activity has been recorded yet</strong><p>Edits and publication events will appear here.</p></div>}</section></div>;
}
