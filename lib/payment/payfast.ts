import { createHash, timingSafeEqual } from "node:crypto";

export type OrderedField = readonly [name: string, value: string | number | null | undefined];

export function phpUrlEncode(value: string) {
  return encodeURIComponent(value)
    .replace(/[!'()*~]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, "+");
}

export function serialisePayFastFields(fields: readonly OrderedField[]) {
  return fields
    .filter(([, raw]) => raw !== null && raw !== undefined && String(raw).trim() !== "")
    .map(([name, raw]) => `${phpUrlEncode(name)}=${phpUrlEncode(String(raw).trim())}`)
    .join("&");
}

export function signPayFastFields(fields: readonly OrderedField[], passphrase: string) {
  const encoded = serialisePayFastFields(fields);
  const signed = passphrase.trim() ? `${encoded}&passphrase=${phpUrlEncode(passphrase.trim())}` : encoded;
  return createHash("md5").update(signed, "utf8").digest("hex");
}

export function safeSignatureEqual(received: string, expected: string) {
  if (!/^[a-f0-9]{32}$/i.test(received) || !/^[a-f0-9]{32}$/i.test(expected)) return false;
  return timingSafeEqual(Buffer.from(received.toLowerCase(), "hex"), Buffer.from(expected.toLowerCase(), "hex"));
}

export function parseOrderedFormBody(raw: string) {
  if (!raw || raw.length > 32_000) throw new Error("PAYFAST_BODY_INVALID");
  const segments = raw.split("&");
  const fields: Array<readonly [string, string]> = [];
  let signature = "";
  const names = new Set<string>();
  for (const segment of segments) {
    const separator = segment.indexOf("=");
    if (separator < 1) throw new Error("PAYFAST_BODY_INVALID");
    const name = decodeFormPart(segment.slice(0, separator));
    const value = decodeFormPart(segment.slice(separator + 1));
    if (names.has(name)) throw new Error("PAYFAST_DUPLICATE_FIELD");
    names.add(name);
    if (name === "signature") signature = value;
    else fields.push([name, value]);
  }
  if (!signature) throw new Error("PAYFAST_SIGNATURE_MISSING");
  const values = Object.fromEntries(fields);
  const validationBody = segments.filter((segment) => !segment.startsWith("signature=")).join("&");
  return { fields, values, signature, validationBody };
}

function decodeFormPart(value: string) {
  try { return decodeURIComponent(value.replace(/\+/g, " ")); }
  catch { throw new Error("PAYFAST_BODY_INVALID"); }
}

export function parseZarCents(value: string) {
  if (!/^\d{1,9}\.\d{2}$/.test(value)) return null;
  const [rands, cents] = value.split(".");
  const parsed = Number(rands) * 100 + Number(cents);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function formatPayFastAmount(cents: number) {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error("PAYFAST_AMOUNT_INVALID");
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

export function validateItnFields(values: Record<string, string>, expectedMerchantId: string) {
  if (values.merchant_id !== expectedMerchantId) return { ok: false as const, code: "MERCHANT_MISMATCH" };
  if (values.payment_status !== "COMPLETE") return { ok: false as const, code: "STATUS_INVALID" };
  if (!/^TTC-PF-[A-F0-9]{24}$/.test(values.m_payment_id ?? "")) return { ok: false as const, code: "REFERENCE_INVALID" };
  if (!values.pf_payment_id || values.pf_payment_id.length > 100) return { ok: false as const, code: "PROVIDER_REFERENCE_INVALID" };
  const amountCents = parseZarCents(values.amount_gross ?? "");
  if (amountCents === null) return { ok: false as const, code: "AMOUNT_INVALID" };
  return { ok: true as const, amountCents };
}

export function remoteValidationSucceeded(status: number, body: string) {
  return status >= 200 && status < 300 && body.trim() === "VALID";
}

export function rejectedReceiptId(payloadHash: string) {
  if (!/^[a-f0-9]{64}$/.test(payloadHash)) throw new Error("PAYFAST_RECEIPT_HASH_INVALID");
  return `rejected-${payloadHash.slice(0, 48)}`;
}

export function buildCheckoutFields(input: {
  merchantId: string; merchantKey: string; merchantPaymentId: string; amountCents: number;
  itemName: string; returnUrl: string; cancelUrl: string; notifyUrl: string;
}) {
  if (input.amountCents < 500) throw new Error("PAYFAST_MINIMUM_AMOUNT");
  return [
    ["merchant_id", input.merchantId],
    ["merchant_key", input.merchantKey],
    ["return_url", input.returnUrl],
    ["cancel_url", input.cancelUrl],
    ["notify_url", input.notifyUrl],
    ["m_payment_id", input.merchantPaymentId],
    ["amount", formatPayFastAmount(input.amountCents)],
    ["item_name", input.itemName.slice(0, 100)],
  ] as const satisfies readonly OrderedField[];
}
