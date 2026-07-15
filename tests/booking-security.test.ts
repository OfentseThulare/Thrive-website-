import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../supabase/migrations/202607150007_booking_calendar.sql", import.meta.url);

test("booking writes are narrow RPCs with hashed access and overlap locking", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /security definer/g);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /bookings_active_time_exclusion/);
  assert.match(sql, /access_token_hash ~ '\^\[a-f0-9\]\{64\}\$'/);
  assert.match(sql, /revoke all on function public\.create_booking_hold/);
  assert.match(sql, /grant execute on function public\.create_booking_hold[\s\S]*to service_role/);
  assert.doesNotMatch(sql, /grant execute on function public\.create_booking_hold[^;]*to (?:anon|authenticated)/);
  assert.match(sql, /grant execute on function public\.get_booking_status\(text\) to service_role/);
  assert.match(sql, /grant execute on function public\.release_booking_hold\(text\) to service_role/);
  assert.doesNotMatch(sql, /grant (insert|update|delete) on public\.bookings to anon/);
});

test("slot and hold RPCs enforce horizon, consent, exact slots, expiry and ZAR service data", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  for (const requirement of ["Africa/Johannesburg", "local_today + 90", "BOOKING_CONSENT_UNAVAILABLE", "list_booking_slots", "expire_stale_booking_holds", "currency = 'ZAR'", "exclusion_violation", "check_booking_rate_limit", "recover_booking_hold"]) assert.match(sql, new RegExp(requirement.replace(/[+]/g, "\\+")));
  assert.match(sql, /hold_expires_at[\s\S]*now\(\) \+ interval '15 minutes'/);
  assert.doesNotMatch(sql, /booking\.hold_duration|hold_minutes/);
  assert.match(sql, /p_client_name !~ '\\S'/);
  assert.match(sql, /p_client_email !~\* '[^']*\\\.[^']*'/);
  assert.doesNotMatch(sql, /p_client_name !~ '\\\\S'/);
});

test("lost hold responses recover only the stable expected access credential", async () => {
  const [sql, holdRoute, server] = await Promise.all([
    readFile(migrationUrl, "utf8"),
    readFile(new URL("../app/api/booking/hold/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/booking/server.ts", import.meta.url), "utf8"),
  ]);
  assert.match(sql, /idempotency_key = p_idempotency_key[\s\S]*access_token_hash = p_expected_access_token_hash[\s\S]*hold_expires_at > now\(\)/);
  assert.doesNotMatch(sql, /recover_booking_hold[\s\S]*update public\.bookings set access_token_hash/);
  assert.match(sql, /grant execute on function public\.recover_booking_hold\(uuid, text\) to service_role/);
  assert.doesNotMatch(sql, /grant execute on function public\.recover_booking_hold[^;]*to (?:anon|authenticated)/);
  assert.match(holdRoute, /recover_booking_hold/);
  assert.match(holdRoute, /p_expected_access_token_hash: secrets\.accessTokenHash/);
  assert.match(holdRoute, /setBookingAccessCookie\(secrets\.accessToken\)/);
  assert.match(holdRoute, /if \(recovered\)[\s\S]*return privateJson\(\{ ok: true, next: "\/book\/status" \}/);
  assert.match(server, /deriveBookingAccessToken\(idempotencyKey, accessTokenSecret\)/);
});

test("schedule mutations require owner MFA at the database boundary", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /create function public\.can_mutate_schedule\(\)/);
  assert.match(sql, /not public\.has_any_role\(array\['owner'\]/);
  assert.match(sql, /or public\.current_session_is_aal2\(\)/);
  for (const policy of ["services_schedule_manage", "availability_rules_schedule_manage", "availability_exceptions_schedule_manage", "consent_versions_scheduler_manage", "calendar_sync_schedule_append"]) {
    assert.match(sql, new RegExp(`create policy ${policy}[\\s\\S]*?public\\.can_mutate_schedule\\(\\)`));
  }
  assert.match(sql, /if not public\.can_mutate_schedule\(\) then raise exception 'BOOKING_NOT_AUTHORISED'/);
});

test("public booking boundary contains no health information fields or false confirmation", async () => {
  const [schema, holdRoute, statusRoute, statusPage, calendar] = await Promise.all([
    readFile(new URL("../lib/booking/schemas.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/booking/hold/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/booking/status/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/book/status/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/booking/calendar.ts", import.meta.url), "utf8"),
  ]);
  for (const forbidden of ["diagnosis", "cancerType", "cancerStage", "treatment", "symptoms", "medicalNotes"]) assert.doesNotMatch(schema, new RegExp(forbidden, "i"));
  assert.match(holdRoute, /privateJson/);
  assert.match(holdRoute, /return privateJson\(\{ ok: true, next: "\/book\/status" \}/);
  assert.doesNotMatch(holdRoute, /console\.(?:log|info|warn|error)[\s\S]*parsed\.data/);
  assert.doesNotMatch(holdRoute, /next:[^\n]*(?:email|telephone|fullName|publicReference)/);
  assert.doesNotMatch(statusRoute, /client_(?:name|email|telephone)/);
  assert.doesNotMatch(calendar, /client_(?:name|email|telephone)|attendees/);
  assert.match(statusPage, /not a confirmed appointment yet/);
});

test("scheduler roles remain separate from content roles", async () => {
  const [actions, shell] = await Promise.all([
    readFile(new URL("../app/admin/schedule-actions.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/admin/admin-shell.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(actions, /requireCmsRole\(identity\.roles, \["owner", "scheduler"\]\)/);
  assert.doesNotMatch(actions, /"editor"|"publisher"/);
  assert.match(shell, /\["owner", "scheduler", "finance", "auditor"\]/);
});

test("scheduler interfaces support service updates and full rule and exception management", async () => {
  const [actions, servicesPage, availabilityPage, exceptionsPage] = await Promise.all([
    readFile(new URL("../app/admin/schedule-actions.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/(protected)/schedule/services/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/(protected)/schedule/availability/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/(protected)/schedule/exceptions/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(actions, /saveServiceAction[\s\S]*\.update\(record\)\.eq\("id", input\.id\)/);
  assert.match(actions, /saveAvailabilityRuleAction/);
  assert.match(actions, /deleteAvailabilityRuleAction/);
  assert.match(actions, /saveAvailabilityExceptionAction/);
  assert.match(actions, /deleteAvailabilityExceptionAction/);
  assert.match(servicesPage, /Save changes/);
  assert.match(availabilityPage, /Rule is active/);
  assert.match(availabilityPage, /Remove rule/);
  assert.match(exceptionsPage, /Remove exception/);
});

test("privileged booking credentials remain isolated to server-only modules", async () => {
  const [adminClient, rateLimit, browserClient, bookingExperience] = await Promise.all([
    readFile(new URL("../lib/supabase/booking-admin.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/booking/rate-limit.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/supabase/browser.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/booking/booking-experience.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(adminClient, /^import "server-only";/);
  assert.match(rateLimit, /^import "server-only";/);
  assert.match(adminClient, /serviceRoleKey/);
  assert.doesNotMatch(browserClient, /SERVICE_ROLE|serviceRole/i);
  assert.doesNotMatch(bookingExperience, /SERVICE_ROLE|serviceRole|rateLimitSecret|accessTokenSecret/i);
});
