import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getBookingServerEnvironment } from "@/lib/env";

export type BookingRateLimitScope = "services" | "availability" | "hold" | "status" | "release";

function requestAddress(request: Request) {
  const forwarded = request.headers.get("x-vercel-forwarded-for")
    ?? request.headers.get("x-forwarded-for")
    ?? request.headers.get("x-real-ip");
  const address = forwarded?.split(",", 1)[0]?.trim();
  if (address) return address;
  if (process.env.NODE_ENV === "production") throw new Error("BOOKING_CLIENT_ADDRESS_UNAVAILABLE");
  return "local-development";
}

export async function checkBookingRateLimit(
  supabase: SupabaseClient,
  request: Request,
  scope: BookingRateLimitScope,
) {
  const { rateLimitSecret } = getBookingServerEnvironment();
  const fingerprintHash = createHash("sha256")
    .update(`${rateLimitSecret}\0${requestAddress(request)}`, "utf8")
    .digest("hex");
  const { data, error } = await supabase.rpc("check_booking_rate_limit", {
    p_scope: scope,
    p_fingerprint_hash: fingerprintHash,
  });
  if (error || typeof data !== "boolean") throw new Error("BOOKING_RATE_LIMIT_UNAVAILABLE");
  return data;
}
