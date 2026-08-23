/**
 * Live reporting oversight for the connected Django safeguarding service.
 * Detail, evidence, and upload actions stay server-authorised at every step.
 */
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Download, FileCheck2, Filter, Flag, ListFilter, ShieldAlert, Upload } from "lucide-react";
import { toast } from "sonner";
import { PriorityPill, StatusPill } from "@/components/dashboard/StatusPill";
import { TriageSignal } from "@/components/dashboard/TriageSignal";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { asRecords, asText, formatWhen, mapReport } from "@/lib/gbv-data";

const MAX_EVIDENCE_BYTES = 25 * 1024 * 1024;

function fileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The selected evidence file could not be read."));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
}

export default function Reports() {
  const { user } = useAuth();
  const isAdmin = user?.role === "administrator";
  const [view, setView] = useState<"All" | "Needs review" | "Escalated">("All");
  const [selectedId, setSelectedId] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const reportsQuery = trpc.gbv.reports.list.useQuery(undefined, { retry: false });
  const summaryQuery = trpc.gbv.analytics.summary.useQuery(undefined, { enabled: isAdmin, retry: false });
  const reports = useMemo(() => asRecords(reportsQuery.data).map(mapReport), [reportsQuery.data]);

  useEffect(() => {
    if (!selectedId && reports[0]) setSelectedId(reports[0].id);
  }, [reports, selectedId]);

  const selected = reports.find(report => report.id === selectedId) ?? reports[0];
  const detailQuery = trpc.gbv.reports.detail.useQuery(
    { id: selected?.id ?? "00000000-0000-0000-0000-000000000000" },
    { enabled: Boolean(selected?.id), retry: false },
  );
  const utils = trpc.useUtils();
  const uploadEvidence = trpc.gbv.reports.uploadEvidence.useMutation({
    onSuccess: async () => {
      setEvidenceFile(null);
      toast.success("Evidence uploaded to the protected Django record.");
      await Promise.all([utils.gbv.reports.detail.invalidate(), utils.gbv.reports.list.invalidate()]);
    },
    onError: error => toast.error(error.message),
  });

  const filtered = useMemo(() => {
    if (view === "Escalated") return reports.filter(item => ["HIGH", "CRITICAL"].includes(item.priority.toUpperCase()));
    if (view === "Needs review") return reports.filter(item => item.status.toUpperCase() === "SUBMITTED");
    return reports;
  }, [reports, view]);

  const detail = detailQuery.data ?? {};
  const evidence = asRecords(detail.evidence);
  const summary = summaryQuery.data ?? {};
  const submitted = reports.filter(item => item.status.toUpperCase() === "SUBMITTED").length;
  const escalated = reports.filter(item => ["HIGH", "CRITICAL"].includes(item.priority.toUpperCase())).length;

  const selectEvidence = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0] ?? null;
    if (next && next.size > MAX_EVIDENCE_BYTES) {
      toast.error("Evidence files must be 25MB or smaller.");
      event.target.value = "";
      return;
    }
    setEvidenceFile(next);
  };

  const sendEvidence = async () => {
    if (!selected || !evidenceFile) return;
    try {
      uploadEvidence.mutate({
        id: selected.id,
        fileName: evidenceFile.name,
        mimeType: evidenceFile.type || "application/octet-stream",
        base64: await fileAsBase64(evidenceFile),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The evidence upload could not be prepared.");
    }
  };

  return (
    <div className={`page-stack ${isAdmin ? "" : "page-stack--officer"}`}>
      <section className="page-title-row">
        <div>
          <div className="eyebrow">{isAdmin ? "Intake and disclosure" : "Officer review"}</div>
          <h1>{isAdmin ? "Reports" : "Assigned reports"}</h1>
          <p>{isAdmin ? "Review live disclosures, preserve their record, and route the next safeguarding decision." : "Review reports linked to your current casework and keep the next safe action visible."}</p>
        </div>
      </section>

      {isAdmin && (
        <section className="reports-focus-grid">
          <article className="report-focus-panel">
            <div className="report-focus-panel__arc" />
            <div className="eyebrow eyebrow--light">First-response control</div>
            <h2>{submitted} submitted report{submitted === 1 ? " is" : "s are"} awaiting review.</h2>
            <p>Review records using the official Django workflow. Risk labels support triage but never replace professional safeguarding assessment.</p>
            <button onClick={() => setView("Needs review")}>Open review queue <ArrowUpRight size={16} /></button>
          </article>
          <div className="report-summary-grid report-summary-grid--tight">
            <Summary icon={<FileCheck2 size={22} />} tone="incoming" label="Reports received" value={String(summary.total_reports ?? reports.length)} detail="Live system record" />
            <Summary icon={<ListFilter size={22} />} tone="review" label="Awaiting review" value={String(submitted)} detail="Submitted state" />
            <Summary icon={<ShieldAlert size={22} />} tone="escalated" label="High priority" value={String(escalated)} detail="High or critical signal" />
            <Summary icon={<ArrowUpRight size={22} />} tone="followup" label="Anonymous reports" value={String(summary.anonymous_reports ?? "—")} detail="Aggregate only" />
          </div>
        </section>
      )}

      <article className="surface-card reports-card">
        <div className="card-head card-head--stack-mobile">
          <div><div className="eyebrow">Reporting engine</div><h2>Submission review queue</h2></div>
          <div className="segmented-control"><Filter size={15} />{(["All", "Needs review", "Escalated"] as const).map(item => <button key={item} onClick={() => setView(item)} className={view === item ? "is-active" : ""}>{item}</button>)}</div>
        </div>
        <div className="report-table">
          <div className="report-table__head"><span>Report</span><span>Disclosure type</span><span>Received</span><span>Risk signal</span><span>Review state</span><span>Evidence</span></div>
          {reportsQuery.isLoading && <div className="empty-inline"><ListFilter size={18} /> Loading live report queue…</div>}
          {filtered.map(item => <button className={`report-table__row ${selected?.id === item.id ? "report-table__row--selected" : ""}`} key={item.id} onClick={() => setSelectedId(item.id)}>
            <span><TriageSignal priority={item.priority} status={item.status} age={formatWhen(item.createdAt)} /><strong>{item.caseNumber}</strong><small>{item.campus}</small></span>
            <span>{item.category}</span><span>{formatWhen(item.createdAt)}</span><span><PriorityPill priority={item.priority} /></span><span><StatusPill status={item.status} /></span><span>{item.evidenceCount} file{item.evidenceCount === 1 ? "" : "s"}</span>
          </button>)}
        </div>
        {reportsQuery.isError && <div className="empty-inline"><ShieldAlert size={18} /> The live report queue could not be loaded. Confirm your Django role and connection.</div>}
        {reportsQuery.isSuccess && !filtered.length && <div className="empty-inline"><FileCheck2 size={18} /> No live reports match this review view.</div>}
        <div className="card-footer-note"><Flag size={15} />Risk labels support triage; they do not replace professional safeguarding assessment.</div>
      </article>

      {selected && <article className="surface-card report-live-detail">
        <div className="card-head"><div><div className="eyebrow">Protected report detail</div><h2>{selected.caseNumber}</h2></div><StatusPill status={selected.status} /></div>
        {detailQuery.isLoading && <div className="empty-inline"><ListFilter size={18} /> Loading protected detail…</div>}
        {detailQuery.isSuccess && <>
          <div className="report-live-detail__grid">
            <div><span>Location</span><strong>{asText(detail.location_text, selected.campus)}</strong></div>
            <div><span>Department</span><strong>{asText(detail.department, "Not recorded")}</strong></div>
            <div><span>Immediate support</span><strong>{Boolean(detail.needs_immediate_help) ? "Indicated" : "Not indicated"}</strong></div>
            <div><span>Evidence</span><strong>{evidence.length} protected attachment{evidence.length === 1 ? "" : "s"}</strong></div>
            <div className="report-live-detail__full"><span>Record summary</span><p>{asText(detail.description, "No further narrative is available in this view.")}</p></div>
          </div>
          <section className="evidence-panel">
            <div><div className="eyebrow">Protected evidence</div><h3>Attachments in this report</h3></div>
            <div className="evidence-list">
              {evidence.map(item => <a key={String(item.id)} href={`/api/gbv/reports/${selected.id}/evidence/${String(item.id)}/download`} target="_blank" rel="noreferrer"><FileCheck2 size={16} /><span>{asText(item.file_type, "Evidence file")}</span><small>{formatWhen(item.created_at)}</small><Download size={15} /></a>)}
              {!evidence.length && <div className="empty-inline"><FileCheck2 size={17} /> No evidence is attached to this report.</div>}
            </div>
            <div className="evidence-upload"><label><Upload size={16} /> <span>{evidenceFile ? evidenceFile.name : "Choose evidence file"}</span><input type="file" onChange={selectEvidence} /></label><button className="button button--outline" onClick={sendEvidence} disabled={!evidenceFile || uploadEvidence.isPending}>{uploadEvidence.isPending ? "Uploading…" : "Upload evidence"}</button></div>
            <small className="evidence-note">Django validates file type, access, and the 25MB limit before it accepts an upload.</small>
          </section>
        </>}
      </article>}
    </div>
  );
}

function Summary({ icon, tone, label, value, detail }: { icon: React.ReactNode; tone: string; label: string; value: string; detail: string }) {
  return <article className={`report-summary report-summary--${tone}`}>{icon}<div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>;
}
