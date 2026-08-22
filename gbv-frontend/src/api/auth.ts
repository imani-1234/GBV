import apiClient from "./client";
import type {
  AuthTokens,
  LoginPayload,
  RegisterPayload,
  AnonymousLoginPayload,
  AnonymousRegisterResponse,
  TOTPEnrollResponse,
  TOTPStatus,
  User,
} from "../types";

export const authApi = {
  login: (data: LoginPayload) =>
    apiClient.post<AuthTokens>("/auth/login/", data).then((r) => r.data),

  register: (data: RegisterPayload) =>
    apiClient.post<User>("/auth/register/", data).then((r) => r.data),

  anonymousRegister: () =>
    apiClient.post<AnonymousRegisterResponse>("/auth/anonymous/register/").then((r) => r.data),

  anonymousLogin: (data: AnonymousLoginPayload) =>
    apiClient.post<AuthTokens>("/auth/anonymous/login/", data).then((r) => r.data),

  refreshToken: (refresh: string) =>
    apiClient.post<AuthTokens>("/auth/token/refresh/", { refresh }).then((r) => r.data),

  logout: (refreshToken: string) =>
    apiClient.post("/auth/logout/", { refresh_token: refreshToken }).then((r) => r.data),

  totpEnroll: () =>
    apiClient.post<TOTPEnrollResponse>("/auth/totp/enroll/").then((r) => r.data),

  totpVerify: (code: string) =>
    apiClient.post<{ status: string }>("/auth/totp/verify/", { code }).then((r) => r.data),

  totpStatus: () =>
    apiClient.get<TOTPStatus>("/auth/totp/status/").then((r) => r.data),

  getProfile: (accessToken?: string) =>
    apiClient.get<User>("/auth/profile/", {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    }).then((r) => r.data),
};
