/**
 * Server-only integration boundary for the existing Django REST API. Browser
 * code never receives Django JWTs; it calls typed tRPC procedures while this
 * module stores the tokens in HTTP-only cookies on the web-console origin.
 */
import type { Request, Response } from "express";
import { parse } from "cookie";
import { TRPCError } from "@trpc/server";
import { ENV } from "./_core/env";
import { getSessionCookieOptions } from "./_core/cookies";

const ACCESS_COOKIE = "gbv_access";
const REFRESH_COOKIE = "gbv_refresh";
const ACCESS_COOKIE_MAX_AGE = 5 * 60 * 1000;
const REFRESH_COOKIE_MAX_AGE = 24 * 60 * 60 * 1000;

export type DjangoProfile = {
  id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  role: "REPORTER" | "OFFICER" | "ADMIN";
  is_active: boolean;
  requires_totp: boolean;
  date_joined: string;
  created_at: string;
};

type DjangoTokens = { access: string; refresh: string };
type DjangoLoginPending = { requires_totp: true; detail: string };

export class GbvApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "GbvApiError";
  }
}

function getBaseUrl() {
  const baseUrl = ENV.gbvApiBaseUrl.replace(/\/+$/, "");
  if (!baseUrl) throw new Error("GBV_API_BASE_URL is not configured");
  return baseUrl;
}

function cookieOptions(req: Request, maxAge: number) {
  return { ...getSessionCookieOptions(req), maxAge };
}

function readTokens(req: Request): Partial<DjangoTokens> {
  const cookies = parse(req.headers.cookie ?? "");
  return { access: cookies[ACCESS_COOKIE], refresh: cookies[REFRESH_COOKIE] };
}

function setTokens(req: Request, res: Response, tokens: DjangoTokens) {
  res.cookie(ACCESS_COOKIE, tokens.access, cookieOptions(req, ACCESS_COOKIE_MAX_AGE));
  res.cookie(REFRESH_COOKIE, tokens.refresh, cookieOptions(req, REFRESH_COOKIE_MAX_AGE));
}

export function clearTokens(req: Request, res: Response) {
  res.clearCookie(ACCESS_COOKIE, getSessionCookieOptions(req));
  res.clearCookie(REFRESH_COOKIE, getSessionCookieOptions(req));
}

export async function gbvHealth() {
  const response = await fetch(`${getBaseUrl()}/api/v1/health/`, { signal: AbortSignal.timeout(5_000) });
  if (!response.ok) throw new GbvApiError(response.status, `Django health check failed (${response.status})`);
  return response.json() as Promise<{ status: string }>;
}

