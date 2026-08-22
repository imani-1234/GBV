import apiClient from "./client";
import type { Notification, PaginatedResponse } from "../types";

export const notificationsApi = {
  list: (params?: Record<string, string>) =>
    apiClient.get<PaginatedResponse<Notification>>("/notifications/", { params }).then((r) => r.data),

  markRead: (id: string) =>
    apiClient.post(`/notifications/${id}/mark-read/`).then((r) => r.data),

  markAllRead: () =>
    apiClient.post<{ status: string; updated_count: number }>("/notifications/mark-all-read/").then((r) => r.data),
};
