import { createHmac } from "node:crypto";

const ACCESS_TOKEN_DOMAIN = "thrive-booking-access:v1\0";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function deriveBookingAccessToken(idempotencyKey: string, secret: string) {
  if (!UUID_PATTERN.test(idempotencyKey) || secret.length < 32) {
    throw new Error("BOOKING_ACCESS_TOKEN_INPUT_INVALID");
  }
  return createHmac("sha256", secret)
    .update(ACCESS_TOKEN_DOMAIN, "utf8")
    .update(idempotencyKey.toLowerCase(), "utf8")
    .digest("base64url");
}
