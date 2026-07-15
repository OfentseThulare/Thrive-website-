import { saveServiceAction } from "@/app/admin/schedule-actions";
import { requireScheduleAccess } from "@/lib/booking/admin";
import { formatZar } from "@/lib/booking/time";

type ServiceRecord = {
  id: string;
  slug: string;
  name: string;
  description: string;
  duration_minutes: number;
  buffer_minutes: number;
  price_cents: number;
  active: boolean;
  position: number;
};

function ServiceForm({ service }: { service?: ServiceRecord }) {
  return <form action={saveServiceAction} className="admin-form admin-form-grid">
    {service ? <input name="id" type="hidden" value={service.id} /> : null}
    <label className="admin-field">Name<input defaultValue={service?.name} name="name" required /></label>
    <label className="admin-field">Slug<input defaultValue={service?.slug} name="slug" required /></label>
    <label className="admin-field admin-field-wide">Description<textarea defaultValue={service?.description} name="description" required /></label>
    <label className="admin-field">Duration, minutes<input defaultValue={service?.duration_minutes} min="15" name="durationMinutes" required type="number" /></label>
    <label className="admin-field">Buffer, minutes<input defaultValue={service?.buffer_minutes ?? 0} min="0" name="bufferMinutes" required type="number" /></label>
    <label className="admin-field">Price, rand<input defaultValue={service ? (service.price_cents / 100).toFixed(2) : undefined} min="0" name="priceRands" required step="0.01" type="number" /></label>
    <label className="admin-field">Position<input defaultValue={service?.position ?? 0} min="0" name="position" required type="number" /></label>
    <label className="admin-check"><input defaultChecked={service?.active} name="active" type="checkbox" /> Accept bookings</label>
    <button className="admin-button admin-button-primary" type="submit">{service ? "Save changes" : "Save service"}</button>
  </form>;
}

export default async function ServicesPage() {
  const { supabase, editable } = await requireScheduleAccess(["owner", "scheduler", "auditor"]);
  const { data } = await supabase.from("services").select("*").order("position");
  const services = (data ?? []) as ServiceRecord[];
  return <div className="admin-content">
    <div className="admin-page-heading"><div><p className="eyebrow">Johannesburg scheduler</p><h1>Services</h1><p>Duration, buffer and ZAR price are trusted from the database at booking time.</p></div></div>
    {editable ? <section className="admin-panel"><h2>Add a service</h2><ServiceForm /></section> : null}
    <section className="admin-panel"><h2>Configured services</h2>{services.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Service</th><th>Timing</th><th>Price</th><th>Status</th>{editable ? <th>Manage</th> : null}</tr></thead><tbody>{services.map((service) => <tr key={service.id}><td><strong>{service.name}</strong><br/><small>{service.slug}</small></td><td>{service.duration_minutes} min + {service.buffer_minutes} min buffer</td><td>{formatZar(service.price_cents)}</td><td><span className={`admin-status admin-status-${service.active ? "published" : "archived"}`}>{service.active ? "Active" : "Paused"}</span></td>{editable ? <td><details><summary className="text-link">Edit</summary><ServiceForm service={service} /></details></td> : null}</tr>)}</tbody></table></div> : <div className="admin-empty"><strong>No services yet</strong><p>Public booking remains safely unavailable.</p></div>}</section>
  </div>;
}
