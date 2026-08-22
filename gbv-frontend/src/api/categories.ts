import apiClient from "./client";
import type { IncidentCategory } from "../types";

export interface CreateCategoryPayload {
  name: string;
  description: string;
  default_priority: string;
}

export const categoriesApi = {
  list: () =>
    apiClient.get<IncidentCategory[]>("/categories/").then((r) => r.data),

  get: (id: string) =>
    apiClient.get<IncidentCategory>(`/categories/${id}/`).then((r) => r.data),

  create: (payload: CreateCategoryPayload) =>
    apiClient.post<IncidentCategory>("/categories/", payload).then((r) => r.data),

  update: (id: string, payload: Partial<CreateCategoryPayload>) =>
    apiClient.patch<IncidentCategory>(`/categories/${id}/`, payload).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/categories/${id}/`),
};
