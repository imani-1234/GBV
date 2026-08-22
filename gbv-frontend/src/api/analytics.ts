import apiClient from "./client";
import type { SummaryStats, AuditLogEntry } from "../types";

export const analyticsApi = {
  summary: () =>
    apiClient.get<SummaryStats>("/analytics/summary/").then((r) => r.data),

  byDepartment: () =>
    apiClient.get<{ department: string; count: number }[]>("/analytics/by-department/").then((r) => r.data),

  byMonth: () =>
    apiClient.get<{ month: string; count: number; resolved: number; resolution_rate: number }[]>("/analytics/by-month/").then((r) => r.data),

  auditLogs: (params?: Record<string, string>) =>
    apiClient.get<{ results: AuditLogEntry[] }>("/analytics/audit-logs/", { params }).then((r) => r.data),
};
