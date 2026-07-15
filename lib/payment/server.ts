import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { createBookingCalendarAdapter } from "@/lib/booking/calendar-factory";
import { getBookingTokenHash } from "@/lib/booking/server";
import { getPayFastEnvironment, getSiteUrl } from "@/lib/env";
import { createBookingAdminClient } from "@/lib/supabase/booking-admin";
import { buildCheckoutFields, signPayFastFields } from "./payfast";

export function paymentConfiguration() {
  try {
    const environment = getPayFastEnvironment();
    return { enabled: environment.mode !== "disabled", environment } as const;
  } catch {
    return { enabled: false, environment: { mode: "disabled" as const } } as const;
  }
}

export async function createCheckout(acceptance: { legal: boolean; earlyPerformance: boolean }) {
  const configuration = paymentConfiguration();
  if (!configuration.enabled || configuration.environment.mode === "disabled") throw new Error("PAYFAST_DISABLED");
  const tokenHash = await getBookingTokenHash();
  if (!tokenHash) throw new Error("PAYMENT_BOOKING_UNAVAILABLE");
  const merchantPaymentId = `TTC-PF-${randomUUID().replaceAll("-", "").slice(0, 24).toUpperCase()}`;
  const supabase = createBookingAdminClient();
  const { data, error } = await supabase.rpc("create_payfast_payment_attempt", {
    p_access_token_hash: tokenHash,
    p_provider_reference: merchantPaymentId,
    p_idempotency_key: randomUUID(),
    p_legal_version: configuration.environment.legalVersion,
    p_legal_accepted: acceptance.legal,
    p_early_performance_accepted: acceptance.earlyPerformance,
  }).maybeSingle();
  if (error || !data) throw new Error("PAYMENT_ATTEMPT_FAILED");
  const row = data as Record<string, unknown>;
  const site = getSiteUrl();
  const fields = buildCheckoutFields({
    merchantId: configuration.environment.merchantId,
    merchantKey: configuration.environment.merchantKey,
    merchantPaymentId: String(row.merchant_payment_id),
    amountCents: Number(row.amount_cents),
    itemName: String(row.item_name),
    returnUrl: new URL("/payment/return", site).toString(),
    cancelUrl: new URL("/payment/cancel", site).toString(),
    notifyUrl: new URL("/api/payment/payfast/itn", site).toString(),
  });
  return {
    processUrl: configuration.environment.processUrl,
    fields: [...fields, ["signature", signPayFastFields(fields, configuration.environment.passphrase)] as const],
  };
}

export async function finaliseCalendarForPaidBooking(row: Record<string, unknown>) {
  const supabase = createBookingAdminClient();
  const bookingId = String(row.booking_id);
  if (row.calendar_event_id || row.calendar_eligible === false) return true;
  try {
    const calendar = createBookingCalendarAdapter();
    if (calendar.name === "unavailable") throw new Error("CALENDAR_DISABLED");
    const result = await calendar.createEvent({
      operationId: bookingId,
      bookingReference: String(row.booking_reference),
      startsAt: String(row.starts_at),
      endsAt: String(row.ends_at),
      summary: "Thrive Through Cancer session",
    });
    const { data, error } = await supabase.rpc("finalise_paid_booking_calendar", {
      p_booking_id: bookingId, p_succeeded: true,
      p_external_event_id: result.externalEventId, p_error_code: null,
    });
    return !error && data === true;
  } catch {
    await supabase.rpc("finalise_paid_booking_calendar", {
      p_booking_id: bookingId, p_succeeded: false,
      p_external_event_id: null, p_error_code: "CALENDAR_UNAVAILABLE",
    });
    return false;
  }
}

export function receiptHash(raw: string) {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}
