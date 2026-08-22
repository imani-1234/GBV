import apiClient from "./client";
import type { Case, PaginatedResponse } from "../types";

export interface AllowedTransition {
  status: string;
  label: string;
  requires_note: boolean;
  note_label?: string;
}

export interface OfficerStats {
  total_assigned: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  needs_attention: Case[];
}

export const casesApi = {
  list: (params?: Record<string, string>) =>
    apiClient.get<PaginatedResponse<Case>>("/cases/", { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<Case>(`/cases/${id}/`).then((r) => r.data),

  assign: (id: string, officerId: string) =>
    apiClient.post<Case>(`/cases/${id}/assign/`, { assigned_officer: officerId }).then((r) => r.data),

  unassign: (id: string) =>
    apiClient.post<Case>(`/cases/${id}/unassign/`).then((r) => r.data),

  transition: (id: string, newStatus: string, note?: string) =>
    apiClient.post<Case>(`/cases/${id}/transition/`, { new_status: newStatus, note }).then((r) => r.data),

  requestInformation: (id: string, question: string) =>
    apiClient.post(`/cases/${id}/request-information/`, { request_text: question }).then((r) => r.data),

  respondToInfoRequest: (caseId: string, reqId: string, response: string) =>
    apiClient.post(`/cases/${caseId}/request-information/${reqId}/respond/`, {
      reporter_response: response,
    }).then((r) => r.data),

  getNotes: (id: string) =>
    apiClient.get(`/cases/${id}/notes/`).then((r) => r.data),

  addNote: (id: string, noteText: string, isInternal: boolean) =>
    apiClient.post(`/cases/${id}/notes/`, { note_text: noteText, is_internal: isInternal }).then((r) => r.data),

  allowedTransitions: (id: string) =>
    apiClient.get<AllowedTransition[]>(`/cases/${id}/allowed-transitions/`).then((r) => r.data),

  overwritePriority: (id: string, priority: string) =>
    apiClient.post<Case>(`/cases/${id}/overwrite-priority/`, { priority }).then((r) => r.data),

  officerStats: () =>
    apiClient.get<OfficerStats>("/cases/officer-stats/").then((r) => r.data),
};
