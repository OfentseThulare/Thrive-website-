import type { ContentBlock } from "@/lib/content/contracts";

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type EditorPath = (string | number)[];

export type ReusableEntryType =
  | "faq"
  | "resource"
  | "credential"
  | "testimonial"
  | "pricing_note"
  | "legal_notice"
  | "service"
  | "pricing";

export type ReusableEditorValues = {
  title: string;
  body: string;
  duration: string;
  price: string;
  href: string;
  issuer: string;
  verificationStatus: "" | "pending" | "verified";
  effectiveDate: string;
};

type ContentRecord = Record<string, unknown>;

function asRecord(value: unknown): ContentRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as ContentRecord : {};
}

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function optionalText(value: string) {
  return value.trim() ? value : undefined;
}

export function createReusableEditorValues(entryType: string, content: unknown): ReusableEditorValues {
  const record = asRecord(content);
  const body = Array.isArray(record.body)
    ? record.body.filter((value): value is string => typeof value === "string").join("\n\n")
    : asText(record.body);

  return {
    title: asText(record.question ?? record.title ?? record.quote),
    body: asText(record.answer ?? record.attribution) || body,
    duration: asText(record.duration) || "60 minutes",
    price: asText(record.price) || "R0",
    href: asText(record.href),
    issuer: asText(record.issuer),
    verificationStatus: record.verificationStatus === "pending" || record.verificationStatus === "verified"
      ? record.verificationStatus
      : "",
    effectiveDate: entryType === "legal_notice" ? asText(record.effectiveDate) : "",
  };
}

export function serialiseReusableContent(entryType: ReusableEntryType, values: ReusableEditorValues): JsonValue {
  switch (entryType) {
    case "faq":
      return { question: values.title, answer: values.body };
    case "testimonial":
      return { quote: values.title, attribution: values.body, consentConfirmed: true };
    case "legal_notice":
      return {
        title: values.title,
        body: values.body.split(/\n\s*\n/).map((value) => value.trim()).filter(Boolean),
        ...(optionalText(values.effectiveDate) ? { effectiveDate: values.effectiveDate } : {}),
      };
    case "pricing":
      return { title: values.title, duration: values.duration, price: values.price, body: values.body };
    case "credential":
      return {
        title: values.title,
        body: values.body,
        ...(optionalText(values.issuer) ? { issuer: values.issuer } : {}),
        ...(values.verificationStatus ? { verificationStatus: values.verificationStatus } : {}),
      };
    case "resource":
    case "service":
      return {
        title: values.title,
        body: values.body,
        ...(optionalText(values.href) ? { href: values.href } : {}),
      };
    case "pricing_note":
      return { title: values.title, body: values.body };
  }
}

export function setJsonValueAtPath(root: JsonValue, path: EditorPath, value: JsonValue): JsonValue {
  if (path.length === 0) return value;
  const [head, ...rest] = path;

  if (Array.isArray(root)) {
    const index = Number(head);
    if (!Number.isInteger(index) || index < 0 || index >= root.length) return root;
    const clone = [...root];
    clone[index] = setJsonValueAtPath(clone[index], rest, value);
    return clone;
  }

  if (!root || typeof root !== "object") return root;
  const key = String(head);
  if (rest.length === 0) return { ...root, [key]: value };
  if (!(key in root)) return root;
  return { ...root, [key]: setJsonValueAtPath(root[key], rest, value) };
}

export function removeJsonValueAtPath(root: JsonValue, path: EditorPath): JsonValue {
  if (path.length === 0 || !root || typeof root !== "object") return root;
  const [head, ...rest] = path;

  if (Array.isArray(root)) {
    const index = Number(head);
    if (!Number.isInteger(index) || index < 0 || index >= root.length) return root;
    if (rest.length === 0) return root;
    const clone = [...root];
    clone[index] = removeJsonValueAtPath(clone[index], rest);
    return clone;
  }

  const key = String(head);
  if (!(key in root)) return root;
  const clone = { ...root };
  if (rest.length === 0) {
    delete clone[key];
  } else {
    clone[key] = removeJsonValueAtPath(clone[key], rest);
  }
  return clone;
}

type CollectionRule = {
  blockType: ContentBlock["blockType"];
  path: string;
  label: string;
  min: number;
  max: number;
  template: JsonValue;
};

const collectionRules: CollectionRule[] = [
  { blockType: "introduction", path: "body", label: "paragraph", min: 1, max: 6, template: "Add approved copy." },
  { blockType: "card_collection", path: "cards", label: "card", min: 1, max: 8, template: { title: "New card", body: "Add detail." } },
  { blockType: "editorial_split", path: "body", label: "paragraph", min: 1, max: 8, template: "Add approved copy." },
  { blockType: "feature_list", path: "items", label: "item", min: 2, max: 12, template: { title: "New point", body: "Add detail." } },
  { blockType: "process", path: "steps", label: "step", min: 2, max: 8, template: { title: "New step", body: "Add detail." } },
  { blockType: "comparison", path: "columns", label: "column", min: 2, max: 3, template: { title: "New option", body: "Add detail.", points: ["New point"] } },
  { blockType: "comparison", path: "columns.*.points", label: "point", min: 1, max: 8, template: "New point" },
  { blockType: "pricing", path: "plans", label: "plan", min: 2, max: 4, template: { name: "New option", duration: "60 minutes", price: "R0", body: "Add detail." } },
  { blockType: "pricing", path: "notes", label: "note", min: 1, max: 6, template: "Add an approved pricing note." },
  { blockType: "faq", path: "items", label: "question", min: 1, max: 12, template: { question: "New question", answer: "Add the approved answer." } },
  { blockType: "notice", path: "body", label: "paragraph", min: 1, max: 5, template: "Add the approved notice." },
  { blockType: "reusable_collection", path: "keys", label: "entry key", min: 1, max: 12, template: "new-entry-key" },
];

