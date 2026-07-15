import Link from "next/link";

import { adminFormat } from "@/lib/booking/admin";
import { formatZar } from "@/lib/booking/time";
import { requireFinanceAccess } from "@/lib/payment/admin";

export default async function PaymentsPage() {
  const { supabase } = await requireFinanceAccess();
  const [paymentsResult, receiptsResult] = await Promise.all([
    supabase.from("payments").select("id,provider,provider_reference,amount_cents,currency,state,created_at,paid_at,bookings(public_reference)").order("created_at", { ascending: false }).limit(200),
    supabase.from("webhook_receipts").select("id,provider_event_id,payload_hash,signature_valid,processed_at,processing_error,received_at").eq("provider", "payfast").order("received_at", { ascending: false }).limit(50),
  ]);
  if (paymentsResult.error || receiptsResult.error) throw new Error("PAYMENTS_LOAD_FAILED");
  const payments = paymentsResult.data;
  const receipts = receiptsResult.data;
  return <div className="admin-content"><div className="admin-page-heading"><div><p className="eyebrow">Finance</p><h1>Payments</h1><p>Provider states and operational reconciliation, without card data or booking health information.</p></div></div><section className="admin-panel"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Booking</th><th>Provider</th><th>Amount</th><th>Status</th><th>Created</th><th /></tr></thead><tbody>{payments?.map((payment) => { const booking = payment.bookings as unknown as {public_reference:string}; return <tr key={payment.id}><td>{booking.public_reference}</td><td>{payment.provider}</td><td>{formatZar(payment.amount_cents)}</td><td><span className="admin-status admin-status-neutral">{payment.state.replaceAll("_", " ")}</span></td><td>{adminFormat(payment.created_at)}</td><td><Link href={`/admin/finance/payments/${payment.id}`}>Review</Link></td></tr>; })}</tbody></table></div>{!payments?.length ? <div className="admin-empty"><strong>No payment attempts</strong><p>Hosted checkout attempts will appear here.</p></div> : null}</section><section className="admin-panel"><h2>Recent PayFast webhook receipts</h2><p className="admin-security-note">Only a payload hash, validation outcome and operational error code are retained. Raw form data and card information are never shown.</p>{receipts?.length ? <ul className="admin-activity-list">{receipts.map((receipt) => <li key={receipt.id}><span className="admin-status admin-status-neutral">{receipt.signature_valid ? receipt.processed_at ? "processed" : "validated" : "rejected"}</span><strong>Hash {receipt.payload_hash.slice(0, 12)}… {receipt.processing_error ? `· ${receipt.processing_error}` : ""}</strong><time>{adminFormat(receipt.received_at)}</time></li>)}</ul> : <div className="admin-empty"><strong>No webhook receipts</strong><p>Browser return pages do not create payment receipts.</p></div>}</section></div>;
}
