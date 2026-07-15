import { notFound } from "next/navigation";
import { transitionBookingAction } from "@/app/admin/schedule-actions";
import { adminFormat, requireScheduleAccess } from "@/lib/booking/admin";
import { formatZar } from "@/lib/booking/time";

export default async function BookingDetailPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const { supabase, editable } = await requireScheduleAccess(["owner", "scheduler", "finance", "auditor"]);
  const [bookingResult, eventResult, syncResult] = await Promise.all([
    supabase.from("bookings").select("*,services(name)").eq("id", bookingId).maybeSingle(),
    supabase.from("booking_events").select("id,event_type,from_state,to_state,occurred_at").eq("booking_id", bookingId).order("occurred_at", { ascending: false }),
    supabase.from("calendar_sync_events").select("id,direction,outcome,occurred_at").eq("booking_id", bookingId).order("occurred_at", { ascending: false }),
  ]);
  if (bookingResult.error || eventResult.error || syncResult.error) throw new Error("SCHEDULE_BOOKING_DETAIL_LOAD_FAILED");
  const booking = bookingResult.data;
  const events = eventResult.data;
  const sync = syncResult.data;
  if (!booking) notFound();
  const service = booking.services as {name:string};
  const allowedTransitions = booking.state === "CONFIRMED"
    ? [{ value: "CANCELLED", label: "Cancel" }, { value: "COMPLETED", label: "Mark completed" }, { value: "NO_SHOW", label: "Mark no show" }]
    : booking.state === "HELD" || booking.state === "PAYMENT_PENDING"
      ? [{ value: "CANCELLED", label: "Cancel" }]
      : [];
  return <div className="admin-content"><div className="admin-page-heading"><div><p className="eyebrow">{booking.public_reference}</p><h1>{service.name}</h1><p>{adminFormat(booking.starts_at)} · {formatZar(booking.price_cents)}</p></div><span className="admin-status admin-status-neutral">{booking.state.replaceAll("_", " ")}</span></div><section className="admin-panel"><h2>Contact details</h2><dl className="admin-definition-list"><div><dt>Name</dt><dd>{booking.client_name}</dd></div><div><dt>Email</dt><dd>{booking.client_email}</dd></div><div><dt>Telephone</dt><dd>{booking.client_telephone || "Not supplied"}</dd></div></dl><p className="admin-security-note">Do not copy health information into booking records, events or calendar operations.</p>{editable && allowedTransitions.length ? <form action={transitionBookingAction} className="admin-inline-form"><input name="bookingId" type="hidden" value={booking.id}/><label className="admin-field">Operational state<select name="toState">{allowedTransitions.map((transition) => <option key={transition.value} value={transition.value}>{transition.label}</option>)}</select></label><button className="admin-button admin-button-primary" type="submit">Apply allowed transition</button></form> : null}</section><section className="admin-panel"><h2>Audit events</h2>{events?.length ? <ul className="admin-activity-list">{events.map((event) => <li key={event.id}><span className="admin-status admin-status-neutral">{event.to_state || event.event_type}</span><strong>{event.event_type}</strong><time>{adminFormat(event.occurred_at)}</time></li>)}</ul> : <div className="admin-empty"><strong>No events</strong></div>}</section><section className="admin-panel"><h2>Calendar reconciliation</h2>{sync?.length ? <ul className="admin-activity-list">{sync.map((event) => <li key={event.id}><span className="admin-status admin-status-neutral">{event.outcome}</span><strong>{event.direction}</strong><time>{adminFormat(event.occurred_at)}</time></li>)}</ul> : <div className="admin-empty"><strong>No calendar sync has been attempted</strong><p>A hold alone never creates or confirms a calendar event.</p></div>}</section></div>;
}
