import apiClient from "./client";
import type { User, PaginatedResponse } from "../types";

export interface CreateOfficerPayload {
  email: string;
  full_name: string;
  password: string;
  department?: string;
}

export const usersApi = {
  list: (params?: Record<string, string>) =>
    apiClient.get<PaginatedResponse<User>>("/admin/users/", { params }).then((r) => r.data),

  createOfficer: (payload: CreateOfficerPayload) =>
    apiClient.post<User>("/admin/officers/", payload).then((r) => r.data),

  deactivate: (id: string) =>
    apiClient.post<User>(`/admin/users/${id}/deactivate/`).then((r) => r.data),

  reactivate: (id: string) =>
    apiClient.post<User>(`/admin/users/${id}/reactivate/`).then((r) => r.data),
};