export type OptionalFieldDefinition = {
  key: string;
  label: string;
  initialValue: JsonValue;
};

type OptionalFieldRule = OptionalFieldDefinition & {
  blockType: ContentBlock["blockType"];
  parentPath: string;
};

const optionalFieldRules: OptionalFieldRule[] = [
  { blockType: "hero", parentPath: "", key: "secondaryAction", label: "secondary action", initialValue: { label: "Learn more", href: "/about" } },
  { blockType: "hero", parentPath: "", key: "aside", label: "aside", initialValue: "Add supporting context." },
  { blockType: "hero", parentPath: "image", key: "caption", label: "image caption", initialValue: "Add an approved caption." },
  { blockType: "card_collection", parentPath: "cards.*", key: "kicker", label: "card kicker", initialValue: "Category" },
  { blockType: "card_collection", parentPath: "cards.*", key: "link", label: "card link", initialValue: { label: "Learn more", href: "/about" } },
  { blockType: "editorial_split", parentPath: "", key: "image", label: "image", initialValue: { src: "/images/renny-portrait-seated.jpg", alt: "Describe this image", width: 2048, height: 2048, position: "centre" } },
  { blockType: "editorial_split", parentPath: "", key: "action", label: "action", initialValue: { label: "Learn more", href: "/about" } },
  { blockType: "editorial_split", parentPath: "", key: "note", label: "note", initialValue: "Add a supporting note." },
  { blockType: "editorial_split", parentPath: "image", key: "caption", label: "image caption", initialValue: "Add an approved caption." },
  { blockType: "feature_list", parentPath: "", key: "introduction", label: "introduction", initialValue: "Introduce these key points." },
  { blockType: "process", parentPath: "", key: "introduction", label: "introduction", initialValue: "Introduce this process." },
  { blockType: "comparison", parentPath: "", key: "introduction", label: "introduction", initialValue: "Introduce this comparison." },
  { blockType: "comparison", parentPath: "columns.*", key: "link", label: "column link", initialValue: { label: "Learn more", href: "/about" } },
  { blockType: "reusable_collection", parentPath: "", key: "eyebrow", label: "eyebrow", initialValue: "Shared content" },
  { blockType: "reusable_collection", parentPath: "", key: "introduction", label: "introduction", initialValue: "Introduce these selected entries." },
];

function pathKey(path: EditorPath) {
  return path.map((part) => typeof part === "number" ? "*" : part).join(".");
}

function collectionRule(blockType: ContentBlock["blockType"], path: EditorPath) {
  const key = pathKey(path);
  return collectionRules.find((rule) => rule.blockType === blockType && rule.path === key);
}

export function getCollectionLimits(blockType: ContentBlock["blockType"], path: EditorPath) {
  const rule = collectionRule(blockType, path);
  return rule ? { label: rule.label, min: rule.min, max: rule.max } : null;
}

export function addCollectionMember(root: JsonValue, blockType: ContentBlock["blockType"], path: EditorPath): JsonValue {
  const rule = collectionRule(blockType, path);
  const collection = valueAtPath(root, path);
  if (!rule || !Array.isArray(collection) || collection.length >= rule.max) return root;
  return setJsonValueAtPath(root, path, [...collection, structuredClone(rule.template)]);
}

export function removeCollectionMember(root: JsonValue, blockType: ContentBlock["blockType"], path: EditorPath, index: number): JsonValue {
  const rule = collectionRule(blockType, path);
  const collection = valueAtPath(root, path);
  if (!rule || !Array.isArray(collection) || collection.length <= rule.min || index < 0 || index >= collection.length) return root;
  return setJsonValueAtPath(root, path, collection.filter((_, itemIndex) => itemIndex !== index));
}

export function getAvailableOptionalFields(
  blockType: ContentBlock["blockType"],
  parentPath: EditorPath,
  value: Record<string, JsonValue>,
): OptionalFieldDefinition[] {
  const parent = pathKey(parentPath);
  return optionalFieldRules
    .filter((rule) => rule.blockType === blockType && rule.parentPath === parent && !(rule.key in value))
    .map(({ key, label, initialValue }) => ({ key, label, initialValue: structuredClone(initialValue) }));
}

export function isOptionalFieldPath(blockType: ContentBlock["blockType"], path: EditorPath) {
  if (path.length === 0) return false;
  const parent = pathKey(path.slice(0, -1));
  const key = String(path.at(-1));
  return optionalFieldRules.some((rule) => rule.blockType === blockType && rule.parentPath === parent && rule.key === key);
}

function valueAtPath(root: JsonValue, path: EditorPath): JsonValue | undefined {
  let current: JsonValue | undefined = root;
  for (const part of path) {
    if (!current || typeof current !== "object") return undefined;
    current = Array.isArray(current) ? current[Number(part)] : current[String(part)];
  }
  return current;
}
