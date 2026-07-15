import Link from "next/link";
import { notFound } from "next/navigation";

import { ReleaseHoldButton } from "@/components/booking/release-hold-button";
import { getBookingStatus } from "@/lib/booking/server";
import { formatJohannesburgDateTime, formatZar } from "@/lib/booking/time";

export const dynamic = "force-dynamic";
export const metadata = { title: "Booking status", robots: { index: false, follow: false } };

export default async function BookingStatusPage() {
  const booking = await getBookingStatus();
  if (!booking) notFound();
  const held = booking.state === "HELD" || booking.state === "PAYMENT_PENDING";
  const confirmed = booking.state === "CONFIRMED";
  return <main className="booking-status-page"><section className="booking-status-card"><p className="eyebrow">Private booking status</p><span className={`booking-state booking-state-${booking.state.toLowerCase()}`}>{booking.state.replaceAll("_", " ")}</span><h1>{confirmed ? "Your session is confirmed" : held ? "Your time is being held" : "Booking update"}</h1><p className="booking-status-lead">{confirmed ? "The payment and calendar stages are complete." : held ? "This time is reserved briefly, but it is not a confirmed appointment yet. Payment will be added in the next stage of setup." : "This page shows the current recorded state of your booking."}</p><dl><div><dt>Reference</dt><dd>{booking.publicReference}</dd></div><div><dt>Service</dt><dd>{booking.serviceName}</dd></div><div><dt>Johannesburg time</dt><dd>{formatJohannesburgDateTime(booking.startsAt)}</dd></div><div><dt>Session price</dt><dd>{formatZar(booking.priceCents)}</dd></div>{booking.holdExpiresAt && held ? <div><dt>Hold expires</dt><dd>{formatJohannesburgDateTime(booking.holdExpiresAt)}</dd></div> : null}</dl>{held ? <ReleaseHoldButton /> : null}<Link className="text-link" href="/book">Return to booking information</Link></section></main>;
}
