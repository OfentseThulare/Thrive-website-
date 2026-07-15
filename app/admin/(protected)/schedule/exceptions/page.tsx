import { deleteAvailabilityExceptionAction, saveAvailabilityExceptionAction } from "@/app/admin/schedule-actions";
import { adminDateTimeLocal, adminFormat, requireScheduleAccess } from "@/lib/booking/admin";

type ServiceOption = { id: string; name: string };
type ExceptionRecord = {
  id: string;
  service_id: string | null;
  starts_at: string;
  ends_at: string;
  available: boolean;
  reason: string | null;
  services: { name?: string } | null;
};

function ExceptionForm({ services, exception }: { services: ServiceOption[]; exception?: ExceptionRecord }) {
  return <form action={saveAvailabilityExceptionAction} className="admin-form admin-form-grid">
    {exception ? <input name="id" type="hidden" value={exception.id} /> : null}
    <label className="admin-field">Service<select defaultValue={exception?.service_id ?? ""} name="serviceId"><option value="">All services</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
    <label className="admin-check"><input defaultChecked={exception?.available} name="available" type="checkbox" /> This is a special opening</label>
    <label className="admin-field">Starts, SAST<input defaultValue={exception ? adminDateTimeLocal(exception.starts_at) : undefined} name="startsAt" required type="datetime-local" /></label>
    <label className="admin-field">Ends, SAST<input defaultValue={exception ? adminDateTimeLocal(exception.ends_at) : undefined} name="endsAt" required type="datetime-local" /></label>
    <label className="admin-field admin-field-wide">Operational reason, no health information<input defaultValue={exception?.reason ?? ""} maxLength={240} name="reason" /></label>
    <button className="admin-button admin-button-primary" type="submit">{exception ? "Save changes" : "Add exception"}</button>
  </form>;
}

export default async function ExceptionsPage() {
  const { supabase, editable } = await requireScheduleAccess(["owner", "scheduler", "auditor"]);
  const [serviceResult, exceptionResult] = await Promise.all([
    supabase.from("services").select("id,name").order("position"),
    supabase.from("availability_exceptions").select("*,services(name)").order("starts_at", { ascending: false }).limit(100),
  ]);
  if (serviceResult.error || exceptionResult.error) throw new Error("SCHEDULE_EXCEPTIONS_LOAD_FAILED");
  const serviceData = serviceResult.data;
  const exceptionData = exceptionResult.data;
  const services = (serviceData ?? []) as ServiceOption[];
  const exceptions = (exceptionData ?? []) as ExceptionRecord[];
  return <div className="admin-content">
    <div className="admin-page-heading"><div><p className="eyebrow">Johannesburg scheduler</p><h1>Closures and openings</h1><p>Closures remove times from normal availability. Special openings add bounded appointment windows.</p></div></div>
    {editable ? <section className="admin-panel"><h2>Add an exception</h2><ExceptionForm services={services} /></section> : null}
    <section className="admin-panel"><h2>Recorded exceptions</h2>{exceptions.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Type</th><th>Scope</th><th>Period</th><th>Reason</th>{editable ? <th>Manage</th> : null}</tr></thead><tbody>{exceptions.map((item) => <tr key={item.id}><td><span className={`admin-status admin-status-${item.available ? "published" : "archived"}`}>{item.available ? "Opening" : "Closed"}</span></td><td>{item.services?.name ?? "All services"}</td><td>{adminFormat(item.starts_at)}<br/>to {adminFormat(item.ends_at)}</td><td>{item.reason || "Not specified"}</td>{editable ? <td><details><summary className="text-link">Edit</summary><ExceptionForm exception={item} services={services} /><form action={deleteAvailabilityExceptionAction}><input name="id" type="hidden" value={item.id} /><button className="admin-button" type="submit">Remove exception</button></form></details></td> : null}</tr>)}</tbody></table></div> : <div className="admin-empty"><strong>No exceptions recorded</strong><p>Weekly availability applies without changes.</p></div>}</section>
  </div>;
}
