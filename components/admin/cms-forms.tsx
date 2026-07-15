"use client";

import { useActionState, useId, useMemo, useState } from "react";

import {
  publishPageAction,
  saveNavigationAction,
  savePageDraftAction,
  saveReusableEntryAction,
  saveSectionAction,
  uploadAssetAction,
} from "@/app/admin/actions";
import { initialCmsActionState } from "@/lib/cms/action-state";
import {
  addCollectionMember,
  createReusableEditorValues,
  getAvailableOptionalFields,
  getCollectionLimits,
  isOptionalFieldPath,
  type JsonValue,
  type ReusableEditorValues,
  type ReusableEntryType,
  removeCollectionMember,
  removeJsonValueAtPath,
  serialiseReusableContent,
  setJsonValueAtPath,
} from "@/lib/cms/editor-values";
import type { ContentBlock } from "@/lib/content/contracts";
import { ActionFeedback } from "./action-feedback";
import { SubmitButton } from "./submit-button";

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
  align: ["left", "centre"],
  layout: ["grid", "stack", "gems"],
  imageSide: ["left", "right"],
  position: ["centre", "top", "bottom", "left", "right"],
  entryType: ["faq", "resource", "credential", "testimonial", "pricing_note", "legal_notice", "service", "pricing"],
};

function optionsForField(blockType: ContentBlock["blockType"], label: string) {
  if (label !== "tone") return selectOptions[label];
  if (blockType === "hero") return ["cream", "mist", "teal"];
  if (blockType === "notice") return ["scope", "verification", "status"];
  if (blockType === "reusable_collection") return ["cream", "mist", "white"];
  return ["cream", "mist", "white", "teal"];
}

function fieldLabel(value: string) {
  return value.replaceAll("_", " ");
}

function editorId(prefix: string, path: (string | number)[]) {
  return `${prefix}-${path.join("-")}`;
}

