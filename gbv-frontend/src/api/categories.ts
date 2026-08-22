import apiClient from "./client";
import type { IncidentCategory } from "../types";

export interface CreateCategoryPayload {
  name: string;
  description: string;
  default_priority: string;
}

export function normalizeCategoryList(payload: unknown): IncidentCategory[] {
  if (Array.isArray(payload)) return payload as IncidentCategory[];

  if (payload && typeof payload === "object") {
    const results = (payload as { results?: unknown }).results;
    if (Array.isArray(results)) return results as IncidentCategory[];
  }

  return [];
}

export const categoriesApi = {
  list: () =>
    apiClient.get<unknown>("/categories/").then((r) => normalizeCategoryList(r.data)),

  get: (id: string) =>
    apiClient.get<IncidentCategory>(`/categories/${id}/`).then((r) => r.data),

  create: (payload: CreateCategoryPayload) =>
    apiClient.post<IncidentCategory>("/categories/", payload).then((r) => r.data),

  update: (id: string, payload: Partial<CreateCategoryPayload>) =>
    apiClient.patch<IncidentCategory>(`/categories/${id}/`, payload).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/categories/${id}/`),
};
