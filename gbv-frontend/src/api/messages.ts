import apiClient from "./client";
import type { Message, PaginatedResponse } from "../types";

export const messagesApi = {
  list: (caseId: string) =>
    apiClient.get<PaginatedResponse<Message>>(`/cases/${caseId}/messages/`).then((r) => r.data),

  send: (caseId: string, body: string) =>
    apiClient.post<Message>(`/cases/${caseId}/messages/`, { body }).then((r) => r.data),

  sendWithAttachments: (caseId: string, formData: FormData) =>
    // No manual Content-Type header (see reports.ts uploadEvidence): on React
    // Native a hand-set multipart header loses the boundary and the request
    // dies with a "Network Error" before reaching the server.
    apiClient.post<Message>(`/cases/${caseId}/messages/`, formData).then((r) => r.data),

  markRead: (caseId: string, messageId: string) =>
    apiClient.post(`/cases/${caseId}/messages/${messageId}/mark-read/`).then((r) => r.data),
};
