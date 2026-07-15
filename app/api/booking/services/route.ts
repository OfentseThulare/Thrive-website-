import { createBookingCalendarAdapter } from "@/lib/booking/calendar-factory";
import { checkBookingRateLimit } from "@/lib/booking/rate-limit";
import { privateJson } from "@/lib/booking/server";
import { createBookingAdminClient } from "@/lib/supabase/booking-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  let supabase;
  try {
    supabase = createBookingAdminClient();
    if (!(await checkBookingRateLimit(supabase, request, "services"))) {
      return privateJson({ available: false, message: "Too many booking requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": "600" } });
    }
  } catch {
    return privateJson({ available: false, message: "Online booking is not configured yet." }, { status: 503 });
  }
  let calendar;
  try { calendar = createBookingCalendarAdapter(); } catch { return privateJson({ available: false, message: "Online booking configuration needs attention." }, { status: 503 }); }
  const health = await calendar.health();
  if (!health.available) return privateJson({ available: false, message: health.message }, { status: 503 });
  const [{ data: services, error: serviceError }, { data: consent, error: consentError }] = await Promise.all([
    supabase.from("services").select("id,slug,name,description,duration_minutes,buffer_minutes,price_cents,currency").eq("active", true).eq("currency", "ZAR").order("position"),
    supabase.from("consent_versions").select("id,version,wording,effective_at").eq("purpose", "booking").eq("active", true).lte("effective_at", new Date().toISOString()).or(`retired_at.is.null,retired_at.gt.${new Date().toISOString()}`).order("effective_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (serviceError || consentError || !services?.length || !consent) {
    return privateJson({ available: false, message: "Booking services, availability or consent are not ready yet." }, { status: 503 });
  }
  return privateJson({
    available: true,
    services: services.map((service) => ({
      id: service.id, slug: service.slug, name: service.name, description: service.description,
      durationMinutes: service.duration_minutes, bufferMinutes: service.buffer_minutes,
      priceCents: service.price_cents, currency: "ZAR",
    })),
    consent: { id: consent.id, version: consent.version, wording: consent.wording },
    timeZone: "Africa/Johannesburg",
  });
}
