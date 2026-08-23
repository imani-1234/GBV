import apiClient from "./client";
import type { IncidentCategory, PaginatedResponse, Report, SuspectDetails, SuspectType, VictimGender } from "../types";

export type ReportCreatePayload = {
  category: string | IncidentCategory;
  campus_option: string;
  department_option: string;
  location_text?: string;
  incident_date: string;
  description: string;
  victim_is_reporter?: boolean;
  victim_details?: { name?: string; contact?: string };
  victim_gender?: VictimGender | "";
  offender_known?: boolean;
  offender_details?: { name?: string; relationship?: string };
  suspect_type?: SuspectType | "";
  suspect_campus?: string | null;
  suspect_department?: string | null;
  suspect_details?: SuspectDetails;
  witnesses?: { name?: string; contact?: string }[];
  needs_immediate_help?: boolean;
  consent_to_contact?: boolean;
  priority?: "low" | "medium" | "high" | "critical";
};

export const reportsApi = {
  list: (params?: Record<string, string>) =>
    apiClient.get<PaginatedResponse<Report>>("/reports/", { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<Report>(`/reports/${id}/`).then((r) => r.data),

  create: (data: ReportCreatePayload) =>
    apiClient.post<Report>("/reports/", data).then((r) => r.data),

  update: (id: string, data: Partial<Report>) =>
    apiClient.patch<Report>(`/reports/${id}/`, data).then((r) => r.data),

  submit: (id: string) =>
    apiClient.post<Report>(`/reports/${id}/submit/`).then((r) => r.data),

  uploadEvidence: (id: string, file: FormData) =>
    // No manual Content-Type header: on React Native axios cannot generate the
    // multipart boundary when the header is set by hand, which fails the request
    // with a "Network Error" before it ever reaches the server. Let the platform
    // set it with the correct boundary instead.
    apiClient.post<Report>(`/reports/${id}/evidence/`, file).then((r) => r.data),
};
