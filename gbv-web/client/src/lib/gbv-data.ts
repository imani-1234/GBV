export type ApiRecord = Record<string, unknown>;

export type LiveCase = {
  id: string;
  caseNumber: string;
  status: string;
  priority: string;
  category: string;
  campus: string;
  owner: string;
  createdAt: string;
  reportId: string;
};

export type LiveReport = {
  id: string;
  caseNumber: string;
  status: string;
  priority: string;
  category: string;
  campus: string;
  createdAt: string;
  needsImmediateHelp: boolean;
  assignedOfficer: string;
  evidenceCount: number;
};

export function asRecords(value: unknown): ApiRecord[] {
  if (Array.isArray(value)) return value.filter((item): item is ApiRecord => Boolean(item && typeof item === "object"));
  if (value && typeof value === "object" && Array.isArray((value as ApiRecord).results)) return asRecords((value as ApiRecord).results);
  return [];
}

export function asText(value: unknown, fallback = "—") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export function humanize(value: unknown, fallback = "Not set") {
  return asText(value, fallback).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatWhen(value: unknown) {
  if (typeof value !== "string") return "No date available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No date available" : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export function mapCase(record: ApiRecord): LiveCase {
  const report = record.report && typeof record.report === "object" ? record.report as ApiRecord : {};
  const category = report.category && typeof report.category === "object" ? report.category as ApiRecord : {};
  const assignedOfficer = record.assigned_officer && typeof record.assigned_officer === "object" ? record.assigned_officer as ApiRecord : {};
  return {
    id: asText(record.id, "Unknown case"),
    caseNumber: asText(record.case_number, asText(report.case_number, "Pending case number")),
    status: asText(record.status, "PENDING_REVIEW"),
    priority: asText(record.priority, "MEDIUM"),
    category: asText(category.name, "Uncategorised"),
    campus: asText(report.campus, "Campus not recorded"),
    owner: asText(record.assigned_officer_name, asText(assignedOfficer.full_name, "Unassigned")),
    createdAt: asText(record.created_at, ""),
    reportId: asText(record.report, asText(report.id, "")),
  };
}

export function mapReport(record: ApiRecord): LiveReport {
  const category = record.category && typeof record.category === "object" ? record.category as ApiRecord : {};
  const evidence = Array.isArray(record.evidence) ? record.evidence : [];
  return {
    id: asText(record.id, "Unknown report"),
    caseNumber: asText(record.case_number, "Draft report"),
    status: asText(record.status, "DRAFT"),
    priority: asText(record.priority, "MEDIUM"),
    category: asText(category.name, "Uncategorised"),
    campus: asText(record.campus, "Campus not recorded"),
    createdAt: asText(record.created_at, ""),
    needsImmediateHelp: Boolean(record.needs_immediate_help),
    assignedOfficer: asText(record.assigned_officer_name, "Unassigned"),
    evidenceCount: evidence.length,
  };
}
