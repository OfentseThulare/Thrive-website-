import { deleteAvailabilityRuleAction, saveAvailabilityRuleAction } from "@/app/admin/schedule-actions";
import { requireScheduleAccess } from "@/lib/booking/admin";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
type ServiceOption = { id: string; name: string };
type RuleRecord = {
  id: string;
  service_id: string | null;
  weekday: number;
  starts_at: string;
  ends_at: string;
  effective_from: string;
  effective_until: string | null;
  active: boolean;
  services: { name?: string } | null;
};

function RuleForm({ services, rule }: { services: ServiceOption[]; rule?: RuleRecord }) {
  return <form action={saveAvailabilityRuleAction} className="admin-form admin-form-grid">
    {rule ? <input name="id" type="hidden" value={rule.id} /> : null}
    <label className="admin-field">Service<select defaultValue={rule?.service_id ?? ""} name="serviceId"><option value="">All services</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
    <label className="admin-field">Day<select defaultValue={rule?.weekday ?? 0} name="weekday">{days.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
    <label className="admin-field">Starts<input defaultValue={rule ? String(rule.starts_at).slice(0, 5) : undefined} name="startsAt" required type="time" /></label>
    <label className="admin-field">Ends<input defaultValue={rule ? String(rule.ends_at).slice(0, 5) : undefined} name="endsAt" required type="time" /></label>
    <label className="admin-field">Effective from<input defaultValue={rule?.effective_from} name="effectiveFrom" required type="date" /></label>
    <label className="admin-field">Effective until, optional<input defaultValue={rule?.effective_until ?? ""} name="effectiveUntil" type="date" /></label>
    <label className="admin-check"><input defaultChecked={rule?.active ?? true} name="active" type="checkbox" /> Rule is active</label>
    <button className="admin-button admin-button-primary" type="submit">{rule ? "Save changes" : "Add window"}</button>
  </form>;
}

export default async function AvailabilityPage() {
  const { supabase, editable } = await requireScheduleAccess(["owner", "scheduler", "auditor"]);
  const [serviceResult, ruleResult] = await Promise.all([
    supabase.from("services").select("id,name").order("position"),
    supabase.from("availability_rules").select("*,services(name)").order("weekday").order("starts_at"),
  ]);
  if (serviceResult.error || ruleResult.error) throw new Error("SCHEDULE_AVAILABILITY_LOAD_FAILED");
  const serviceData = serviceResult.data;
  const ruleData = ruleResult.data;
  const services = (serviceData ?? []) as ServiceOption[];
  const rules = (ruleData ?? []) as RuleRecord[];
  return <div className="admin-content">
    <div className="admin-page-heading"><div><p className="eyebrow">Africa/Johannesburg</p><h1>Weekly availability</h1><p>Global rules apply to every active service. Service rules add service-specific windows.</p></div></div>
    {editable ? <section className="admin-panel"><h2>Add a working window</h2><RuleForm services={services} /></section> : null}
    <section className="admin-panel"><h2>Working windows</h2>{rules.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Scope</th><th>Day</th><th>Time</th><th>Effective</th><th>Status</th>{editable ? <th>Manage</th> : null}</tr></thead><tbody>{rules.map((rule) => <tr key={rule.id}><td>{rule.services?.name ?? "All services"}</td><td>{days[rule.weekday]}</td><td>{String(rule.starts_at).slice(0, 5)} to {String(rule.ends_at).slice(0, 5)} SAST</td><td>{rule.effective_from}{rule.effective_until ? ` to ${rule.effective_until}` : " onwards"}</td><td><span className={`admin-status admin-status-${rule.active ? "published" : "archived"}`}>{rule.active ? "Active" : "Paused"}</span></td>{editable ? <td><details><summary className="text-link">Edit</summary><RuleForm rule={rule} services={services} /><form action={deleteAvailabilityRuleAction}><input name="id" type="hidden" value={rule.id} /><button className="admin-button" type="submit">Remove rule</button></form></details></td> : null}</tr>)}</tbody></table></div> : <div className="admin-empty"><strong>No availability rules</strong><p>No public slots can be offered.</p></div>}</section>
  </div>;
}
