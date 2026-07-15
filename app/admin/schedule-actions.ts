"use server";

import { revalidatePath } from "next/cache";

import { getCmsIdentity } from "@/lib/cms/auth";
import { CmsMfaRequiredError, requireCmsRole } from "@/lib/cms/permissions";
import { availabilityExceptionInputSchema, availabilityRuleInputSchema, bookingTransitionSchema, consentInputSchema, scheduleRecordIdSchema, serviceInputSchema } from "@/lib/booking/schemas";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createBookingAdminClient } from "@/lib/supabase/booking-admin";
import { finaliseCalendarForPaidBooking } from "@/lib/payment/server";

function values(formData: FormData) { return Object.fromEntries(formData.entries()); }

async function schedulerClient() {
  const supabase = await createServerSupabaseClient();
  const identity = await getCmsIdentity();
  if (!supabase || !identity) throw new Error("SCHEDULER_UNAVAILABLE");
  requireCmsRole(identity.roles, ["owner", "scheduler"]);
  if (identity.roles.includes("owner")) {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || data.currentLevel !== "aal2") throw new CmsMfaRequiredError();
  }
  return { supabase, identity };
}

export async function saveServiceAction(formData: FormData) {
  const input = serviceInputSchema.parse(values(formData));
  const { supabase } = await schedulerClient();
  const record = { slug: input.slug, name: input.name, description: input.description, duration_minutes: input.durationMinutes, buffer_minutes: input.bufferMinutes, price_cents: Math.round(input.priceRands * 100), currency: "ZAR", active: input.active, position: input.position };
  const result = input.id
    ? await supabase.from("services").update(record).eq("id", input.id).select("id").maybeSingle()
    : await supabase.from("services").insert(record).select("id").maybeSingle();
  if (result.error || !result.data) throw new Error("SERVICE_SAVE_FAILED");
  revalidatePath("/admin/schedule/services"); revalidatePath("/book");
}

export async function saveAvailabilityRuleAction(formData: FormData) {
  const input = availabilityRuleInputSchema.parse(values(formData));
  if (input.endsAt <= input.startsAt) throw new Error("AVAILABILITY_TIME_INVALID");
  const { supabase } = await schedulerClient();
  const record = { service_id: input.serviceId, weekday: input.weekday, starts_at: input.startsAt, ends_at: input.endsAt, timezone: "Africa/Johannesburg", effective_from: input.effectiveFrom, effective_until: input.effectiveUntil, active: input.active };
  const result = input.id
    ? await supabase.from("availability_rules").update(record).eq("id", input.id).select("id").maybeSingle()
    : await supabase.from("availability_rules").insert(record).select("id").maybeSingle();
  if (result.error || !result.data) throw new Error("AVAILABILITY_SAVE_FAILED");
  revalidatePath("/admin/schedule/availability");
}

export async function deleteAvailabilityRuleAction(formData: FormData) {
  const input = scheduleRecordIdSchema.parse(values(formData));
  const { supabase } = await schedulerClient();
  const { data, error } = await supabase.from("availability_rules").delete().eq("id", input.id).select("id").maybeSingle();
  if (error || !data) throw new Error("AVAILABILITY_DELETE_FAILED");
  revalidatePath("/admin/schedule/availability");
}

export async function saveAvailabilityExceptionAction(formData: FormData) {
  const input = availabilityExceptionInputSchema.parse(values(formData));
  const startsAt = new Date(`${input.startsAt}:00+02:00`);
  const endsAt = new Date(`${input.endsAt}:00+02:00`);
  if (!(endsAt > startsAt)) throw new Error("EXCEPTION_TIME_INVALID");
  const { supabase } = await schedulerClient();
  const record = { service_id: input.serviceId, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), available: input.available, reason: input.reason || null };
  const result = input.id
    ? await supabase.from("availability_exceptions").update(record).eq("id", input.id).select("id").maybeSingle()
    : await supabase.from("availability_exceptions").insert(record).select("id").maybeSingle();
  if (result.error || !result.data) throw new Error("EXCEPTION_SAVE_FAILED");
  revalidatePath("/admin/schedule/exceptions");
}

export async function deleteAvailabilityExceptionAction(formData: FormData) {
  const input = scheduleRecordIdSchema.parse(values(formData));
  const { supabase } = await schedulerClient();
  const { data, error } = await supabase.from("availability_exceptions").delete().eq("id", input.id).select("id").maybeSingle();
  if (error || !data) throw new Error("EXCEPTION_DELETE_FAILED");
  revalidatePath("/admin/schedule/exceptions");
}

export async function addConsentVersionAction(formData: FormData) {
  const input = consentInputSchema.parse(values(formData));
  const { supabase } = await schedulerClient();
  const { data, error } = await supabase.rpc("save_booking_consent_version", {
    p_version: input.version,
    p_wording: input.wording,
    p_active: input.active,
    p_effective_at: new Date(`${input.effectiveAt}:00+02:00`).toISOString(),
  });
  if (error || !data) throw new Error("CONSENT_SAVE_FAILED");
  revalidatePath("/admin/schedule/consents"); revalidatePath("/book");
}

export async function transitionBookingAction(formData: FormData) {
  const input = bookingTransitionSchema.parse(values(formData));
  const { supabase } = await schedulerClient();
  const { data, error } = await supabase.rpc("transition_booking_state", { p_booking_id: input.bookingId, p_to_state: input.toState });
  if (error || data !== true) throw new Error("BOOKING_TRANSITION_FAILED");
  revalidatePath(`/admin/schedule/bookings/${input.bookingId}`); revalidatePath("/admin/schedule/bookings");
}

export async function retryCalendarSyncAction(formData: FormData) {
  const input = scheduleRecordIdSchema.parse({ id: formData.get("bookingId") });
  const { supabase } = await schedulerClient();
  const { data, error } = await supabase.rpc("retry_failed_calendar_sync", { p_booking_id: input.id });
  if (error || data !== true) throw new Error("CALENDAR_RETRY_QUEUE_FAILED");
  const admin = createBookingAdminClient();
  const { data: booking, error: bookingError } = await admin.from("bookings")
    .select("id,public_reference,starts_at,ends_at,calendar_event_id,services(name)")
    .eq("id", input.id).maybeSingle();
  if (bookingError || !booking) throw new Error("CALENDAR_RETRY_LOAD_FAILED");
  const service = booking.services as unknown as {name:string};
  await finaliseCalendarForPaidBooking({
    booking_id: booking.id, booking_reference: booking.public_reference,
    starts_at: booking.starts_at, ends_at: booking.ends_at,
    service_name: service.name, calendar_event_id: booking.calendar_event_id,
    calendar_eligible: true,
  });
  revalidatePath(`/admin/schedule/bookings/${input.id}`);
  revalidatePath("/admin/schedule/bookings");
}
