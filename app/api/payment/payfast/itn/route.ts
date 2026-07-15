import { getPayFastEnvironment } from "@/lib/env";
import { isTrustedPayFastAddress, requestPayFastAddress } from "@/lib/payment/ip";
import { parseOrderedFormBody, remoteValidationSucceeded, safeSignatureEqual, signPayFastFields, validateItnFields } from "@/lib/payment/payfast";
import { finaliseCalendarForPaidBooking, receiptHash } from "@/lib/payment/server";
import { createBookingAdminClient } from "@/lib/supabase/booking-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function response(status: number) {
  return new Response(status === 200 ? "OK" : "REJECTED", { status, headers: {
    "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
  } });
}

async function recordRejected(hash: string, signatureValid: boolean, code: string) {
  try {
    await createBookingAdminClient().rpc("record_payfast_webhook_receipt", {
      p_provider_event_id: `rejected-${hash.slice(0, 48)}`,
      p_payload_hash: hash, p_signature_valid: signatureValid, p_error: code,
    });
  } catch { /* The rejection response remains fail closed. */ }
}

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")) return response(415);
  const address = requestPayFastAddress(request.headers);
  if (!isTrustedPayFastAddress(address)) return response(403);
  const raw = await request.text();
  const hash = receiptHash(raw);
  let parsed;
  let environment;
  try { parsed = parseOrderedFormBody(raw); environment = getPayFastEnvironment(); }
  catch { await recordRejected(hash, false, "CONFIG_OR_BODY_INVALID"); return response(400); }
  if (environment.mode === "disabled") { await recordRejected(hash, false, "PAYFAST_DISABLED"); return response(503); }
  const expected = signPayFastFields(parsed.fields, environment.passphrase);
  if (!safeSignatureEqual(parsed.signature, expected)) {
    await recordRejected(hash, false, "SIGNATURE_INVALID");
    return response(400);
  }
  const fields = validateItnFields(parsed.values, environment.merchantId);
  if (!fields.ok) {
    await recordRejected(hash, true, "ITN_FIELDS_INVALID");
    return response(422);
  }
  let validation: Response;
  try {
    validation = await fetch(environment.validateUrl, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: parsed.validationBody, cache: "no-store", signal: AbortSignal.timeout(5_000), redirect: "error",
    });
  } catch { return response(503); }
  if (!remoteValidationSucceeded(validation.status, await validation.text())) {
    await recordRejected(hash, true, "REMOTE_VALIDATION_INVALID");
    return response(422);
  }
  const supabase = createBookingAdminClient();
  const { data, error } = await supabase.rpc("process_payfast_itn", {
    p_merchant_payment_id: parsed.values.m_payment_id,
    p_pf_payment_id: parsed.values.pf_payment_id,
    p_amount_cents: fields.amountCents, p_payload_hash: hash,
  }).maybeSingle();
  if (error || !data) return response(409);
  const row = data as Record<string, unknown>;
  if (!row.calendar_event_id) await finaliseCalendarForPaidBooking(row);
  return response(200);
}

export function GET() { return response(405); }
