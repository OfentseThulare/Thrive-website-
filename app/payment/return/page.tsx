import Link from "next/link";
import { getBookingStatus } from "@/lib/booking/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payment processing", robots: { index: false, follow: false } };

export default async function PaymentReturnPage() {
  const booking = await getBookingStatus();
  const confirmed = booking?.state === "CONFIRMED";
  const failed = booking?.state === "CALENDAR_FAILED";
  return <main className="booking-status-page"><section className="booking-status-card payment-result-card"><p className="eyebrow">Secure payment return</p><h1>{confirmed ? "Your session is confirmed" : failed ? "Payment received, calendar follow-up needed" : "We are verifying your payment"}</h1><p>{confirmed ? "The PayFast notification and calendar confirmation are complete." : failed ? "Payment was recorded, but the calendar could not be completed automatically. The practice can reconcile this safely without another payment." : "Returning from PayFast does not mark a booking as paid. We wait for PayFast’s independently verified server notification, then confirm the calendar appointment."}</p><div className="payment-result-actions"><Link className="booking-primary-link" href="/book/status">Check current booking status</Link><Link className="text-link" href="/">Return home</Link></div></section></main>;
}