function StructuredValue({ blockType, idPrefix, label, value, path, onAddCollection, onChange, onRemove, onRemoveCollection, isRoot = false }: {
  blockType: ContentBlock["blockType"];
  idPrefix: string;
  label: string;
  value: JsonValue;
  path: (string | number)[];
  onAddCollection: (path: (string | number)[]) => void;
  onChange: (path: (string | number)[], value: JsonValue) => void;
  onRemove: (path: (string | number)[]) => void;
  onRemoveCollection: (path: (string | number)[], index: number) => void;
  isRoot?: boolean;
}) {
  if (Array.isArray(value)) {
    const limits = getCollectionLimits(blockType, path);
    return (
      <fieldset className="admin-structured-group admin-collection-group">
        <legend>{fieldLabel(label)}</legend>
        {value.map((item, index) => (
          <div className="admin-collection-item" key={index}>
            <div className="admin-collection-heading">
              <strong>{limits?.label ?? fieldLabel(label)} {index + 1}</strong>
              {limits ? (
                <button
                  aria-label={`Remove ${limits.label} ${index + 1}`}
                  className="admin-collection-action admin-collection-action-remove"
                  disabled={value.length <= limits.min}
                  onClick={() => onRemoveCollection(path, index)}
                  type="button"
                >
                  Remove
                </button>
              ) : null}
            </div>
            <StructuredValue blockType={blockType} idPrefix={idPrefix} label={`${label} ${index + 1}`} value={item} path={[...path, index]} onAddCollection={onAddCollection} onChange={onChange} onRemove={onRemove} onRemoveCollection={onRemoveCollection} />
          </div>
        ))}
        {limits ? (
          <div className="admin-collection-footer">
            <span>{value.length} of {limits.max} {limits.label}{limits.max === 1 ? "" : "s"}</span>
            <button
              className="admin-collection-action"
              disabled={value.length >= limits.max}
              onClick={() => onAddCollection(path)}
              type="button"
            >
              Add {limits.label}
            </button>
          </div>
        ) : null}
      </fieldset>
    );
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, JsonValue>;
    const availableFields = getAvailableOptionalFields(blockType, path, record);
    const content = (
      <>
        {Object.entries(record).map(([key, item]) => {
          const childPath = [...path, key];
          if (key === "blockType") {
            return <div className="admin-readonly" key={key}><span>Block type</span><strong>{fieldLabel(String(item))}</strong></div>;
          }
          const optional = isOptionalFieldPath(blockType, childPath);
          return (
            <div className={optional ? "admin-optional-field" : "admin-structured-field"} key={key}>
              {optional ? <button aria-label={`Remove optional ${fieldLabel(key)}`} className="admin-optional-remove" onClick={() => onRemove(childPath)} type="button">Remove optional field</button> : null}
              <StructuredValue blockType={blockType} idPrefix={idPrefix} label={key} value={item} path={childPath} onAddCollection={onAddCollection} onChange={onChange} onRemove={onRemove} onRemoveCollection={onRemoveCollection} />
            </div>
          );
        })}
        {availableFields.length ? (
          <div className="admin-optional-actions" aria-label={`Optional fields for ${fieldLabel(label)}`} role="group">
            <span>Optional fields</span>
            {availableFields.map((field) => (
              <button className="admin-collection-action" key={field.key} onClick={() => onChange([...path, field.key], field.initialValue)} type="button">Add {field.label}</button>
            ))}
          </div>
        ) : null}
      </>
    );
    return isRoot ? content : <fieldset className="admin-structured-group"><legend>{fieldLabel(label)}</legend>{content}</fieldset>;
  }
  if (typeof value === "boolean") {
    return <label className="admin-check"><input type="checkbox" checked={value} onChange={(event) => onChange(path, event.target.checked)} /> {fieldLabel(label)}</label>;
  }
  const options = optionsForField(blockType, label);
  if (options?.includes(String(value))) {
    const id = editorId(idPrefix, path);
    return <div className="admin-field"><label htmlFor={id}>{fieldLabel(label)}</label><select id={id} value={String(value)} onChange={(event) => onChange(path, event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></div>;
  }
  const isLong = ["body", "answer", "description", "introduction", "note", "aside"].includes(label) || String(value).length > 100;
  const id = editorId(idPrefix, path);
  return <div className="admin-field"><label htmlFor={id}>{fieldLabel(label)}</label>{isLong ? <textarea id={id} rows={3} value={String(value ?? "")} onChange={(event) => onChange(path, event.target.value)} /> : <input id={id} type={typeof value === "number" ? "number" : "text"} value={String(value ?? "")} onChange={(event) => onChange(path, typeof value === "number" ? Number(event.target.value) : event.target.value)} />}</div>;
}

export function SectionForm({ section, pageSlug }: { section: { id?: string; position: number; visible: boolean; variant: string; content: ContentBlock }; pageSlug: string }) {
  const [state, action] = useActionState(saveSectionAction, initialCmsActionState);
  const [content, setContent] = useState<JsonValue>(section.content as JsonValue);
  const editorPrefix = `section-${useId().replaceAll(":", "")}`;
  return (
    <form action={action} className="admin-form admin-section-form">
      {section.id ? <input type="hidden" name="sectionId" value={section.id} /> : null}
      <input type="hidden" name="pageSlug" value={pageSlug} />
      <input type="hidden" name="content" value={JSON.stringify(content)} />
      <div className="admin-inline-fields">
        <Field name="position" label="Order" type="number" defaultValue={section.position} required />
        <div className="admin-field"><label htmlFor={`${editorPrefix}-variant`}>Section style</label><select id={`${editorPrefix}-variant`} name="variant" defaultValue={section.variant}><option value="default">Default</option><option value="quiet">Quiet</option><option value="emphasis">Emphasis</option><option value="compact">Compact</option></select></div>
        <label className="admin-check"><input name="visible" value="true" type="checkbox" defaultChecked={section.visible} /> Show in next revision</label>
      </div>
      <div className="admin-structured-editor">
        <StructuredValue
          blockType={section.content.blockType}
          idPrefix={editorPrefix}
          isRoot
          label="section"
          onAddCollection={(path) => setContent((current) => addCollectionMember(current, section.content.blockType, path))}
          onChange={(path, next) => setContent((current) => setJsonValueAtPath(current, path, next))}
          onRemove={(path) => setContent((current) => removeJsonValueAtPath(current, path))}
          onRemoveCollection={(path, index) => setContent((current) => removeCollectionMember(current, section.content.blockType, path, index))}
          path={[]}
          value={content}
        />
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
  reusable_collection: { blockType: "reusable_collection", heading: "Selected resources", entryType: "resource", keys: ["resource-key"], tone: "mist" },
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
  const [entryType, setEntryType] = useState<ReusableEntryType>((entry?.entry_type as ReusableEntryType | undefined) ?? "faq");
  const [values, setValues] = useState<ReusableEditorValues>(() => createReusableEditorValues(entryType, entry?.content));
  const content = useMemo(() => serialiseReusableContent(entryType, values), [entryType, values]);
  const updateValue = <Key extends keyof ReusableEditorValues>(key: Key, value: ReusableEditorValues[Key]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };
  const titleLabel = entryType === "faq" ? "Question" : entryType === "testimonial" ? "Approved quotation" : "Title";
  const bodyLabel = entryType === "faq" ? "Answer" : entryType === "testimonial" ? "Attribution" : entryType === "legal_notice" ? "Notice paragraphs" : "Body";

  return (
    <form action={action} className="admin-form admin-form-grid">
      {entry ? <input type="hidden" name="entryId" value={entry.id} /> : null}
      <div className="admin-field">
        <label htmlFor={`entry-type-${entry?.id ?? "new"}`}>Entry type</label>
        <select id={`entry-type-${entry?.id ?? "new"}`} name="entryType" value={entryType} onChange={(event) => setEntryType(event.target.value as ReusableEntryType)}>
          <option value="faq">FAQ</option>
          <option value="resource">Resource</option>
          <option value="credential">Credential</option>
          <option value="service">Service</option>
          <option value="pricing">Pricing</option>
          <option value="pricing_note">Pricing note</option>
          <option value="legal_notice">Legal notice</option>
          <option value="testimonial">Testimonial with consent</option>
        </select>
      </div>
      <Field name="key" label="Internal key" defaultValue={entry?.key} required help="Lowercase words separated with hyphens." />
      <div className="admin-field">
        <label htmlFor={`entry-title-${entry?.id ?? "new"}`}>{titleLabel}</label>
        <input id={`entry-title-${entry?.id ?? "new"}`} value={values.title} onChange={(event) => updateValue("title", event.target.value)} required />
      </div>
      {entryType === "pricing" ? (
        <>
          <div className="admin-field">
            <label htmlFor={`entry-duration-${entry?.id ?? "new"}`}>Duration</label>
            <input id={`entry-duration-${entry?.id ?? "new"}`} value={values.duration} onChange={(event) => updateValue("duration", event.target.value)} required />
          </div>
          <div className="admin-field">
            <label htmlFor={`entry-price-${entry?.id ?? "new"}`}>Price</label>
            <input id={`entry-price-${entry?.id ?? "new"}`} value={values.price} onChange={(event) => updateValue("price", event.target.value)} required />
          </div>
        </>
      ) : null}
      {entryType === "resource" || entryType === "service" ? (
        <div className="admin-field">
          <label htmlFor={`entry-href-${entry?.id ?? "new"}`}>Destination</label>
          <input id={`entry-href-${entry?.id ?? "new"}`} placeholder="/resources or https://example.org" value={values.href} onChange={(event) => updateValue("href", event.target.value)} />
          <small>Optional. Use a safe internal path, web address, email address or telephone link.</small>
        </div>
      ) : null}
      {entryType === "credential" ? (
        <>
          <div className="admin-field">
            <label htmlFor={`entry-issuer-${entry?.id ?? "new"}`}>Issuer</label>
            <input id={`entry-issuer-${entry?.id ?? "new"}`} value={values.issuer} onChange={(event) => updateValue("issuer", event.target.value)} />
          </div>
          <div className="admin-field">
            <label htmlFor={`entry-verification-${entry?.id ?? "new"}`}>Verification status</label>
            <select id={`entry-verification-${entry?.id ?? "new"}`} value={values.verificationStatus} onChange={(event) => updateValue("verificationStatus", event.target.value as ReusableEditorValues["verificationStatus"])}>
              <option value="">Not specified</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
            </select>
          </div>
        </>
      ) : null}
      {entryType === "legal_notice" ? (
        <div className="admin-field">
          <label htmlFor={`entry-effective-date-${entry?.id ?? "new"}`}>Effective date</label>
          <input id={`entry-effective-date-${entry?.id ?? "new"}`} type="date" value={values.effectiveDate} onChange={(event) => updateValue("effectiveDate", event.target.value)} />
        </div>
      ) : null}
      <div className="admin-field admin-field-wide">
        <label htmlFor={`entry-body-${entry?.id ?? "new"}`}>{bodyLabel}</label>
        <textarea id={`entry-body-${entry?.id ?? "new"}`} value={values.body} onChange={(event) => updateValue("body", event.target.value)} required />
        {entryType === "legal_notice" ? <small>Separate paragraphs with a blank line. Up to 20 paragraphs are supported.</small> : null}
      </div>
      {entryType === "testimonial" ? <p className="admin-field-wide admin-readonly-note">Saving a testimonial confirms documented consent exists. Do not publish unverified testimony.</p> : null}
      <input type="hidden" name="status" value="draft" />
      <input type="hidden" name="content" value={JSON.stringify(content)} />
      <div className="admin-form-footer"><ActionFeedback state={state} /><SubmitButton>Save reusable draft</SubmitButton></div>
    </form>
  );
}

export function NavigationForm({ item }: { item?: { id: string; location: string; label: string; href: string; position: number } }) {
  const [state, action] = useActionState(saveNavigationAction, initialCmsActionState);
  return <form action={action} className="admin-form admin-inline-form">{item ? <input type="hidden" name="itemId" value={item.id} /> : null}<div className="admin-field"><label>Location</label><select aria-label="Navigation location" name="location" defaultValue={item?.location ?? "primary"}><option value="primary">Primary</option><option value="footer">Footer</option><option value="legal">Legal</option></select></div><Field name="label" label="Label" defaultValue={item?.label} required /><Field name="href" label="Destination" defaultValue={item?.href ?? "/"} required /><Field name="position" label="Order" type="number" defaultValue={item?.position ?? 0} required /><div className="admin-form-footer"><ActionFeedback state={state} /><SubmitButton>Save navigation draft</SubmitButton></div></form>;
}

export function AssetUploadForm() {
  const [state, action] = useActionState(uploadAssetAction, initialCmsActionState);
  return <form action={action} className="admin-form admin-form-grid"><div className="admin-field admin-field-wide"><label htmlFor="asset-file">Image or PDF</label><input id="asset-file" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif,application/pdf" required /><small>Private by default. Maximum 15 MB.</small></div><Field name="altText" label="Alternative text" required /><label className="admin-check"><input name="decorative" value="true" type="checkbox" /> Decorative only</label><Field name="focalX" label="Horizontal focal point" type="number" defaultValue={0.5} /><Field name="focalY" label="Vertical focal point" type="number" defaultValue={0.5} /><Field name="sourceUrl" label="Original source URL" type="url" /><Field name="photographer" label="Photographer or creator" /><Field name="licenceSource" label="Licence source" /><Field name="sourceIdentifier" label="Source identifier" /><div className="admin-field admin-field-wide"><label>Restrictions and release notes</label><textarea aria-label="Restrictions and release notes" name="restrictions" rows={3} /></div><div className="admin-form-footer"><ActionFeedback state={state} /><SubmitButton>Upload private asset</SubmitButton></div></form>;
}
