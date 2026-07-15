import { BOOKING_TIME_ZONE, type BookingSlot, type BusyPeriod } from "./types.ts";

const dateFormatter = new Intl.DateTimeFormat("en-ZA", {
  dateStyle: "full",
  timeZone: BOOKING_TIME_ZONE,
});
const timeFormatter = new Intl.DateTimeFormat("en-ZA", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: BOOKING_TIME_ZONE,
});

export function formatJohannesburgDate(value: string | Date) {
  return dateFormatter.format(new Date(value));
}

export function formatJohannesburgTime(value: string | Date) {
  return timeFormatter.format(new Date(value));
}

export function formatJohannesburgDateTime(value: string | Date) {
  return `${formatJohannesburgDate(value)} at ${formatJohannesburgTime(value)} SAST`;
}

export function formatZar(cents: number) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(cents / 100);
}

export function intervalsOverlap(left: BookingSlot, right: BusyPeriod) {
  return new Date(left.startsAt).getTime() < new Date(right.endsAt).getTime()
    && new Date(right.startsAt).getTime() < new Date(left.blockedUntil ?? left.endsAt).getTime();
}

export function removeBusySlots(slots: BookingSlot[], busy: BusyPeriod[]) {
  return slots.filter((slot) => !busy.some((period) => intervalsOverlap(slot, period)));
}

export function todayInJohannesburg(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: BOOKING_TIME_ZONE,
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
