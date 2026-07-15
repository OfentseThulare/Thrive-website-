"use client";

import { useActionState, useMemo, useState } from "react";

import {
  publishPageAction,
  saveNavigationAction,
  savePageDraftAction,
  saveReusableEntryAction,
  saveSectionAction,
  uploadAssetAction,
} from "@/app/admin/actions";
import { initialCmsActionState } from "@/lib/cms/action-state";
import type { ContentBlock } from "@/lib/content/contracts";
import { ActionFeedback } from "./action-feedback";
import { SubmitButton } from "./submit-button";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function Field({ name, label, defaultValue = "", type = "text", required = false, help, placeholder }: {
  name: string; label: string; defaultValue?: string | number; type?: string; required?: boolean; help?: string; placeholder?: string;
}) {
  return (
    <div className="admin-field">
      <label htmlFor={`${name}-${String(defaultValue).slice(0, 8)}`}>{label}</label>
      <input id={`${name}-${String(defaultValue).slice(0, 8)}`} name={name} type={type} defaultValue={defaultValue} required={required} placeholder={placeholder} />
      {help ? <small>{help}</small> : null}
    </div>
  );
}

export function PageSettingsForm({ page }: { page: {
  id: string; draft: { title: string; description: string; seo: unknown; visible: boolean };
} }) {
  const [state, action] = useActionState(savePageDraftAction, initialCmsActionState);
  const seo = (page.draft.seo && typeof page.draft.seo === "object" ? page.draft.seo : {}) as Record<string, unknown>;
  return (
    <form action={action} className="admin-form admin-form-grid">
      <input type="hidden" name="pageId" value={page.id} />
      <Field name="title" label="Page title" defaultValue={page.draft.title} required />
      <div className="admin-field admin-field-wide">
        <label htmlFor="page-description">Page summary</label>
        <textarea id="page-description" name="description" rows={3} defaultValue={page.draft.description} required />
      </div>
      <Field name="metaTitle" label="Search title" defaultValue={String(seo.title ?? "")} help="Up to 70 characters." />
      <Field name="canonicalPath" label="Canonical path" defaultValue={String(seo.canonicalPath ?? "")} placeholder="/about" />
      <div className="admin-field admin-field-wide">
        <label htmlFor="meta-description">Search description</label>
        <textarea id="meta-description" name="metaDescription" rows={2} defaultValue={String(seo.description ?? "")} />
      </div>
      <label className="admin-check"><input name="visible" value="true" type="checkbox" defaultChecked={page.draft.visible} /> Include when next published</label>
      <label className="admin-check"><input name="noIndex" value="true" type="checkbox" defaultChecked={Boolean(seo.noIndex)} /> Ask search engines not to index</label>
      <div className="admin-form-footer"><ActionFeedback state={state} /><SubmitButton>Save draft settings</SubmitButton></div>
    </form>
  );
}

const selectOptions: Record<string, string[]> = {
  tone: ["cream", "mist", "white", "teal", "scope", "verification", "status"],
  align: ["left", "centre"],
  layout: ["grid", "stack", "gems"],
  imageSide: ["left", "right"],
  position: ["centre", "top", "bottom", "left", "right"],
};

function setAtPath(root: JsonValue, path: (string | number)[], value: JsonValue): JsonValue {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  if (Array.isArray(root)) {
    const clone = [...root];
    clone[Number(head)] = setAtPath(clone[Number(head)], rest, value);
    return clone;
  }
  const clone = { ...(root as Record<string, JsonValue>) };
  clone[String(head)] = setAtPath(clone[String(head)], rest, value);
  return clone;
}

