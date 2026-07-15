import { createHash } from "node:crypto";

import type {
  BookingCalendarAdapter,
  BusyPeriod,
  CalendarEventInput,
  CalendarEventResult,
} from "./types.ts";

export class BookingCalendarUnavailableError extends Error {
  constructor(message = "Calendar availability cannot be verified right now.") {
    super(message);
    this.name = "BookingCalendarUnavailableError";
  }
}

export class UnavailableCalendarAdapter implements BookingCalendarAdapter {
  readonly name = "unavailable" as const;
  async health() { return { available: false, message: "Calendar booking is not configured yet." }; }
  async freeBusy(_from: string, _to: string): Promise<BusyPeriod[]> { throw new BookingCalendarUnavailableError(); }
  async createEvent(): Promise<CalendarEventResult> { throw new BookingCalendarUnavailableError(); }
  async updateEvent(): Promise<CalendarEventResult> { throw new BookingCalendarUnavailableError(); }
  async cancelEvent(): Promise<CalendarEventResult> { throw new BookingCalendarUnavailableError(); }
  async reconcile(): Promise<CalendarEventResult | null> { throw new BookingCalendarUnavailableError(); }
}

export class MockCalendarAdapter implements BookingCalendarAdapter {
  readonly name = "mock" as const;
  private readonly busy: BusyPeriod[];
  private readonly events = new Map<string, CalendarEventResult>();
  constructor(busy: BusyPeriod[] = []) { this.busy = busy; }
  async health() { return { available: true, message: "Deterministic test calendar is available." }; }
  async freeBusy(_from: string, _to: string) { return [...this.busy]; }
  async createEvent(input: CalendarEventInput) {
    const current = this.events.get(input.operationId);
    if (current) return current;
    const result = { externalEventId: `mock-${input.operationId}`, status: "tentative" as const };
    this.events.set(input.operationId, result);
    return result;
  }
  async updateEvent(externalEventId: string, input: CalendarEventInput) {
    const result = { externalEventId, status: "confirmed" as const };
    this.events.set(input.operationId, result);
    return result;
  }
  async cancelEvent(externalEventId: string, operationId: string) {
    const result = { externalEventId, status: "cancelled" as const };
    this.events.set(operationId, result);
    return result;
  }
  async reconcile(externalEventId: string) {
    return [...this.events.values()].find((event) => event.externalEventId === externalEventId) ?? null;
  }
}

type FetchLike = typeof fetch;
type GoogleConfig = { calendarId: string; clientId: string; clientSecret: string; refreshToken: string };

export class GoogleCalendarAdapter implements BookingCalendarAdapter {
  readonly name = "google" as const;
  private readonly config: GoogleConfig;
  private readonly fetcher: FetchLike;

  constructor(config: GoogleConfig, fetcher: FetchLike = fetch) {
    this.config = config;
    this.fetcher = fetcher;
  }

  private async accessToken() {
    const response = await this.fetcher("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: this.config.refreshToken,
        grant_type: "refresh_token",
      }),
      cache: "no-store",
    });
    if (!response.ok) throw new BookingCalendarUnavailableError();
    const payload = await response.json() as { access_token?: string };
    if (!payload.access_token) throw new BookingCalendarUnavailableError();
    return payload.access_token;
  }

  private async request(path: string, init: RequestInit = {}, acceptedStatuses: readonly number[] = []) {
    const token = await this.accessToken();
    const response = await this.fetcher(`https://www.googleapis.com/calendar/v3${path}`, {
      ...init,
      headers: { "content-type": "application/json", authorization: `Bearer ${token}`, ...init.headers },
      cache: "no-store",
    });
    if (!response.ok && !acceptedStatuses.includes(response.status)) throw new BookingCalendarUnavailableError();
    return response;
  }

  async health() {
    try {
      await this.request(`/calendars/${encodeURIComponent(this.config.calendarId)}?fields=id`);
      return { available: true, message: "Google Calendar is reachable." };
    } catch {
      return { available: false, message: "Google Calendar could not be reached." };
    }
  }

  async freeBusy(from: string, to: string) {
    const response = await this.request("/freeBusy", {
      method: "POST",
      body: JSON.stringify({ timeMin: from, timeMax: to, timeZone: "Africa/Johannesburg", items: [{ id: this.config.calendarId }] }),
    });
    const payload = await response.json() as { calendars?: Record<string, { errors?: unknown[]; busy?: Array<{ start: string; end: string }> }> };
    const calendar = payload.calendars?.[this.config.calendarId];
    if (!calendar || calendar.errors?.length) throw new BookingCalendarUnavailableError();
    return (calendar.busy ?? []).map((period) => ({ startsAt: period.start, endsAt: period.end }));
  }

  private eventBody(input: CalendarEventInput) {
    return {
      summary: input.summary,
      description: `Booking reference ${input.bookingReference}`,
      start: { dateTime: input.startsAt, timeZone: "Africa/Johannesburg" },
      end: { dateTime: input.endsAt, timeZone: "Africa/Johannesburg" },
      extendedProperties: { private: { bookingReference: input.bookingReference, operationId: input.operationId } },
    };
  }

  async createEvent(input: CalendarEventInput) {
    const eventId = googleCalendarEventId(input.operationId);
    const response = await this.request(`/calendars/${encodeURIComponent(this.config.calendarId)}/events`, {
      method: "POST", body: JSON.stringify({ id: eventId, ...this.eventBody(input) }),
    }, [409]);
    if (response.status === 409) {
      const existing = await this.request(`/calendars/${encodeURIComponent(this.config.calendarId)}/events/${eventId}`);
      return normaliseGoogleEvent(await existing.json());
    }
    return normaliseGoogleEvent(await response.json());
  }
  async updateEvent(externalEventId: string, input: CalendarEventInput) {
    const response = await this.request(`/calendars/${encodeURIComponent(this.config.calendarId)}/events/${encodeURIComponent(externalEventId)}`, {
      method: "PATCH", body: JSON.stringify(this.eventBody(input)),
    });
    return normaliseGoogleEvent(await response.json());
  }
  async cancelEvent(externalEventId: string) {
    await this.request(`/calendars/${encodeURIComponent(this.config.calendarId)}/events/${encodeURIComponent(externalEventId)}`, { method: "DELETE" }, [404]);
    return { externalEventId, status: "cancelled" as const };
  }
  async reconcile(externalEventId: string) {
    const response = await this.request(`/calendars/${encodeURIComponent(this.config.calendarId)}/events/${encodeURIComponent(externalEventId)}`);
    return normaliseGoogleEvent(await response.json());
  }
}

export function googleCalendarEventId(operationId: string) {
  return `ttc${createHash("sha256").update("thrive-google-calendar-event:v1\0", "utf8").update(operationId, "utf8").digest("hex")}`;
}

function normaliseGoogleEvent(value: unknown): CalendarEventResult {
  const payload = value as { id?: string; status?: string };
  if (!payload.id) throw new BookingCalendarUnavailableError();
  return {
    externalEventId: payload.id,
    status: payload.status === "cancelled" ? "cancelled" : payload.status === "confirmed" ? "confirmed" : "tentative",
  };
}
