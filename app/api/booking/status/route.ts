import { getBookingStatus, privateJson } from "@/lib/booking/server";
import { checkBookingRateLimit } from "@/lib/booking/rate-limit";
import { createBookingAdminClient } from "@/lib/supabase/booking-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = createBookingAdminClient();
    if (!(await checkBookingRateLimit(supabase, request, "status"))) {
      return privateJson({ message: "Too many status requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": "600" } });
    }
  } catch {
    return privateJson({ message: "Booking status is not configured yet." }, { status: 503 });
  }
  const status = await getBookingStatus();
  if (!status) return privateJson({ message: "This booking could not be found." }, { status: 404 });
  return privateJson({ booking: status });
}
