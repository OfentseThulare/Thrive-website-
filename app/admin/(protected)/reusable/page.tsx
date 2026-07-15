import { ReusableEntryForm } from "@/components/admin/cms-forms";
import { setContentPublicationAction } from "@/app/admin/actions";
import { SubmitButton } from "@/components/admin/submit-button";
import { requireCmsIdentity } from "@/lib/cms/auth";
import { hasCmsRole } from "@/lib/cms/permissions";
import { requireCmsDatabase } from "@/lib/cms/queries";

export default async function ReusableContentPage() {
  const identity = await requireCmsIdentity();
  const canEdit = hasCmsRole(identity.roles, ["owner", "publisher", "editor"]);
  const canPublish = hasCmsRole(identity.roles, ["owner", "publisher"]);
  const supabase = await requireCmsDatabase();
  const { data, error } = await supabase.from("reusable_entries").select("id,entry_type,key,status,content,updated_at").order("entry_type").order("key");
  return <div className="admin-content"><div className="admin-page-heading"><div><p className="eyebrow">Shared content</p><h1>Reusable entries</h1><p>Maintain FAQs, resources, credentials, pricing notes and approved legal notices in one place.</p></div></div>{canEdit ? <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Create a reusable draft</h2><p>A publisher must approve any live transition.</p></div></div><ReusableEntryForm /></section> : null}<section className="admin-panel"><div className="admin-panel-heading"><div><h2>Content library</h2></div></div>{error ? <div className="admin-error" role="alert">Reusable content could not be loaded.</div> : data?.length ? <div className="admin-card-list">{data.map((entry) => <article key={entry.id}><div><span className={`admin-status admin-status-${entry.status}`}>{entry.status}</span><small>{entry.entry_type.replaceAll("_", " ")}</small></div><h3>{entry.key.replaceAll("-", " ")}</h3><p>{JSON.stringify(entry.content).slice(0, 180)}</p>{canEdit ? <details className="admin-inline-editor"><summary>Edit this draft</summary><ReusableEntryForm entry={entry} /></details> : null}{canPublish ? <form action={setContentPublicationAction}><input type="hidden" name="entity" value="reusable_entry" /><input type="hidden" name="entityId" value={entry.id} /><input type="hidden" name="makePublic" value={entry.status === "published" ? "false" : "true"} /><SubmitButton tone="quiet">{entry.status === "published" ? "Return to draft" : "Publish entry"}</SubmitButton></form> : null}</article>)}</div> : <div className="admin-empty"><strong>No reusable entries yet</strong><p>Create the first private draft above.</p></div>}</section></div>;
}
