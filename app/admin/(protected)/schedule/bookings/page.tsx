import Link from "next/link";
import { adminFormat, requireScheduleAccess } from "@/lib/booking/admin";

export default async function BookingsPage() {
  const { supabase } = await requireScheduleAccess(["owner", "scheduler", "finance", "auditor"]);
  const { data, error } = await supabase.from("bookings").select("id,public_reference,starts_at,state,hold_expires_at,services(name)").order("starts_at", { ascending: false }).limit(200);
  if (error) throw new Error("SCHEDULE_BOOKINGS_LOAD_FAILED");
  return <div className="admin-content"><div className="admin-page-heading"><div><p className="eyebrow">Operations</p><h1>Bookings</h1><p>Appointment status and Johannesburg times. Contact details are shown only inside an authorised booking record.</p></div></div><section className="admin-panel">{data?.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Reference</th><th>Service</th><th>Appointment</th><th>Status</th><th></th></tr></thead><tbody>{data.map((booking) => <tr key={booking.id}><td>{booking.public_reference}</td><td>{(booking.services as {name?:string}|null)?.name}</td><td>{adminFormat(booking.starts_at)}</td><td><span className="admin-status admin-status-neutral">{booking.state.replaceAll("_", " ")}</span></td><td><Link className="text-link" href={`/admin/schedule/bookings/${booking.id}`}>Review</Link></td></tr>)}</tbody></table></div> : <div className="admin-empty"><strong>No bookings yet</strong><p>Held and confirmed sessions will appear here.</p></div>}</section></div>;
}
