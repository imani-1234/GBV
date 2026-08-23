// User roles
export type UserRole = "REPORTER" | "OFFICER" | "ADMIN";

// Core User (matches Django User model)
export interface User {
  id: string; // UUID
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  requires_totp: boolean;
  actor_type?: "identified" | "anonymous";
  created_at?: string;
}

// Auth response from backend
export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  full_name: string;
  password: string;
  phone_number?: string;
}

export interface AnonymousRegisterResponse {
  reporter_code: string;
  message: string;
  access?: string;
  refresh?: string;
  user?: User;
}

export interface AnonymousRegisterPayload {
  password: string;
}

export interface AnonymousLoginPayload {
  reporter_code: string;
  password: string;
}

export interface TOTPEnrollResponse {
  secret: string;
  provisioning_uri: string;
  qr_code_url: string | null;
}

export interface TOTPStatus {
  requires_totp: boolean;
  enrolled: boolean;
}

export interface LogoutPayload {
  refresh_token: string;
}

// Report (mirrors Django Report model)
export interface Report {
  id: string;
  case_number: string | null;
  status: "draft" | "submitted" | "under_review" | "assigned" | "resolved" | "closed";
  category: IncidentCategory;
  incident_date: string;
  campus: string;
  department: string;
  location_text: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  reporter_info: ReporterInfo;
  evidence: Evidence[];
  created_at: string;
  updated_at: string;
}

export interface ReporterInfo {
  id?: string;
  reporter_code?: string;
  full_name?: string;
}

export interface IncidentCategory {
  id: string;
  name: string;
  description: string;
  default_priority: string;
}

export interface Evidence {
  id: string;
  report: string;
  file: string;
  file_type: string;
  uploaded_by_actor_type: string;
  created_at: string;
}

// Case (mirrors Django Case model)
export interface Case {
  id: string;
  report: Report;
  assigned_officer: User | null;
  status: CaseStatus;
  priority: string;
  notes: CaseNote[];
  information_requests: InformationRequest[];
  opened_at: string;
  closed_at: string | null;
  resolution_summary: string;
  created_at: string;
  updated_at: string;
}

export type CaseStatus =
  | "PENDING_REVIEW"
  | "ASSIGNED"
  | "UNDER_REVIEW"
  | "AWAITING_REPORTER_RESPONSE"
  | "UNDER_INVESTIGATION"
  | "REFERRED"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED";

export interface CaseNote {
  id: string;
  case: string;
  author: User | null;
  author_name?: string;
  note_text: string;
  is_internal: boolean;
  created_at: string;
}

export interface InformationRequest {
  id: string;
  case: string;
  requested_by: User | null;
  request_text: string;
  status: "PENDING" | "FULFILLED";
  reporter_response: string | null;
  responded_at: string | null;
  created_at: string;
}

// Message (mirrors Django Message model)
export interface Message {
  id: string;
  conversation: string;
  sender_user: User | null;
  sender_actor_type: string;
  body: string | null;
  attachments: MessageAttachment[];
  sent_at: string;
  read_at: string | null;
}

export interface MessageAttachment {
  id: string;
  message: string;
  file: string;
  file_type: string;
  created_at: string;
}

// Notification (mirrors Django Notification model)
export interface Notification {
  id: string;
  notification_type: string;
  payload: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

// Analytics
export interface SummaryStats {
  total_reports: number;
  by_status: Record<string, number>;
  by_category: { category__name: string; count: number }[];
  by_priority: Record<string, number>;
  anonymous_reports: number;
  identified_reports: number;
  avg_resolution_time_seconds: number | null;
}

export interface AuditLogEntry {
  id: string;
  actor_type: string;
  actor_identifier: string;
  action: string;
  resource_type: string;
  resource_id: string;
  timestamp: string;
  ip_address: string | null;
  metadata: Record<string, unknown>;
}

// API Error
export interface ApiError {
  detail?: string;
  error?: string;
  [key: string]: unknown;
}

// Paginated response (DRF pagination)
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
