import { createBookingCalendarAdapter } from "@/lib/booking/calendar-factory";
import { checkBookingRateLimit } from "@/lib/booking/rate-limit";
import { holdRequestSchema } from "@/lib/booking/schemas";
import { createBookingSecrets, privateJson, setBookingAccessCookie } from "@/lib/booking/server";
import { intervalsOverlap } from "@/lib/booking/time";
import { createBookingAdminClient } from "@/lib/supabase/booking-admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let supabase;
  try {
    supabase = createBookingAdminClient();
    if (!(await checkBookingRateLimit(supabase, request, "hold"))) {
      return privateJson({ message: "Too many hold requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": "900" } });
    }
  } catch {
    return privateJson({ message: "Online booking is not configured yet." }, { status: 503 });
  }
  let payload: unknown;
  try { payload = await request.json(); } catch { return privateJson({ message: "The booking request was not valid." }, { status: 400 }); }
  const parsed = holdRequestSchema.safeParse(payload);
  if (!parsed.success) return privateJson({ message: "Check the highlighted booking details and try again." }, { status: 400 });
  const secrets = createBookingSecrets();
  const { data: recovered, error: recoveryError } = await supabase.rpc("recover_booking_hold", {
    p_idempotency_key: parsed.data.idempotencyKey,
    p_new_access_token_hash: secrets.accessTokenHash,
  }).maybeSingle();
  if (recoveryError) return privateJson({ message: "The booking request could not be verified safely." }, { status: 503 });
  if (recovered) {
    await setBookingAccessCookie(secrets.accessToken);
    return privateJson({ ok: true, next: "/book/status" }, { status: 200 });
  }
  let calendar;
  try { calendar = createBookingCalendarAdapter(); } catch { return privateJson({ message: "Calendar configuration needs attention." }, { status: 503 }); }
  if (calendar.name === "unavailable") return privateJson({ message: "Calendar availability is not enabled yet." }, { status: 503 });
  const start = new Date(parsed.data.startsAt);
  const { data: service, error: serviceError } = await supabase.from("services").select("duration_minutes,buffer_minutes").eq("id", parsed.data.serviceId).eq("active", true).eq("currency", "ZAR").maybeSingle();
  if (serviceError || !service) return privateJson({ message: "That service is not available for booking." }, { status: 409 });
  const end = new Date(start.getTime() + service.duration_minutes * 60 * 1000);
  const blockedUntil = new Date(end.getTime() + service.buffer_minutes * 60 * 1000);
  try {
    const busy = await calendar.freeBusy(start.toISOString(), blockedUntil.toISOString());
    if (busy.some((period) => intervalsOverlap({ startsAt: start.toISOString(), endsAt: blockedUntil.toISOString() }, period))) {
      return privateJson({ message: "That time has just become unavailable. Please choose another." }, { status: 409 });
    }
  } catch {
    return privateJson({ message: "Calendar availability cannot be verified right now. No time has been held." }, { status: 503 });
  }
  const { data, error } = await supabase.rpc("create_booking_hold", {
    p_service_id: parsed.data.serviceId,
    p_starts_at: parsed.data.startsAt,
    p_client_name: parsed.data.fullName,
    p_client_email: parsed.data.email,
    p_client_telephone: parsed.data.telephone || null,
    p_consent_version_id: parsed.data.consentVersionId,
    p_public_reference: secrets.publicReference,
    p_idempotency_key: parsed.data.idempotencyKey,
    p_access_token_hash: secrets.accessTokenHash,
  }).maybeSingle();
  if (error || !data) return privateJson({ message: "That time could not be held. It may no longer be available." }, { status: 409 });
  await setBookingAccessCookie(secrets.accessToken);
  return privateJson({ ok: true, next: "/book/status" }, { status: 201 });
}
