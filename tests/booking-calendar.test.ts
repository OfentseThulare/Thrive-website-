import assert from "node:assert/strict";
import test from "node:test";

import { BookingCalendarUnavailableError, GoogleCalendarAdapter, MockCalendarAdapter, UnavailableCalendarAdapter } from "../lib/booking/calendar.ts";
import { parseBookingCalendarEnvironment } from "../lib/env/schema.ts";

test("calendar environment is disabled by default and rejects production mock", () => {
  assert.deepEqual(parseBookingCalendarEnvironment({}, "production"), { mode: "disabled" });
  assert.throws(() => parseBookingCalendarEnvironment({ BOOKING_CALENDAR_MODE: "mock" }, "production"), /forbidden/);
  assert.throws(() => parseBookingCalendarEnvironment({ BOOKING_CALENDAR_MODE: "google" }, "production"), /GOOGLE_CALENDAR_ID/);
});

test("unavailable calendar fails closed", async () => {
  const adapter = new UnavailableCalendarAdapter();
  assert.equal((await adapter.health()).available, false);
  await assert.rejects(adapter.freeBusy("2026-01-01", "2026-01-02"), BookingCalendarUnavailableError);
});

test("mock calendar is deterministic and event creation is idempotent", async () => {
  const adapter = new MockCalendarAdapter([{ startsAt: "2026-07-20T08:00:00Z", endsAt: "2026-07-20T09:00:00Z" }]);
  assert.equal((await adapter.freeBusy("", "")).length, 1);
  const input = { operationId: "operation-1", bookingReference: "TTC-TEST00000000", startsAt: "2026-07-20T08:00:00Z", endsAt: "2026-07-20T09:00:00Z", summary: "Appointment" };
  assert.deepEqual(await adapter.createEvent(input), await adapter.createEvent(input));
});

test("Google adapter refreshes a token and normalises FreeBusy without retaining payloads", async () => {
  const calls: string[] = [];
  const fakeFetch = async (input: string | URL | Request) => {
    const url = String(input); calls.push(url);
    if (url.includes("oauth2")) return Response.json({ access_token: "test-token" });
    return Response.json({ calendars: { "calendar@example.test": { busy: [{ start: "2026-07-20T08:00:00Z", end: "2026-07-20T09:00:00Z" }] } } });
  };
  const adapter = new GoogleCalendarAdapter({ calendarId: "calendar@example.test", clientId: "client", clientSecret: "secret", refreshToken: "refresh" }, fakeFetch as typeof fetch);
  assert.deepEqual(await adapter.freeBusy("2026-07-20T00:00:00Z", "2026-07-21T00:00:00Z"), [{ startsAt: "2026-07-20T08:00:00Z", endsAt: "2026-07-20T09:00:00Z" }]);
  assert.equal(calls.length, 2);
});
