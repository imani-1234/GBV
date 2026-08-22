/**
 * Style reminder — Zanzibar Civic Ledger: team capacity is an operational
 * resource view with real roster context and no fabricated availability data.
 */
import { CircleCheck, Clock3, UsersRound } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { asRecords, asText, humanize } from "@/lib/gbv-data";

export default function Team() {
  const officersQuery = trpc.gbv.admin.officers.useQuery(undefined, { retry: false });
  const casesQuery = trpc.gbv.cases.list.useQuery(undefined, { retry: false });
  const officers = asRecords(officersQuery.data);
  const cases = asRecords(casesQuery.data);
  const activeOfficers = officers.filter((officer) => Boolean(officer.is_active));
  const unassignedCases = cases.filter((item) => !item.assigned_officer).length;
  const openCases = cases.filter((item) => !["CLOSED", "RESOLVED"].includes(asText(item.status, "").toUpperCase())).length;
  const caseCountFor = (id: unknown) => cases.filter((item) => String(item.assigned_officer ?? "") === String(id)).length;

  return <div className="page-stack"><section className="page-title-row"><div><div className="eyebrow">Safeguarding operations</div><h1>Team capacity</h1><p>Live officer accounts and assigned case counts from Django. Capacity assessments remain a professional management decision.</p></div></section><section className="team-summary"><div><UsersRound size={21} /><span>Active accounts</span><strong>{activeOfficers.length} / {officers.length} officers</strong><small>Based on active Django officer accounts.</small></div><div><Clock3 size={21} /><span>Open casework</span><strong>{openCases} cases</strong><small>Live cases not marked closed or resolved.</small></div><div><CircleCheck size={21} /><span>Unassigned cases</span><strong>{unassignedCases}</strong><small>These remain visible in eligible officer queues.</small></div></section><article className="surface-card team-card"><div className="card-head"><div><div className="eyebrow">Responsibility map</div><h2>Live officer workload</h2></div><p className="card-copy">Review recorded assignment counts before allocating an urgent response.</p></div><div className="team-list">{officersQuery.isLoading && <div className="empty-inline"><UsersRound size={18} /> Loading officer roster…</div>}{officers.map((officer) => { const assigned = caseCountFor(officer.id); const name = asText(officer.full_name, "Officer"); const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(); return <div className="team-row" key={String(officer.id)}><div className="team-avatar">{initials}</div><div className="team-person"><strong>{name}</strong><span>{asText(officer.email, "No email recorded")}</span></div><div className="team-load"><span>Assigned cases</span><div><i style={{ width: `${Math.min(assigned * 15, 100)}%` }} /><small>{assigned}</small></div></div><div className="team-response"><span>Account state</span><strong>{Boolean(officer.is_active) ? "Active" : "Inactive"}</strong></div><span className={`availability availability--${Boolean(officer.is_active) ? "available" : "away"}`}>{Boolean(officer.is_active) ? "Active" : "Inactive"}</span></div>; })}</div>{officersQuery.isError && <div className="empty-inline"><UsersRound size={18} /> The Django administrator API did not return an officer roster for this account.</div>}{officersQuery.isSuccess && !officers.length && <div className="empty-inline"><UsersRound size={18} /> No officer accounts are available in the current Django workspace.</div>}</article></div>;
}
