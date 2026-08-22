/**
 * Style reminder — Zanzibar Civic Ledger: status is concise, high contrast,
 * and never relies on colour alone for sensitive operational meaning.
 */
import { humanize } from "@/lib/gbv-data";

function classValue(value: string) {
  return value.toLowerCase().replaceAll("_", "-").replaceAll(" ", "-");
}

export function StatusPill({ status }: { status: string }) {
  return <span className={`status-pill status-pill--${classValue(status)}`}>{humanize(status)}</span>;
}

export function PriorityPill({ priority }: { priority: string }) {
  return <span className={`priority-pill priority-pill--${classValue(priority)}`}><i />{humanize(priority)}</span>;
}
