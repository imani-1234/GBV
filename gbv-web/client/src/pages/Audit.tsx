/**
 * Style reminder — Zanzibar Civic Ledger: governance history is append-only,
 * orderly, and rendered directly from the protected Django audit record.
 */
import { useMemo, useState } from "react";
import { Download, FileLock2, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { asRecords, asText, formatWhen, humanize } from "@/lib/gbv-data";

export default function Audit() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const auditQuery = trpc.gbv.analytics.auditLogs.useQuery({ page }, { retry: false });
  const entries = asRecords(auditQuery.data);
  const visible = useMemo(() => entries.filter((entry) => `${entry.action ?? ""} ${entry.resource_type ?? ""} ${entry.resource_id ?? ""} ${entry.actor_identifier ?? ""}`.toLowerCase().includes(query.toLowerCase())), [entries, query]);
  const auditData = auditQuery.data ?? {};
  const exportActivity = () => {
    const lines = ["Sauti Yako — de-identified audit activity export", `Generated: ${new Date().toLocaleString()}`, "", ...visible.map((entry) => `${formatWhen(entry.timestamp)} | ${humanize(entry.action)} | ${humanize(entry.resource_type)} | ${asText(entry.resource_id, "No record ID")}`)];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = "sauti-yako-audit-activity.txt"; link.click(); URL.revokeObjectURL(url);
  };
  return <div className="page-stack"><section className="page-title-row"><div><div className="eyebrow">Governance and accountability</div><h1>Audit activity</h1><p>Read-only action history sourced from Django for reports, follow-ups, case ownership, and safeguarding operations.</p></div><button className="button button--outline" onClick={exportActivity} disabled={!visible.length}><Download size={17} /> Export activity</button></section><section className="audit-toolbar"><div className="case-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search action, resource, or record ID" aria-label="Search audit activity" /></div><div className="audit-protection"><FileLock2 size={17} /><span>Read-only Django audit record</span></div></section><article className="surface-card audit-card"><div className="audit-list">{auditQuery.isLoading && <div className="empty-inline"><FileLock2 size={18} /> Loading protected audit activity…</div>}{visible.map((entry) => <div className="audit-row" key={String(entry.id)}><div className="audit-timeline"><i /><span>{formatWhen(entry.timestamp)}</span></div><div><strong>{humanize(entry.action)}</strong><p>{humanize(entry.resource_type)} · {asText(entry.resource_id, "Record identifier unavailable")}</p><small>{asText(entry.actor_type, "System")} activity · {asText(entry.actor_identifier, "Restricted actor")}</small></div></div>)}{auditQuery.isError && <div className="empty-inline"><FileLock2 size={18} /> The Django audit endpoint did not return a record for this administrator account.</div>}{auditQuery.isSuccess && !visible.length && <div className="empty-inline"><Search size={18} /> No audit activity matches this search.</div>}</div>{Boolean(auditData.next) && <button className="text-action" onClick={() => setPage((current) => current + 1)}>Load older activity</button>}</article></div>;
}
