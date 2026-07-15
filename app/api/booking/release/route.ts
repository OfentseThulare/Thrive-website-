import { clearBookingAccessCookie, getBookingTokenHash, privateJson } from "@/lib/booking/server";
import { checkBookingRateLimit } from "@/lib/booking/rate-limit";
import { createBookingAdminClient } from "@/lib/supabase/booking-admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const tokenHash = await getBookingTokenHash();
  if (!tokenHash) return privateJson({ message: "This booking could not be released." }, { status: 404 });
  let supabase;
  try {
    supabase = createBookingAdminClient();
    if (!(await checkBookingRateLimit(supabase, request, "release"))) {
      return privateJson({ message: "Too many release requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": "900" } });
    }
  } catch {
    return privateJson({ message: "This booking could not be released safely." }, { status: 503 });
  }
  const { data, error } = await supabase.rpc("release_booking_hold", { p_access_token_hash: tokenHash });
  if (error || !data) return privateJson({ message: "This booking is no longer eligible for release." }, { status: 409 });
  await clearBookingAccessCookie();
  return privateJson({ ok: true });
}
