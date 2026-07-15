import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { parsePayFastEnvironment } from "../lib/env/schema.ts";
import { ipv4InCidr, isTrustedPayFastAddress, requestPayFastAddress } from "../lib/payment/ip.ts";
import {
  buildCheckoutFields, formatPayFastAmount, parseOrderedFormBody, parseZarCents,
  phpUrlEncode, remoteValidationSucceeded, safeSignatureEqual, serialisePayFastFields,
  signPayFastFields, validateItnFields, rejectedReceiptId,
} from "../lib/payment/payfast.ts";

const merchantPaymentId = "TTC-PF-1234567890ABCDEF12345678";

test("PayFast uses PHP-compatible single encoding and lowercase MD5", () => {
  assert.equal(phpUrlEncode("tea & ~ * care"), "tea+%26+%7E+%2A+care");
  const fields = [["merchant_id", "10000100"], ["item_name", "Care & support"]] as const;
  assert.equal(serialisePayFastFields(fields), "merchant_id=10000100&item_name=Care+%26+support");
  assert.match(signPayFastFields(fields, "secret phrase"), /^[a-f0-9]{32}$/);
  assert.equal(safeSignatureEqual(signPayFastFields(fields, "secret phrase"), signPayFastFields(fields, "secret phrase")), true);
  assert.equal(safeSignatureEqual("bad", signPayFastFields(fields, "secret phrase")), false);
});

test("checkout fields are ordered, server-shaped and enforce PayFast minimum", () => {
  const fields = buildCheckoutFields({ merchantId: "merchant", merchantKey: "key", merchantPaymentId, amountCents: 178500, itemName: "Foundation Session", returnUrl: "https://example.test/payment/return", cancelUrl: "https://example.test/payment/cancel", notifyUrl: "https://example.test/api/payment/payfast/itn" });
  assert.deepEqual(fields.map(([name]) => name), ["merchant_id", "merchant_key", "return_url", "cancel_url", "notify_url", "m_payment_id", "amount", "item_name"]);
  assert.equal(formatPayFastAmount(178500), "1785.00");
  assert.throws(() => buildCheckoutFields({ merchantId: "m", merchantKey: "k", merchantPaymentId, amountCents: 499, itemName: "Test", returnUrl: "https://e.test/payment/return", cancelUrl: "https://e.test/payment/cancel", notifyUrl: "https://e.test/itn" }), /PAYFAST_MINIMUM_AMOUNT/);
});

test("ordered ITN parser preserves validation bytes and rejects duplicate keys", () => {
  const body = "m_payment_id=TTC-PF-1234567890ABCDEF12345678&amount_gross=700.00&signature=0123456789abcdef0123456789abcdef";
  const parsed = parseOrderedFormBody(body);
  assert.equal(parsed.validationBody, "m_payment_id=TTC-PF-1234567890ABCDEF12345678&amount_gross=700.00");
  assert.throws(() => parseOrderedFormBody(`${body}&amount_gross=1.00`), /PAYFAST_DUPLICATE_FIELD/);
});

test("ITN field fixtures reject bad merchant, amount, reference and status", () => {
  const valid = { merchant_id: "merchant", payment_status: "COMPLETE", m_payment_id: merchantPaymentId, pf_payment_id: "pf-1", amount_gross: "700.00" };
  assert.deepEqual(validateItnFields(valid, "merchant"), { ok: true, amountCents: 70000 });
  assert.equal(validateItnFields({ ...valid, merchant_id: "other" }, "merchant").code, "MERCHANT_MISMATCH");
  assert.equal(validateItnFields({ ...valid, amount_gross: "700.001" }, "merchant").code, "AMOUNT_INVALID");
  assert.equal(validateItnFields({ ...valid, m_payment_id: "browser-ref" }, "merchant").code, "REFERENCE_INVALID");
  assert.equal(validateItnFields({ ...valid, payment_status: "FAILED" }, "merchant").code, "STATUS_INVALID");
  assert.equal(parseZarCents("700.00"), 70000);
});

test("remote validation accepts only an exact VALID response", () => {
  assert.equal(remoteValidationSucceeded(200, "VALID"), true);
  assert.equal(remoteValidationSucceeded(200, "INVALID"), false);
  assert.equal(remoteValidationSucceeded(503, "VALID"), false);
});

test("rejected and transient receipts use a hash-derived namespace", () => {
  const hash = "a".repeat(64);
  assert.equal(rejectedReceiptId(hash), `rejected-${"a".repeat(48)}`);
  assert.notEqual(rejectedReceiptId(hash), "pf-provider-event-1");
  assert.throws(() => rejectedReceiptId("pf-provider-event-1"), /PAYFAST_RECEIPT_HASH_INVALID/);
});

test("official PayFast IPv4 networks use real CIDR membership", () => {
  assert.equal(ipv4InCidr("197.97.145.144", "197.97.145.144/28"), true);
  assert.equal(ipv4InCidr("197.97.145.159", "197.97.145.144/28"), true);
  assert.equal(ipv4InCidr("197.97.145.160", "197.97.145.144/28"), false);
  assert.equal(isTrustedPayFastAddress("144.126.193.139"), true);
  assert.equal(isTrustedPayFastAddress("144.126.193.140"), false);
  assert.equal(requestPayFastAddress(new Headers({ "x-forwarded-for": "197.97.145.144", "x-vercel-forwarded-for": "203.0.113.8" }), "production"), "203.0.113.8");
  assert.equal(requestPayFastAddress(new Headers({ "x-payfast-test-ip": "197.97.145.144" }), "test"), "197.97.145.144");
});

test("PayFast environment fails closed and forbids sandbox in production", () => {
  assert.deepEqual(parsePayFastEnvironment({}, "production"), { mode: "disabled" });
  const configured = { PAYFAST_MODE: "sandbox", PAYFAST_MERCHANT_ID: "id", PAYFAST_MERCHANT_KEY: "key", PAYFAST_PASSPHRASE: "phrase", PAYMENT_LEGAL_APPROVED: "true", PAYMENT_LEGAL_VERSION: "15/07/2026-client-approved" };
  assert.throws(() => parsePayFastEnvironment(configured, "production"), /forbidden/);
  assert.throws(() => parsePayFastEnvironment({ ...configured, PAYMENT_LEGAL_APPROVED: "false" }, "test"), /Approved/);
  const sandbox = parsePayFastEnvironment(configured, "test");
  assert.equal(sandbox.mode, "sandbox");
  assert.equal("processUrl" in sandbox && sandbox.processUrl, "https://sandbox.payfast.co.za/eng/process");
});

test("return and cancel pages never mutate payment state", async () => {
  for (const path of ["app/payment/return/page.tsx", "app/payment/cancel/page.tsx"]) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\.rpc\(|from\("payments"\)|PAYMENT_PENDING.*PAID/);
  }
});

test("payment surfaces collect no card fields and keep secrets server-only", async () => {
  const checkout = await readFile(new URL("../app/api/payment/checkout/route.ts", import.meta.url), "utf8");
  const status = await readFile(new URL("../app/book/status/page.tsx", import.meta.url), "utf8");
  const environment = await readFile(new URL("../lib/env/schema.ts", import.meta.url), "utf8");
  assert.doesNotMatch(`${checkout}\n${status}`, /card_number|cvv|cvc|expiry_month|expiry_year/i);
  assert.doesNotMatch(environment, /NEXT_PUBLIC_PAYFAST|NEXT_PUBLIC_SUPABASE_SERVICE_ROLE/);
});
