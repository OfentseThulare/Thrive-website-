import assert from "node:assert/strict";
import test from "node:test";

import { formatJohannesburgDateTime, intervalsOverlap, removeBusySlots, todayInJohannesburg } from "../lib/booking/time.ts";

test("Johannesburg presentation remains UTC plus two across boundary dates", () => {
  assert.match(formatJohannesburgDateTime("2026-01-15T08:00:00.000Z"), /10:00 SAST/);
  assert.match(formatJohannesburgDateTime("2026-07-15T08:00:00.000Z"), /10:00 SAST/);
  assert.equal(todayInJohannesburg(new Date("2026-07-14T22:30:00.000Z")), "2026-07-15");
});

test("interval overlap uses half-open appointment boundaries", () => {
  const slot = { startsAt: "2026-07-20T08:00:00Z", endsAt: "2026-07-20T09:00:00Z" };
  assert.equal(intervalsOverlap(slot, { startsAt: "2026-07-20T08:30:00Z", endsAt: "2026-07-20T09:30:00Z" }), true);
  assert.equal(intervalsOverlap(slot, { startsAt: "2026-07-20T09:00:00Z", endsAt: "2026-07-20T10:00:00Z" }), false);
  assert.deepEqual(removeBusySlots([slot], [{ startsAt: "2026-07-20T08:15:00Z", endsAt: "2026-07-20T08:20:00Z" }]), []);
});
