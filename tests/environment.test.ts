import assert from "node:assert/strict";
import test from "node:test";

import {
  parsePublicSupabaseEnvironment,
  parseBookingServerEnvironment,
  parseSiteUrl,
  requireServerEnvironment,
} from "../lib/env/schema.ts";

test("public Supabase environment permits explicit seed mode", () => {
  assert.equal(parsePublicSupabaseEnvironment({}), null);
  assert.equal(
    parsePublicSupabaseEnvironment({
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    }),
    null,
  );
});

test("public Supabase environment rejects partial configuration", () => {
  assert.throws(
    () =>
      parsePublicSupabaseEnvironment({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      }),
    /partially configured/,
  );
});

test("public Supabase environment rejects unsafe or malformed values", () => {
  assert.throws(() =>
    parsePublicSupabaseEnvironment({
      NEXT_PUBLIC_SUPABASE_URL: "http://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "a-valid-looking-anonymous-key",
    }),
  );
  assert.throws(() =>
    parsePublicSupabaseEnvironment({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "short",
    }),
  );
});

test("public Supabase environment returns only browser safe settings", () => {
  assert.deepEqual(
    parsePublicSupabaseEnvironment({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "a-valid-looking-anonymous-key",
      SUPABASE_SERVICE_ROLE_KEY: "must-not-be-returned",
    }),
    {
      url: "https://example.supabase.co",
      anonKey: "a-valid-looking-anonymous-key",
    },
  );
});

test("server integrations fail closed and do not disclose values", () => {
  assert.throws(
    () => requireServerEnvironment(["PAYFAST_MERCHANT_ID", "PAYFAST_PASSPHRASE"] as const, {}),
    /PAYFAST_MERCHANT_ID, PAYFAST_PASSPHRASE/,
  );

  assert.deepEqual(
    requireServerEnvironment(["PAYFAST_MERCHANT_ID"] as const, {
      PAYFAST_MERCHANT_ID: " 10000100 ",
    }),
    { PAYFAST_MERCHANT_ID: "10000100" },
  );
});

test("booking server environment is complete, private and fail closed", () => {
  assert.throws(() => parseBookingServerEnvironment({}), /SUPABASE_SERVICE_ROLE_KEY/);
  assert.throws(() => parseBookingServerEnvironment({
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "a-valid-looking-service-role-key",
    BOOKING_RATE_LIMIT_SECRET: "too-short",
  }), /at least 32 characters/);
  assert.deepEqual(parseBookingServerEnvironment({
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "a-valid-looking-service-role-key",
    BOOKING_RATE_LIMIT_SECRET: "a-private-rate-limit-secret-with-32-chars",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "not-returned",
  }), {
    url: "https://example.supabase.co",
    serviceRoleKey: "a-valid-looking-service-role-key",
    rateLimitSecret: "a-private-rate-limit-secret-with-32-chars",
  });
});

test("site URL rejects plaintext remote origins", () => {
  assert.equal(parseSiteUrl({}).toString(), "http://localhost:3000/");
  assert.throws(() => parseSiteUrl({ NEXT_PUBLIC_SITE_URL: "http://example.com" }));
  assert.equal(
    parseSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://thrivethroughcancer.co.za" }).hostname,
    "thrivethroughcancer.co.za",
  );
});

test("production site URL fails closed instead of emitting localhost", () => {
  assert.throws(() => parseSiteUrl({}, "production"), /required in production/);
  assert.throws(
    () => parseSiteUrl({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }, "production"),
    /public HTTPS origin/,
  );
  assert.throws(
    () => parseSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://localhost:3000" }, "production"),
    /public HTTPS origin/,
  );
  assert.equal(
    parseSiteUrl(
      { NEXT_PUBLIC_SITE_URL: "https://thrivethroughcancer.co.za" },
      "production",
    ).origin,
    "https://thrivethroughcancer.co.za",
  );
});

test("site URL accepts origins only", () => {
  assert.throws(() =>
    parseSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://user:password@example.org" }, "production"),
  );
  assert.throws(() =>
    parseSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://example.org/subpath" }, "production"),
  );
});
