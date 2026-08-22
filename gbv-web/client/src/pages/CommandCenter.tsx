/**
 * Style reminder — Zanzibar Civic Ledger: a command-river layout with urgent
 * triage on the left and accountable intelligence on the right.
 */
import { useMemo, useState } from "react";
import { ArrowRight, ChevronRight, CircleAlert, Clock3, FileText, ShieldAlert, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { COMMAND_HERO_URL } from "@/lib/demo-data";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PriorityPill } from "@/components/dashboard/StatusPill";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { asRecords, formatWhen, humanize, mapCase } from "@/lib/gbv-data";

export default function CommandCenter() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const casesQuery = trpc.gbv.cases.list.useQuery(undefined, { retry: false });
  const summaryQuery = trpc.gbv.analytics.summary.useQuery(undefined, { enabled: user?.role === "administrator", retry: false });
  const auditQuery = trpc.gbv.analytics.auditLogs.useQuery(undefined, { enabled: user?.role === "administrator", retry: false });
  const liveCases = useMemo(() => asRecords(casesQuery.data).map(mapCase), [casesQuery.data]);
  const queue = useMemo(() => (showCriticalOnly ? liveCases.filter((item) => item.priority.toUpperCase() === "CRITICAL") : liveCases.slice(0, 4)), [liveCases, showCriticalOnly]);
  const openCases = liveCases.filter((item) => !["CLOSED", "RESOLVED"].includes(item.status.toUpperCase())).length;
  const criticalCases = liveCases.filter((item) => item.priority.toUpperCase() === "CRITICAL").length;
  const summary = summaryQuery.data ?? {};
  const metricData = user?.role === "administrator" && summaryQuery.data ? [
    { label: "Reports received", value: String(summary.total_reports ?? 0), detail: "System-wide record", trend: "Live", tone: "lagoon" },
    { label: "Critical priority", value: String((summary.by_priority as Record<string, number> | undefined)?.CRITICAL ?? 0), detail: "Requires attention", trend: "Live", tone: "coral" },
    { label: "Average resolution", value: typeof summary.avg_resolution_time_seconds === "number" ? `${Math.round(summary.avg_resolution_time_seconds / 3600)}h` : "—", detail: "Closed cases only", trend: "Live", tone: "gold" },
  ] : [
    { label: "My available cases", value: String(liveCases.length), detail: "Assigned or unassigned", trend: "Live", tone: "lagoon" },
    { label: "Open casework", value: String(openCases), detail: "Not closed", trend: "Live", tone: "gold" },
    { label: "Critical priority", value: String(criticalCases), detail: "Requires attention", trend: "Live", tone: "coral" },
  ];
  const auditEntries = asRecords(auditQuery.data).slice(0, 3);

  return <div className="page-stack">
    <section className="hero-panel" style={{ backgroundImage: `linear-gradient(90deg, rgba(6, 25, 44, .93) 0%, rgba(6, 25, 44, .7) 49%, rgba(6, 25, 44, .24) 100%), url(${COMMAND_HERO_URL})` }}><div className="hero-panel__content"><div className="eyebrow eyebrow--light"><Sparkles size={14} /> Live operational brief</div><h1>Every report has a<br /><em>next responsible action.</em></h1><p>Prioritize immediate safety, keep follow-up visible, and make the safeguarding record stronger with every handoff.</p><div className="hero-panel__actions"><button className="button button--primary" onClick={() => navigate(user?.role === "officer" ? "/cases" : "/reports")}>{user?.role === "officer" ? "Open my case queue" : "Review reports"} <ArrowRight size={17} /></button><button className="button button--ghost-light" onClick={() => casesQuery.refetch()}>{casesQuery.isFetching ? "Refreshing…" : "Refresh live data"}</button></div></div><div className="hero-panel__signal"><span className="signal-dot" /><div><small>Connected to Django API</small><strong>{casesQuery.isSuccess ? "Live casework available" : "Checking safeguarding records"}</strong></div></div></section>
    <section className="section-head section-head--metrics"><div><div className="eyebrow">Operational health</div><h2>Safeguarding at a glance</h2></div><p>{user?.role === "administrator" ? "Live system oversight" : "Live officer case scope"}</p></section>
    <section className="metric-grid">{metricData.map((item) => <MetricCard key={item.label} {...item} />)}</section>
    <section className="command-grid"><article className="surface-card queue-card"><div className="card-head"><div><div className="eyebrow">Priority queue</div><h2>Cases needing a decision</h2></div><div className="card-head__actions"><button className={`filter-toggle ${showCriticalOnly ? "filter-toggle--selected" : ""}`} onClick={() => setShowCriticalOnly((value) => !value)}><CircleAlert size={15} /> Critical only</button><button className="text-action" onClick={() => navigate("/cases")}>All cases <ChevronRight size={16} /></button></div></div><div className="queue-list">{casesQuery.isLoading && <div className="empty-inline"><Clock3 size={19} /> Loading live case queue…</div>}{queue.map((item) => <button key={item.id} className="queue-row" onClick={() => navigate(`/cases?selected=${item.id}`)}><div className={`case-pulse case-pulse--${item.priority.toLowerCase()}`} /><div className="queue-row__identity"><strong>{item.caseNumber}</strong><span>{item.category} · {item.campus}</span></div><PriorityPill priority={item.priority} /><div className="queue-row__action"><span>{humanize(item.status)}</span><small><Clock3 size={13} /> {formatWhen(item.createdAt)}</small></div><ChevronRight className="queue-row__chevron" size={18} /></button>)}</div>{casesQuery.isError && <div className="empty-inline"><ShieldAlert size={19} /> Unable to load the live case queue. Check your access or Django connection.</div>}{casesQuery.isSuccess && !queue.length && <div className="empty-inline"><ShieldAlert size={19} /> No {showCriticalOnly ? "critical " : ""}cases are awaiting a decision.</div>}</article><aside className="side-stack"><article className="surface-card action-card"><div className="card-head"><div><div className="eyebrow">Follow-up cadence</div><h2>Recent case ownership</h2></div><button className="icon-text" onClick={() => navigate("/cases")}>View board <ArrowRight size={15} /></button></div><div className="followup-list">{liveCases.slice(0, 3).map((item) => <div className="followup-row" key={item.id}><span className="followup-check followup-check--scheduled" /><div><strong>{item.caseNumber}</strong><small>{item.owner} · {humanize(item.status)}</small></div><span className="followup-state">{formatWhen(item.createdAt)}</span></div>)}{!liveCases.length && !casesQuery.isLoading && <div className="empty-inline"><Clock3 size={18} /> No live casework is currently available.</div>}</div></article>{user?.role === "administrator" && <article className="surface-card activity-card"><div className="card-head"><div><div className="eyebrow">Audit pulse</div><h2>Recent record activity</h2></div><button className="icon-button icon-button--soft" aria-label="Open audit activity" onClick={() => navigate("/audit")}><FileText size={17} /></button></div><div className="activity-list">{auditEntries.map((item) => <div className="activity-row" key={String(item.id)}><time>{formatWhen(item.timestamp)}</time><div><strong>{humanize(item.action)}</strong><small>{humanize(item.resource_type)} · {String(item.resource_id ?? "Record")}</small></div></div>)}{auditQuery.isLoading && <div className="empty-inline"><Clock3 size={18} /> Loading audit activity…</div>}{auditQuery.isSuccess && !auditEntries.length && <div className="empty-inline"><FileText size={18} /> No audit entries match this view.</div>}</div></article>}</aside></section>
  </div>;
}
