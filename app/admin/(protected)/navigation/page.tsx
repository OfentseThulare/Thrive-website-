import { publishNavigationAction } from "@/app/admin/actions";
import { NavigationForm } from "@/components/admin/cms-forms";
import { SubmitButton } from "@/components/admin/submit-button";
import { requireCmsIdentity } from "@/lib/cms/auth";
import { hasCmsRole } from "@/lib/cms/permissions";
import { requireCmsDatabase } from "@/lib/cms/queries";

export default async function NavigationPage() {
  const identity = await requireCmsIdentity();
  const canEdit = hasCmsRole(identity.roles, ["owner", "publisher", "editor"]);
  const canPublish = hasCmsRole(identity.roles, ["owner", "publisher"]);
  const supabase = await requireCmsDatabase();
  const { data, error } = await supabase.from("navigation_items").select("id,location,label,href,position,status,visible").order("location").order("position");

  return (
    <div className="admin-content">
      <div className="admin-page-heading">
        <div><p className="eyebrow">Site structure</p><h1>Navigation</h1><p>Editors prepare hidden navigation drafts. Publishers control what becomes visible.</p></div>
      </div>
      {canEdit ? (
        <section className="admin-panel">
          <div className="admin-panel-heading"><div><h2>Add a draft link</h2></div></div>
          <NavigationForm />
        </section>
      ) : null}
      <section className="admin-panel">
        <div className="admin-panel-heading"><div><h2>Navigation items</h2></div></div>
        {error ? <div className="admin-error" role="alert">Navigation could not be loaded.</div> : data?.length ? (
          <ul className="admin-navigation-list">
            {data.map((item) => (
              <li key={item.id}>
                <span className="admin-order">{item.position + 1}</span>
                <div>
                  <small>{item.location}</small>
                  <strong>{item.label}</strong>
                  <code>{item.href}</code>
                  {canEdit && item.status === "draft" ? (
                    <details className="admin-inline-editor"><summary>Edit draft details</summary><NavigationForm item={item} /></details>
                  ) : canEdit && item.status === "published" ? (
                    <p className="admin-locked-note">{canPublish ? "Unpublish this item to draft before editing its details." : "A publisher must unpublish this item to draft before it can be edited."}</p>
                  ) : null}
                </div>
                <span className={`admin-status admin-status-${item.status}`}>{item.status}</span>
                {canPublish ? (
                  <form action={publishNavigationAction}>
                    <input type="hidden" name="itemId" value={item.id} />
                    <input type="hidden" name="makePublic" value={item.status === "published" ? "false" : "true"} />
                    <SubmitButton tone="quiet">{item.status === "published" ? "Unpublish to draft" : "Publish"}</SubmitButton>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        ) : <div className="admin-empty"><strong>No CMS navigation items yet</strong><p>The public site is using its safe seed navigation.</p></div>}
      </section>
    </div>
  );
}
