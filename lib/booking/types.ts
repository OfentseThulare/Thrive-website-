export const BOOKING_TIME_ZONE = "Africa/Johannesburg";
export const BOOKING_COOKIE = "ttc_booking_access";

export type BookingService = {
  id: string;
  slug: string;
  name: string;
  description: string;
  durationMinutes: number;
  bufferMinutes: number;
  priceCents: number;
  currency: "ZAR";
};

export type BookingSlot = { startsAt: string; endsAt: string; blockedUntil?: string };
export type BusyPeriod = BookingSlot;

export type BookingStatus = {
  publicReference: string;
  serviceName: string;
  startsAt: string;
  endsAt: string;
  state: "HELD" | "PAYMENT_PENDING" | "PAID" | "CALENDAR_SYNC_PENDING" | "CONFIRMED" | "COMPLETED" | "EXPIRED" | "CANCELLED" | "CALENDAR_FAILED" | "NO_SHOW";
  holdExpiresAt: string | null;
  priceCents: number;
  currency: "ZAR";
  paymentState: "CREATED" | "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "REFUND_PENDING" | "REFUNDED" | null;
};

export type CalendarEventInput = {
  operationId: string;
  bookingReference: string;
  startsAt: string;
  endsAt: string;
  summary: string;
};

export type CalendarEventResult = { externalEventId: string; status: "tentative" | "confirmed" | "cancelled" };

export interface BookingCalendarAdapter {
  readonly name: "google" | "mock" | "unavailable";
  health(): Promise<{ available: boolean; message: string }>;
  freeBusy(from: string, to: string): Promise<BusyPeriod[]>;
  createEvent(input: CalendarEventInput): Promise<CalendarEventResult>;
  updateEvent(externalEventId: string, input: CalendarEventInput): Promise<CalendarEventResult>;
  cancelEvent(externalEventId: string, operationId: string): Promise<CalendarEventResult>;
  reconcile(externalEventId: string): Promise<CalendarEventResult | null>;
}
