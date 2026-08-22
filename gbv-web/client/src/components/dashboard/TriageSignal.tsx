/**
 * Style reminder — Zanzibar Civic Ledger: the pulse band is a signature
 * operational marker combining urgency, age, and workflow state in one line.
 */
import { humanize } from "@/lib/gbv-data";

export function TriageSignal({ priority, status, age }: { priority: string; status: string; age: string }) {
  const normalizedPriority = priority.toLowerCase().replaceAll("_", "-");
  const stage = status.toLowerCase().replaceAll("_", "-").replaceAll(" ", "-");
  return <span className={`triage-signal triage-signal--${normalizedPriority}`} aria-label={`${humanize(priority)} priority, ${humanize(status)}, recorded ${age}`}><i className="triage-signal__urgency" /><i className={`triage-signal__stage triage-signal__stage--${stage}`} /><span>{age}</span></span>;
}