export async function gbvFetch<T>(path: string, options: RequestInit & { accessToken?: string } = {}): Promise<T> {
  const { accessToken, headers, ...requestOptions } = options;
  const response = await fetch(`${getBaseUrl()}/api/v1/${path.replace(/^\//, "")}`, {
    ...requestOptions,
    headers: {
      Accept: "application/json",
      ...(requestOptions.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    signal: requestOptions.signal ?? AbortSignal.timeout(15_000),
  });

  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({ detail: "The Django API returned an unreadable response." }));
  if (!response.ok) {
    const record = typeof body === "object" && body ? body as Record<string, unknown> : null;
    const nonFieldError = Array.isArray(record?.non_field_errors) ? record.non_field_errors[0] : undefined;
    const detail = record ? (record.detail ?? record.error ?? nonFieldError ?? JSON.stringify(record)) : "Django API request failed";
    throw new GbvApiError(response.status, String(detail));
  }
  return body as T;
}

async function fetchProfile(accessToken: string) {
  return gbvFetch<DjangoProfile>("auth/profile/", { accessToken });
}

export async function djangoLogin(req: Request, res: Response, input: { email: string; password: string; totpCode?: string }) {
  const result = await gbvFetch<DjangoTokens | DjangoLoginPending>("auth/login/", {
    method: "POST",
    body: JSON.stringify({ email: input.email, password: input.password, totp_code: input.totpCode ?? "" }),
  });
  if ("requires_totp" in result) return result;
  setTokens(req, res, result);
  return { profile: await fetchProfile(result.access), requires_totp: false as const };
}

export async function djangoSession(req: Request, res: Response): Promise<DjangoProfile | null> {
  const tokens = readTokens(req);
  if (!tokens.access) return null;
  try {
    return await fetchProfile(tokens.access);
  } catch (error) {
    if (!(error instanceof GbvApiError) || error.status !== 401 || !tokens.refresh) throw error;
    try {
      const refreshed = await gbvFetch<{ access: string }>("auth/token/refresh/", { method: "POST", body: JSON.stringify({ refresh: tokens.refresh }) });
      setTokens(req, res, { access: refreshed.access, refresh: tokens.refresh });
      return await fetchProfile(refreshed.access);
    } catch (refreshError) {
      clearTokens(req, res);
      if (refreshError instanceof GbvApiError && refreshError.status === 401) return null;
      throw refreshError;
    }
  }
}

/** Execute a Django request with the current HTTP-only session. If a short-lived
 * access token has expired, refresh it once server-side and retry transparently. */
export async function gbvAuthedFetch<T>(req: Request, res: Response, path: string, options: RequestInit = {}): Promise<T> {
  const tokens = readTokens(req);
  if (!tokens.access) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in is required to access the safeguarding API." });
  try {
    return await gbvFetch<T>(path, { ...options, accessToken: tokens.access });
  } catch (error) {
    if (error instanceof GbvApiError && error.status === 403) throw new TRPCError({ code: "FORBIDDEN", message: error.message });
    if (error instanceof GbvApiError && error.status === 401 && !tokens.refresh) {
      clearTokens(req, res);
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Your Django session has expired. Please sign in again." });
    }
    if (!(error instanceof GbvApiError) || error.status !== 401) throw error;
    const refreshToken = tokens.refresh;
    if (!refreshToken) {
      clearTokens(req, res);
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Your Django session has expired. Please sign in again." });
    }
    try {
      const refreshed = await gbvFetch<{ access: string }>("auth/token/refresh/", { method: "POST", body: JSON.stringify({ refresh: refreshToken }) });
      setTokens(req, res, { access: refreshed.access, refresh: refreshToken });
      return await gbvFetch<T>(path, { ...options, accessToken: refreshed.access });
    } catch (refreshError) {
      if (refreshError instanceof GbvApiError && refreshError.status === 401) {
        clearTokens(req, res);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Your Django session has expired. Please sign in again." });
      }
      throw refreshError;
    }
  }
}

async function gbvRawFetch(path: string, accessToken: string) {
  const response = await fetch(`${getBaseUrl()}/api/v1/${path.replace(/^\//, "")}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: "The Django API could not stream this evidence file." }));
    const detail = typeof body === "object" && body ? ((body as Record<string, unknown>).detail ?? (body as Record<string, unknown>).error ?? "Evidence download failed") : "Evidence download failed";
    throw new GbvApiError(response.status, String(detail));
  }
  return response;
}

/** Returns the upstream file response only after checking the same HTTP-only
 * Django session used by tRPC. The caller streams it to the browser unchanged. */
export async function gbvAuthedResponse(req: Request, res: Response, path: string) {
  const tokens = readTokens(req);
  if (!tokens.access) throw new GbvApiError(401, "Sign in is required to access evidence.");
  try {
    return await gbvRawFetch(path, tokens.access);
  } catch (error) {
    if (!(error instanceof GbvApiError) || error.status !== 401 || !tokens.refresh) throw error;
    const refreshed = await gbvFetch<{ access: string }>("auth/token/refresh/", { method: "POST", body: JSON.stringify({ refresh: tokens.refresh }) });
    setTokens(req, res, { access: refreshed.access, refresh: tokens.refresh });
    return gbvRawFetch(path, refreshed.access);
  }
}

export async function djangoLogout(req: Request, res: Response) {
  const tokens = readTokens(req);
  try {
    if (tokens.access && tokens.refresh) {
      await gbvFetch("auth/logout/", { method: "POST", accessToken: tokens.access, body: JSON.stringify({ refresh_token: tokens.refresh }) });
    }
  } finally {
    clearTokens(req, res);
  }
  return { success: true } as const;
}
