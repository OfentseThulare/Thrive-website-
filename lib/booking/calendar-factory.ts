import "server-only";

import { getBookingCalendarEnvironment } from "@/lib/env";
import {
  GoogleCalendarAdapter,
  MockCalendarAdapter,
  UnavailableCalendarAdapter,
} from "./calendar";
import type { BookingCalendarAdapter } from "./types";

export function createBookingCalendarAdapter(): BookingCalendarAdapter {
  const environment = getBookingCalendarEnvironment();
  if (environment.mode === "disabled") return new UnavailableCalendarAdapter();
  if (environment.mode === "mock") return new MockCalendarAdapter();
  return new GoogleCalendarAdapter(environment);
}
