import Link from "next/link";
import { getBookingStatus } from "@/lib/booking/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payment cancelled", robots: { index: false, follow: false } };

export default async function PaymentCancelPage() {
  const booking = await getBookingStatus();
  const confirmed = booking?.state === "CONFIRMED";
  return <main className="booking-status-page"><section className="booking-status-card payment-result-card"><p className="eyebrow">PayFast checkout</p><h1>{confirmed ? "Your booking is already confirmed" : "Checkout was cancelled"}</h1><p>{confirmed ? "A verified payment notification has already confirmed this appointment." : "The cancel return does not change payment or booking records. If no valid PayFast notification arrives before the hold expires, the time will be released automatically."}</p><div className="payment-result-actions"><Link className="booking-primary-link" href="/book/status">Review booking status</Link><Link className="text-link" href="/book">Choose another time</Link></div></section></main>;
}
