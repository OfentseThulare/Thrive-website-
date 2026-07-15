import Link from "next/link";

import { initialiseCmsContentAction } from "@/app/admin/actions";
import { SubmitButton } from "@/components/admin/submit-button";
import { requireCmsIdentity } from "@/lib/cms/auth";
import { hasCmsRole } from "@/lib/cms/permissions";
import { requireCmsDatabase } from "@/lib/cms/queries";

export default async function AdminPagesPage() {
  const identity = await requireCmsIdentity();
  const supabase = await requireCmsDatabase();
  const { data, error } = await supabase.from("pages").select("id,slug,title,status,updated_at,published_at").order("title");
  return <div className="admin-content"><div className="admin-page-heading"><div><p className="eyebrow">Website content</p><h1>Pages</h1><p>Working drafts stay private until an owner or publisher approves a validated revision.</p></div></div><section className="admin-panel">{error ? <div className="admin-error" role="alert">Pages could not be loaded.</div> : data?.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Page</th><th>Route</th><th>Status</th><th>Last changed</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{data.map((page) => <tr key={page.id}><td><strong>{page.title}</strong></td><td><code>/{page.slug === "home" ? "" : page.slug}</code></td><td><span className={`admin-status admin-status-${page.status}`}>{page.status}</span></td><td>{new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeZone: "Africa/Johannesburg" }).format(new Date(page.updated_at))}</td><td><Link className="admin-text-link" href={`/admin/pages/${page.id}`}>Edit and preview</Link></td></tr>)}</tbody></table></div> : <div className="admin-empty"><strong>No database pages yet</strong><p>Seed content remains public, but it must be imported into Supabase before it can be managed here.</p>{hasCmsRole(identity.roles, ["owner"]) ? <form action={initialiseCmsContentAction}><SubmitButton>Import approved seed content</SubmitButton></form> : null}</div>}</section></div>;
}
