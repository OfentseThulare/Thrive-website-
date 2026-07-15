import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import { createBookingAdminClient } from "@/lib/supabase/booking-admin";
import { getBookingServerEnvironment } from "@/lib/env";
import { deriveBookingAccessToken } from "./access-token";
import { BOOKING_COOKIE, type BookingStatus } from "./types";

export function createBookingSecrets(idempotencyKey: string) {
  const { accessTokenSecret } = getBookingServerEnvironment();
  const accessToken = deriveBookingAccessToken(idempotencyKey, accessTokenSecret);
  const publicReference = `TTC-${randomBytes(9).toString("hex").slice(0, 12).toUpperCase()}`;
  return { accessToken, accessTokenHash: hashBookingToken(accessToken), publicReference };
}

export function hashBookingToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export async function setBookingAccessCookie(token: string) {
  const store = await cookies();
  store.set(BOOKING_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
}

export async function clearBookingAccessCookie() {
  const store = await cookies();
  store.set(BOOKING_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: 0, path: "/" });
}

export async function getBookingTokenHash() {
  const token = (await cookies()).get(BOOKING_COOKIE)?.value;
  if (!token || token.length < 32 || token.length > 128) return null;
  return hashBookingToken(token);
}

export async function getBookingStatus(): Promise<BookingStatus | null> {
  const tokenHash = await getBookingTokenHash();
  if (!tokenHash) return null;
  let supabase;
  try { supabase = createBookingAdminClient(); } catch { return null; }
  const { data, error } = await supabase.rpc("get_booking_status", { p_access_token_hash: tokenHash }).maybeSingle();
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  return {
    publicReference: String(row.public_reference),
    serviceName: String(row.service_name),
    startsAt: String(row.starts_at),
    endsAt: String(row.ends_at),
    state: row.state as BookingStatus["state"],
    holdExpiresAt: row.hold_expires_at ? String(row.hold_expires_at) : null,
    priceCents: Number(row.price_cents),
    currency: "ZAR",
  };
}

export function privateJson(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store, private");
  headers.set("X-Content-Type-Options", "nosniff");
  return Response.json(body, { ...init, headers });
}
