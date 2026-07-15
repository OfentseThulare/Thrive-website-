import assert from "node:assert/strict";
import test from "node:test";

import {
  parsePublicSupabaseEnvironment,
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

test("site URL rejects plaintext remote origins", () => {
  assert.equal(parseSiteUrl({}).toString(), "http://localhost:3000/");
  assert.throws(() => parseSiteUrl({ NEXT_PUBLIC_SITE_URL: "http://example.com" }));
  assert.equal(
    parseSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://thrivethroughcancer.co.za" }).hostname,
    "thrivethroughcancer.co.za",
  );
});
