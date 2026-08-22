import apiClient from "./client";
import type { IncidentCategory, Report, PaginatedResponse } from "../types";

type ReportCreatePayload = Omit<Partial<Report>, "category"> & {
  category?: string | IncidentCategory;
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
