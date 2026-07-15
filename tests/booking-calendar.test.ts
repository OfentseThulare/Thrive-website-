import assert from "node:assert/strict";
import test from "node:test";

import { BookingCalendarUnavailableError, GoogleCalendarAdapter, MockCalendarAdapter, UnavailableCalendarAdapter, googleCalendarEventId } from "../lib/booking/calendar.ts";
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

test("Google event creation recovers a lost response through a deterministic provider ID", async () => {
  const input = { operationId: "operation-lost-response", bookingReference: "TTC-TEST00000000", startsAt: "2026-07-20T08:00:00Z", endsAt: "2026-07-20T09:00:00Z", summary: "Appointment" };
  const eventIds: string[] = [];
  let inserts = 0;
  const fakeFetch = async (request: string | URL | Request, init?: RequestInit) => {
    const url = String(request);
    if (url.includes("oauth2")) return Response.json({ access_token: "test-token" });
    if (url.endsWith("/events") && init?.method === "POST") {
      const body = JSON.parse(String(init.body)) as { id: string };
      eventIds.push(body.id); inserts += 1;
      if (inserts === 1) throw new Error("response lost after provider creation");
      return new Response(null, { status: 409 });
    }
    return Response.json({ id: googleCalendarEventId(input.operationId), status: "confirmed" });
  };
  const adapter = new GoogleCalendarAdapter({ calendarId: "calendar@example.test", clientId: "client", clientSecret: "secret", refreshToken: "refresh" }, fakeFetch as typeof fetch);
  await assert.rejects(adapter.createEvent(input), /response lost/);
  assert.deepEqual(await adapter.createEvent(input), { externalEventId: googleCalendarEventId(input.operationId), status: "confirmed" });
  assert.deepEqual(eventIds, [googleCalendarEventId(input.operationId), googleCalendarEventId(input.operationId)]);
  assert.match(eventIds[0], /^[a-v0-9]{5,1024}$/);
});

test("Google cancellation treats a repeated provider 404 as success", async () => {
  let deletions = 0;
  const fakeFetch = async (request: string | URL | Request, init?: RequestInit) => {
    if (String(request).includes("oauth2")) return Response.json({ access_token: "test-token" });
    if (init?.method === "DELETE") {
      deletions += 1;
      return new Response(null, { status: deletions === 1 ? 204 : 404 });
    }
    throw new Error("unexpected request");
  };
  const adapter = new GoogleCalendarAdapter({ calendarId: "calendar@example.test", clientId: "client", clientSecret: "secret", refreshToken: "refresh" }, fakeFetch as typeof fetch);
  assert.deepEqual(await adapter.cancelEvent("event-1"), { externalEventId: "event-1", status: "cancelled" });
  assert.deepEqual(await adapter.cancelEvent("event-1"), { externalEventId: "event-1", status: "cancelled" });
});