function StructuredValue({ label, value, path, onChange }: {
  label: string; value: JsonValue; path: (string | number)[]; onChange: (path: (string | number)[], value: JsonValue) => void;
}) {
  if (Array.isArray(value)) {
    return <fieldset className="admin-structured-group"><legend>{label.replaceAll("_", " ")}</legend>{value.map((item, index) => <StructuredValue key={index} label={`${label} ${index + 1}`} value={item} path={[...path, index]} onChange={onChange} />)}</fieldset>;
  }
  if (value && typeof value === "object") {
    return <fieldset className="admin-structured-group"><legend>{label.replaceAll("_", " ")}</legend>{Object.entries(value).map(([key, item]) => <StructuredValue key={key} label={key} value={item} path={[...path, key]} onChange={onChange} />)}</fieldset>;
  }
  if (typeof value === "boolean") {
    return <label className="admin-check"><input type="checkbox" checked={value} onChange={(event) => onChange(path, event.target.checked)} /> {label.replaceAll("_", " ")}</label>;
  }
  const options = selectOptions[label];
  if (options?.includes(String(value))) {
    return <div className="admin-field"><label>{label.replaceAll("_", " ")}</label><select aria-label={label.replaceAll("_", " ")} value={String(value)} onChange={(event) => onChange(path, event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></div>;
  }
  const isLong = ["body", "answer", "description", "introduction", "note", "aside"].includes(label) || String(value).length > 100;
  return <div className="admin-field"><label>{label.replaceAll("_", " ")}</label>{isLong ? <textarea aria-label={label.replaceAll("_", " ")} rows={3} value={String(value ?? "")} onChange={(event) => onChange(path, event.target.value)} /> : <input aria-label={label.replaceAll("_", " ")} type={typeof value === "number" ? "number" : "text"} value={String(value ?? "")} onChange={(event) => onChange(path, typeof value === "number" ? Number(event.target.value) : event.target.value)} />}</div>;
}

export function SectionForm({ section, pageSlug }: { section: { id?: string; position: number; visible: boolean; variant: string; content: ContentBlock }; pageSlug: string }) {
  const [state, action] = useActionState(saveSectionAction, initialCmsActionState);
  const [content, setContent] = useState<JsonValue>(section.content as JsonValue);
  return (
    <form action={action} className="admin-form admin-section-form">
      {section.id ? <input type="hidden" name="sectionId" value={section.id} /> : null}
      <input type="hidden" name="pageSlug" value={pageSlug} />
      <input type="hidden" name="content" value={JSON.stringify(content)} />
      <div className="admin-inline-fields">
        <Field name="position" label="Order" type="number" defaultValue={section.position} required />
        <div className="admin-field"><label>Section style</label><select aria-label="Section style" name="variant" defaultValue={section.variant}><option value="default">Default</option><option value="quiet">Quiet</option><option value="emphasis">Emphasis</option><option value="compact">Compact</option></select></div>
        <label className="admin-check"><input name="visible" value="true" type="checkbox" defaultChecked={section.visible} /> Show in next revision</label>
      </div>
      <div className="admin-structured-editor">
        {Object.entries(content as Record<string, JsonValue>).map(([key, value]) => key === "blockType" ? <div className="admin-readonly" key={key}><span>Block type</span><strong>{String(value).replaceAll("_", " ")}</strong></div> : <StructuredValue key={key} label={key} value={value} path={[key]} onChange={(path, next) => setContent((current) => setAtPath(current, path, next))} />)}
      </div>
      <div className="admin-form-footer"><ActionFeedback state={state} /><SubmitButton>{section.id ? "Save section draft" : "Add section draft"}</SubmitButton></div>
    </form>
  );
}

const blockTemplates: Record<string, ContentBlock> = {
  hero: { blockType: "hero", eyebrow: "Page introduction", heading: "Page heading", body: "Introduce the page clearly.", primaryAction: { label: "Book a session", href: "/book" }, image: { src: "/images/renny-portrait-seated.jpg", alt: "Renny, Thrive Through Cancer coach", width: 2048, height: 2048, position: "centre" }, tone: "cream" },
  introduction: { blockType: "introduction", eyebrow: "New section", heading: "Section heading", body: ["Add the approved copy here."], align: "left" },
  card_collection: { blockType: "card_collection", eyebrow: "Explore", heading: "Section heading", cards: [{ title: "First card", body: "Add detail." }], tone: "mist" },
  editorial_split: { blockType: "editorial_split", eyebrow: "New section", heading: "Section heading", body: ["Add the approved copy here."], imageSide: "right", tone: "white" },
  feature_list: { blockType: "feature_list", eyebrow: "Key points", heading: "Section heading", items: [{ title: "First point", body: "Add detail." }, { title: "Second point", body: "Add detail." }], layout: "grid", tone: "cream" },
  process: { blockType: "process", eyebrow: "How it works", heading: "Section heading", steps: [{ title: "First step", body: "Add detail." }, { title: "Second step", body: "Add detail." }] },
  comparison: { blockType: "comparison", eyebrow: "Compare", heading: "Section heading", columns: [{ title: "First option", body: "Add detail.", points: ["First point"] }, { title: "Second option", body: "Add detail.", points: ["First point"] }] },
  pricing: { blockType: "pricing", eyebrow: "Pricing", heading: "Session options", plans: [{ name: "First option", duration: "60 minutes", price: "R0", body: "Add detail." }, { name: "Second option", duration: "60 minutes", price: "R0", body: "Add detail." }], notes: ["Confirm pricing before publication."] },
  faq: { blockType: "faq", eyebrow: "Questions", heading: "Frequently asked questions", items: [{ question: "Add a question", answer: "Add the approved answer." }] },
  notice: { blockType: "notice", heading: "Important information", body: ["Add the approved notice."], tone: "scope" },
  call_to_action: { blockType: "call_to_action", heading: "Ready to take the next step?", body: "Choose a clear next action.", action: { label: "Book a session", href: "/book" } },
};

export function NewSectionForm({ pageSlug, nextPosition }: { pageSlug: string; nextPosition: number }) {
  const [type, setType] = useState(Object.keys(blockTemplates)[0]);
  return <div className="admin-new-section"><div className="admin-field"><label htmlFor="new-block-type">Choose a safe section pattern</label><select id="new-block-type" value={type} onChange={(event) => setType(event.target.value)}>{Object.keys(blockTemplates).map((key) => <option key={key} value={key}>{key.replaceAll("_", " ")}</option>)}</select></div><SectionForm key={type} pageSlug={pageSlug} section={{ position: nextPosition, visible: true, variant: "default", content: blockTemplates[type] }} /></div>;
}

export function PublishPageForm({ pageId, snapshot }: { pageId: string; snapshot: unknown }) {
  const [state, action] = useActionState(publishPageAction, initialCmsActionState);
  return <form action={action} className="admin-form admin-publish-form"><input type="hidden" name="pageId" value={pageId} /><input type="hidden" name="expectedSnapshot" value={JSON.stringify(snapshot)} /><div className="admin-field"><label htmlFor="change-summary">Publication note</label><input id="change-summary" name="changeSummary" maxLength={500} placeholder="What changed in this revision?" /></div><ActionFeedback state={state} /><SubmitButton>Validate and publish revision</SubmitButton></form>;
}

export function ReusableEntryForm({ entry }: { entry?: { id: string; entry_type: string; key: string; content: unknown } }) {
  const [state, action] = useActionState(saveReusableEntryAction, initialCmsActionState);
  const initialContent = entry?.content && typeof entry.content === "object" ? entry.content as Record<string, unknown> : {};
  const [entryType, setEntryType] = useState(entry?.entry_type ?? "faq");
  const [title, setTitle] = useState(String(initialContent.question ?? initialContent.title ?? initialContent.quote ?? ""));
  const initialBody = Array.isArray(initialContent.body) ? initialContent.body.join("\n\n") : initialContent.body;
  const [body, setBody] = useState(String(initialContent.answer ?? initialContent.attribution ?? initialBody ?? ""));
  const [duration, setDuration] = useState(String(initialContent.duration ?? "60 minutes"));
  const [price, setPrice] = useState(String(initialContent.price ?? "R0"));
  const content = useMemo(() => {
    if (entryType === "faq") return { question: title, answer: body };
    if (entryType === "testimonial") return { quote: title, attribution: body, consentConfirmed: true };
    if (entryType === "legal_notice") return { title, body: body.split(/\n\n+/).map((value) => value.trim()).filter(Boolean) };
    if (entryType === "pricing") return { title, duration, price, body };
    return { title, body };
  }, [body, duration, entryType, price, title]);
  return <form action={action} className="admin-form admin-form-grid">{entry ? <input type="hidden" name="entryId" value={entry.id} /> : null}<div className="admin-field"><label>Entry type</label><select aria-label="Entry type" name="entryType" value={entryType} onChange={(event) => setEntryType(event.target.value)}><option value="faq">FAQ</option><option value="resource">Resource</option><option value="credential">Credential</option><option value="service">Service</option><option value="pricing">Pricing</option><option value="pricing_note">Pricing note</option><option value="legal_notice">Legal notice</option><option value="testimonial">Testimonial with consent</option></select></div><Field name="key" label="Internal key" defaultValue={entry?.key} required help="Lowercase words separated with hyphens." /><div className="admin-field"><label>{entryType === "faq" ? "Question" : entryType === "testimonial" ? "Approved quotation" : "Title"}</label><input aria-label={entryType === "faq" ? "Question" : "Title"} value={title} onChange={(event) => setTitle(event.target.value)} required /></div>{entryType === "pricing" ? <><div className="admin-field"><label>Duration</label><input aria-label="Duration" value={duration} onChange={(event) => setDuration(event.target.value)} required /></div><div className="admin-field"><label>Price</label><input aria-label="Price" value={price} onChange={(event) => setPrice(event.target.value)} required /></div></> : null}<div className="admin-field admin-field-wide"><label>{entryType === "faq" ? "Answer" : entryType === "testimonial" ? "Attribution" : "Body"}</label><textarea aria-label={entryType === "faq" ? "Answer" : "Body"} value={body} onChange={(event) => setBody(event.target.value)} required /></div>{entryType === "testimonial" ? <p className="admin-field-wide admin-readonly-note">Saving a testimonial confirms documented consent exists. Do not publish unverified testimony.</p> : null}<input type="hidden" name="status" value="draft" /><input type="hidden" name="content" value={JSON.stringify(content)} /><div className="admin-form-footer"><ActionFeedback state={state} /><SubmitButton>Save reusable draft</SubmitButton></div></form>;
}

export function NavigationForm({ item }: { item?: { id: string; location: string; label: string; href: string; position: number } }) {
  const [state, action] = useActionState(saveNavigationAction, initialCmsActionState);
  return <form action={action} className="admin-form admin-inline-form">{item ? <input type="hidden" name="itemId" value={item.id} /> : null}<div className="admin-field"><label>Location</label><select aria-label="Navigation location" name="location" defaultValue={item?.location ?? "primary"}><option value="primary">Primary</option><option value="footer">Footer</option><option value="legal">Legal</option></select></div><Field name="label" label="Label" defaultValue={item?.label} required /><Field name="href" label="Destination" defaultValue={item?.href ?? "/"} required /><Field name="position" label="Order" type="number" defaultValue={item?.position ?? 0} required /><div className="admin-form-footer"><ActionFeedback state={state} /><SubmitButton>Save navigation draft</SubmitButton></div></form>;
}

export function AssetUploadForm() {
  const [state, action] = useActionState(uploadAssetAction, initialCmsActionState);
  return <form action={action} className="admin-form admin-form-grid"><div className="admin-field admin-field-wide"><label htmlFor="asset-file">Image or PDF</label><input id="asset-file" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif,application/pdf" required /><small>Private by default. Maximum 15 MB.</small></div><Field name="altText" label="Alternative text" required /><label className="admin-check"><input name="decorative" value="true" type="checkbox" /> Decorative only</label><Field name="focalX" label="Horizontal focal point" type="number" defaultValue={0.5} /><Field name="focalY" label="Vertical focal point" type="number" defaultValue={0.5} /><Field name="sourceUrl" label="Original source URL" type="url" /><Field name="photographer" label="Photographer or creator" /><Field name="licenceSource" label="Licence source" /><Field name="sourceIdentifier" label="Source identifier" /><div className="admin-field admin-field-wide"><label>Restrictions and release notes</label><textarea aria-label="Restrictions and release notes" name="restrictions" rows={3} /></div><div className="admin-form-footer"><ActionFeedback state={state} /><SubmitButton>Upload private asset</SubmitButton></div></form>;
}
