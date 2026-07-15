"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { formatJohannesburgDate, formatJohannesburgTime, formatZar, todayInJohannesburg } from "@/lib/booking/time";
import type { BookingService, BookingSlot } from "@/lib/booking/types";

type Consent = { id: string; version: string; wording: string };
type Setup = { available: true; services: BookingService[]; consent: Consent } | { available: false; message: string };

function dateRange(days: number) {
  const dates: string[] = [];
  const noon = new Date(`${todayInJohannesburg()}T12:00:00+02:00`);
  for (let offset = 1; offset <= days; offset += 1) {
    const value = new Date(noon);
    value.setUTCDate(value.getUTCDate() + offset);
    dates.push(new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Africa/Johannesburg" }).format(value));
  }
  return dates;
}

export function BookingExperience() {
  const dates = useMemo(() => dateRange(28), []);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [slot, setSlot] = useState<BookingSlot | null>(null);
  const [holdIdempotencyKey, setHoldIdempotencyKey] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/booking/services", { cache: "no-store" })
      .then(async (response) => ({ response, body: await response.json() as Setup }))
      .then(({ response, body }) => { if (active) setSetup(response.ok ? body : { available: false, message: "Online booking is not available yet. Please check back soon." }); })
      .catch(() => { if (active) setSetup({ available: false, message: "Online booking could not be loaded safely." }); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!serviceId || !date) { setSlots([]); setSlot(null); setHoldIdempotencyKey(""); return; }
    const controller = new AbortController();
    setLoadingSlots(true); setMessage(""); setSlot(null); setHoldIdempotencyKey("");
    fetch(`/api/booking/availability?serviceId=${encodeURIComponent(serviceId)}&from=${date}&to=${date}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => ({ response, body: await response.json() as { slots?: BookingSlot[]; message?: string } }))
      .then(({ response, body }) => {
        if (!response.ok) throw new Error(body.message || "Availability is temporarily unavailable.");
        setSlots(body.slots ?? []);
      })
      .catch((error: Error) => { if (error.name !== "AbortError") setMessage(error.message); })
      .finally(() => setLoadingSlots(false));
    return () => controller.abort();
  }, [serviceId, date]);

  const service = setup?.available ? setup.services.find((item) => item.id === serviceId) : undefined;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!setup?.available || !slot || !holdIdempotencyKey) { setMessage("Choose a service, date and time before continuing."); return; }
    const form = new FormData(event.currentTarget);
    setSubmitting(true); setMessage("");
    try {
      const response = await fetch("/api/booking/hold", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          serviceId, startsAt: slot.startsAt, fullName: form.get("fullName"), email: form.get("email"), telephone: form.get("telephone"),
          consentVersionId: setup.consent.id, consentAccepted: form.get("consent") === "on", idempotencyKey: holdIdempotencyKey,
        }),
      });
      const body = await response.json() as { next?: string; message?: string };
      if (!response.ok || !body.next) throw new Error(body.message || "The time could not be held.");
      window.location.assign(body.next);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The time could not be held.");
      setSubmitting(false);
    }
  }

  if (!setup) return <section className="booking-panel shell" aria-busy="true"><p className="eyebrow">Secure online booking</p><h2>Checking availability</h2><p>We are securely connecting to the calendar.</p></section>;
  if (!setup.available) return <section className="booking-panel booking-unavailable shell" aria-labelledby="booking-heading"><p className="eyebrow">Secure online booking</p><h2 id="booking-heading">Booking is not open yet</h2><p>{setup.message}</p><p>No appointment has been offered or confirmed.</p></section>;

  return (
    <section className="booking-panel shell" aria-labelledby="booking-heading">
      <div className="booking-heading"><div><p className="eyebrow">Secure online booking</p><h2 id="booking-heading">Choose a time that works for you</h2></div><p>Times are shown in Johannesburg time, SAST. Your time is held for 15 minutes after you submit your contact details.</p></div>
      <form className="booking-form" onSubmit={submit}>
        <fieldset className="booking-step"><legend><span>1</span> Choose a service</legend><div className="booking-service-grid">
          {setup.services.map((item) => <button aria-pressed={serviceId === item.id} className="booking-choice" key={item.id} onClick={() => { setServiceId(item.id); setDate(""); setHoldIdempotencyKey(""); }} type="button"><strong>{item.name}</strong><span>{item.description}</span><small>{item.durationMinutes} minutes · {formatZar(item.priceCents)}</small></button>)}
        </div></fieldset>
        {service ? <fieldset className="booking-step"><legend><span>2</span> Choose a date</legend><p className="booking-help">Available dates are checked against the practice calendar. Select a date to see exact times.</p><div className="booking-date-grid" role="group" aria-label="Choose an appointment date">
          {dates.map((value) => <button aria-pressed={date === value} key={value} onClick={() => setDate(value)} type="button"><span>{new Intl.DateTimeFormat("en-ZA", { weekday: "short", timeZone: "Africa/Johannesburg" }).format(new Date(`${value}T12:00:00+02:00`))}</span><strong>{new Intl.DateTimeFormat("en-ZA", { day: "2-digit", timeZone: "Africa/Johannesburg" }).format(new Date(`${value}T12:00:00+02:00`))}</strong><small>{new Intl.DateTimeFormat("en-ZA", { month: "short", timeZone: "Africa/Johannesburg" }).format(new Date(`${value}T12:00:00+02:00`))}</small></button>)}
        </div></fieldset> : null}
        {date ? <fieldset className="booking-step"><legend><span>3</span> Choose a time</legend><p className="booking-help">{formatJohannesburgDate(`${date}T12:00:00+02:00`)}</p>{loadingSlots ? <p role="status">Checking the calendar…</p> : slots.length ? <div className="booking-slot-grid" role="group" aria-label="Available appointment times">{slots.map((item) => <button aria-pressed={slot?.startsAt === item.startsAt} key={item.startsAt} onClick={() => { setSlot(item); setHoldIdempotencyKey(crypto.randomUUID()); }} type="button">{formatJohannesburgTime(item.startsAt)}</button>)}</div> : <p className="booking-empty">No verified times are available on this date.</p>}</fieldset> : null}
        {slot ? <fieldset className="booking-step"><legend><span>4</span> Your contact details</legend><div className="booking-summary"><strong>{service?.name}</strong><span>{formatJohannesburgDate(slot.startsAt)} at {formatJohannesburgTime(slot.startsAt)} SAST</span><small>This is not confirmed until the remaining booking stages are complete.</small></div><div className="booking-fields"><label>Full name<input autoComplete="name" maxLength={160} name="fullName" required /></label><label>Email address<input autoComplete="email" inputMode="email" maxLength={320} name="email" required type="email" /></label><label>Telephone <small>Optional</small><input autoComplete="tel" inputMode="tel" maxLength={40} name="telephone" /></label></div><label className="booking-consent"><input name="consent" required type="checkbox" /><span>{setup.consent.wording} <small>Consent version {setup.consent.version}</small></span></label><p className="booking-privacy">Please do not enter diagnosis, treatment, symptoms or other health information here. We only need the contact details above to hold the time. Review the <Link href="/privacy">privacy notice</Link>, <Link href="/terms">terms</Link>, <Link href="/cancellation-refunds">cancellation and refund policy</Link>, and <Link href="/medical-disclaimer">medical disclaimer</Link> before continuing.</p><button className="button booking-submit" disabled={submitting} type="submit">{submitting ? "Holding your time…" : "Hold this time and review"}</button></fieldset> : null}
        {message ? <p className="booking-error" role="alert">{message}</p> : null}
      </form>
    </section>
  );
}
