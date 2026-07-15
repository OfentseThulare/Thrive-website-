import Link from "next/link";
import { notFound } from "next/navigation";

import { ReleaseHoldButton } from "@/components/booking/release-hold-button";
import { getBookingStatus } from "@/lib/booking/server";
import { formatJohannesburgDateTime, formatZar } from "@/lib/booking/time";
import { paymentConfiguration } from "@/lib/payment/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Booking status", robots: { index: false, follow: false } };

export default async function BookingStatusPage() {
  const booking = await getBookingStatus();
  if (!booking) notFound();
  const held = booking.state === "HELD" || booking.state === "PAYMENT_PENDING";
  const confirmed = booking.state === "CONFIRMED";
  const paidNeedsReconciliation = booking.paymentState === "PAID" && !confirmed;
  const payment = paymentConfiguration();
  const earlyPerformanceRequired = new Date(booking.startsAt).getTime() < Date.now() + 7 * 24 * 60 * 60 * 1000;
  return (
    <main className="booking-status-page">
      <section className="booking-status-card">
        <p className="eyebrow">Private booking status</p>
        <span className={`booking-state booking-state-${booking.state.toLowerCase()}`}>{booking.state.replaceAll("_", " ")}</span>
        <h1>{confirmed ? "Your session is confirmed" : held ? "Your time is being held" : "Booking update"}</h1>
        <p className="booking-status-lead">
          {confirmed
            ? "PayFast has confirmed payment and the appointment has been added to the practice calendar."
            : held
              ? "This time is reserved briefly, but it is not a confirmed appointment yet. Confirmation requires a valid PayFast notification and successful calendar confirmation."
              : "This page shows the current recorded state of your booking."}
        </p>
        {paidNeedsReconciliation ? <div className="payment-reconciliation-alert" role="alert"><strong>Payment received, appointment not confirmed</strong><span>Please do not pay again. The practice must reconcile the payment and appointment before a session can be confirmed.</span></div> : null}
        <dl>
          <div><dt>Reference</dt><dd>{booking.publicReference}</dd></div>
          <div><dt>Service</dt><dd>{booking.serviceName}</dd></div>
          <div><dt>Johannesburg time</dt><dd>{formatJohannesburgDateTime(booking.startsAt)}</dd></div>
          <div><dt>Session price</dt><dd>{formatZar(booking.priceCents)}</dd></div>
          {booking.holdExpiresAt && held ? <div><dt>Payment window ends</dt><dd>{formatJohannesburgDateTime(booking.holdExpiresAt)}</dd></div> : null}
        </dl>
        {held ? (
          <section className="payment-panel" aria-labelledby="payment-heading">
            <p className="eyebrow">Hosted payment</p>
            <h2 id="payment-heading">Pay securely with PayFast</h2>
            <p>Price and booking details are read from the private booking record. This website never asks for or stores card details.</p>
            {payment.enabled ? (
              <form action="/api/payment/checkout" method="post">
                <label className="payment-acceptance"><input name="legalAcceptance" required type="checkbox" value="accepted"/><span>I have read and accept the terms, privacy notice, cancellation and refund policy, and medical disclaimer for this booking.</span></label>
                {earlyPerformanceRequired ? <label className="payment-acceptance"><input name="earlyPerformanceAcceptance" required type="checkbox" value="accepted"/><span>I expressly request that the booked service may begin within seven days of this electronic transaction and understand that this may affect an ECTA cooling-off right, subject to applicable law.</span></label> : null}
                <button className="booking-primary-button" type="submit">Continue to secure PayFast checkout</button>
              </form>
            ) : (
              <div className="payment-unavailable" role="status"><strong>Online payment is not enabled yet.</strong><span>Your time remains subject to the hold deadline shown above. No payment has been taken.</span></div>
            )}
            <p className="payment-legal">By continuing, you confirm that you reviewed the <Link href="/terms">terms</Link>, <Link href="/privacy">privacy notice</Link>, <Link href="/cancellation-refunds">cancellation and refund policy</Link>, and <Link href="/medical-disclaimer">medical disclaimer</Link>.</p>
          </section>
        ) : null}
        <section className="eft-panel" aria-labelledby="eft-heading">
          <p className="eyebrow">Electronic funds transfer</p>
          <h2 id="eft-heading">EFT is not currently available</h2>
          <p>Banking instructions, proof-of-payment handling, payment references and confirmation rules require client approval before this method can be enabled. No banking details are shown and no manual transfer should be made.</p>
        </section>
        {booking.state === "HELD" ? <ReleaseHoldButton /> : null}
        <Link className="text-link" href="/book">Return to booking information</Link>
      </section>
    </main>
  );
}
