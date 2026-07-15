import assert from "node:assert/strict";
import test from "node:test";

import { deriveBookingAccessToken } from "../lib/booking/access-token.ts";

const secret = "test-only-booking-access-secret-32-characters";
const key = "83000000-0000-4000-8000-000000000001";

test("booking access capability is deterministic, opaque and domain separated", () => {
  const token = deriveBookingAccessToken(key, secret);
  assert.equal(token, deriveBookingAccessToken(key.toUpperCase(), secret));
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(token, deriveBookingAccessToken("83000000-0000-4000-8000-000000000002", secret));
  assert.notEqual(token, deriveBookingAccessToken(key, `${secret}-different`));
  assert.doesNotMatch(token, /83000000/);
});

test("booking access capability rejects weak secrets and malformed keys", () => {
  assert.throws(() => deriveBookingAccessToken(key, "too-short"), /INPUT_INVALID/);
  assert.throws(() => deriveBookingAccessToken("not-a-uuid", secret), /INPUT_INVALID/);
});
