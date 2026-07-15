import { AssetUploadForm } from "@/components/admin/cms-forms";
import { setContentPublicationAction } from "@/app/admin/actions";
import { SubmitButton } from "@/components/admin/submit-button";
import { requireCmsIdentity } from "@/lib/cms/auth";
import { hasCmsRole } from "@/lib/cms/permissions";
import { requireCmsDatabase } from "@/lib/cms/queries";

export default async function AssetsPage() {
  const identity = await requireCmsIdentity();
  const canEdit = hasCmsRole(identity.roles, ["owner", "publisher", "editor"]);
  const canPublish = hasCmsRole(identity.roles, ["owner", "publisher"]);
  const supabase = await requireCmsDatabase();
  const { data, error } = await supabase.from("assets").select("id,storage_path,filename,mime_type,byte_size,alt_text,photographer,licence_source,status,created_at").order("created_at", { ascending: false });
  const assets = await Promise.all((data ?? []).map(async (asset) => {
    const { data: signed } = await supabase.storage.from("site-assets").createSignedUrl(asset.storage_path, 300);
    return { ...asset, previewUrl: signed?.signedUrl ?? null };
  }));
  return <div className="admin-content"><div className="admin-page-heading"><div><p className="eyebrow">Private media storage</p><h1>Asset library</h1><p>Self-host images and PDFs with source, licence, accessibility and focal-point metadata.</p></div></div>{canEdit ? <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Upload an asset</h2><p>Uploads remain private until an approved publication process references them.</p></div></div><AssetUploadForm /></section> : null}<section className="admin-panel"><div className="admin-panel-heading"><div><h2>Stored assets</h2><p>Preview links expire after five minutes. Approved images use the internal reference shown below.</p></div></div>{error ? <div className="admin-error" role="alert">Assets could not be loaded.</div> : assets.length ? <div className="admin-asset-grid">{assets.map((asset) => <article key={asset.id}><div className="admin-asset-preview">{asset.previewUrl && asset.mime_type.startsWith("image/") ? <img src={asset.previewUrl} alt={asset.alt_text} /> : <span>{asset.mime_type === "application/pdf" ? "PDF" : "Asset"}</span>}</div><div><span className={`admin-status admin-status-${asset.status}`}>{asset.status}</span><h3>{asset.filename}</h3><p>{asset.alt_text}</p><code>/media/{asset.id}</code><dl><div><dt>Size</dt><dd>{Math.ceil(asset.byte_size / 1024)} KB</dd></div><div><dt>Creator</dt><dd>{asset.photographer || "Not recorded"}</dd></div><div><dt>Licence</dt><dd>{asset.licence_source || "Not recorded"}</dd></div></dl>{asset.previewUrl ? <a className="admin-text-link" href={asset.previewUrl} target="_blank" rel="noreferrer">Open controlled preview</a> : null}{canPublish ? <form action={setContentPublicationAction}><input type="hidden" name="entity" value="asset" /><input type="hidden" name="entityId" value={asset.id} /><input type="hidden" name="makePublic" value={asset.status === "published" ? "false" : "true"} /><SubmitButton tone="quiet">{asset.status === "published" ? "Return to private draft" : "Approve asset"}</SubmitButton></form> : null}</div></article>)}</div> : <div className="admin-empty"><strong>No assets have been uploaded</strong><p>Approved files will appear here with their provenance.</p></div>}</section></div>;
}
