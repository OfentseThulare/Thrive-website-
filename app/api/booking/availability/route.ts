import { createBookingCalendarAdapter } from "@/lib/booking/calendar-factory";
import { checkBookingRateLimit } from "@/lib/booking/rate-limit";
import { availabilityRequestSchema } from "@/lib/booking/schemas";
import { privateJson } from "@/lib/booking/server";
import { removeBusySlots } from "@/lib/booking/time";
import type { BookingSlot } from "@/lib/booking/types";
import { createBookingAdminClient } from "@/lib/supabase/booking-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = availabilityRequestSchema.safeParse({ serviceId: url.searchParams.get("serviceId"), from: url.searchParams.get("from"), to: url.searchParams.get("to") });
  if (!parsed.success) return privateJson({ message: "Choose a valid service and date range." }, { status: 400 });
  let supabase;
  try {
    supabase = createBookingAdminClient();
    if (!(await checkBookingRateLimit(supabase, request, "availability"))) {
      return privateJson({ message: "Too many availability checks. Please try again shortly." }, { status: 429, headers: { "Retry-After": "600" } });
    }
  } catch {
    return privateJson({ message: "Online booking is not configured yet." }, { status: 503 });
  }
  let calendar;
  try { calendar = createBookingCalendarAdapter(); } catch { return privateJson({ message: "Calendar configuration needs attention." }, { status: 503 }); }
  if (calendar.name === "unavailable") return privateJson({ message: "Calendar availability is not enabled yet." }, { status: 503 });
  const { data, error } = await supabase.rpc("list_booking_slots", { p_service_id: parsed.data.serviceId, p_from: parsed.data.from, p_to: parsed.data.to });
  if (error) return privateJson({ message: "Availability could not be checked. Please try again." }, { status: 503 });
  const slots: BookingSlot[] = (data ?? []).map((row: Record<string, unknown>) => ({ startsAt: String(row.starts_at), endsAt: String(row.ends_at), blockedUntil: String(row.blocked_until) }));
  try {
    const busy = await calendar.freeBusy(`${parsed.data.from}T00:00:00+02:00`, `${parsed.data.to}T23:59:59+02:00`);
    return privateJson({ slots: removeBusySlots(slots, busy), timeZone: "Africa/Johannesburg" });
  } catch {
    return privateJson({ message: "Calendar availability cannot be verified right now. No times have been offered." }, { status: 503 });
  }
}
