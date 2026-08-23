import apiClient from "./client";
import type { Campus, Department } from "../types";

export type CampusPayload = { name: string; code?: string; is_active?: boolean };
export type DepartmentPayload = { campus: string; name: string; code?: string; is_active?: boolean };

function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { results?: unknown }).results)) {
    return (payload as { results: T[] }).results;
  }
  return [];
}

export const locationsApi = {
  campuses: () => apiClient.get<unknown>("/locations/campuses/").then((response) => normalizeList<Campus>(response.data)),
  departments: (campusId: string) => apiClient
    .get<unknown>("/locations/departments/", { params: { campus: campusId } })
    .then((response) => normalizeList<Department>(response.data)),
  adminCampuses: () => apiClient.get<unknown>("/admin/campuses/").then((response) => normalizeList<Campus>(response.data)),
  createCampus: (payload: CampusPayload) => apiClient.post<Campus>("/admin/campuses/", payload).then((response) => response.data),
  updateCampus: (id: string, payload: Partial<CampusPayload>) => apiClient.patch<Campus>(`/admin/campuses/${id}/`, payload).then((response) => response.data),
  adminDepartments: () => apiClient.get<unknown>("/admin/departments/").then((response) => normalizeList<Department>(response.data)),
  createDepartment: (payload: DepartmentPayload) => apiClient.post<Department>("/admin/departments/", payload).then((response) => response.data),
  updateDepartment: (id: string, payload: Partial<DepartmentPayload>) => apiClient.patch<Department>(`/admin/departments/${id}/`, payload).then((response) => response.data),
};
