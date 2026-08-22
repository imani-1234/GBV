import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { ApiError } from "../types";

const STORAGE_KEY_ACCESS = "auth_access_token";
const STORAGE_KEY_REFRESH = "auth_refresh_token";

const BASE_URL =
  Platform.OS === "web"
    ? process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000"
    : (process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.126:8000");

const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// ── Session expiry / deactivation event system ────────────────────
type SessionEventType = "session_expired" | "deactivated";
type SessionEventListener = (type: SessionEventType, detail?: string) => void;
const sessionListeners: SessionEventListener[] = [];

export function addSessionListener(fn: SessionEventListener) {
  sessionListeners.push(fn);
  return () => {
    const idx = sessionListeners.indexOf(fn);
    if (idx !== -1) sessionListeners.splice(idx, 1);
  };
}

function emitSessionEvent(type: SessionEventType, detail?: string) {
  sessionListeners.forEach((fn) => fn(type, detail));
}

// ── Token refresh queueing ────────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else if (token) prom.resolve(token);
  });
  failedQueue = [];
}

// ── Request interceptor ───────────────────────────────────────────
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await SecureStore.getItemAsync(STORAGE_KEY_ACCESS);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Axios inherits the instance JSON header unless it is explicitly removed.
      // For native FormData uploads, the platform must set multipart/form-data
      // together with its boundary; keeping application/json causes HTTP 415.
      if (typeof FormData !== "undefined" && config.data instanceof FormData && config.headers) {
        if (typeof config.headers.delete === "function") {
          config.headers.delete("Content-Type");
        } else {
          delete config.headers["Content-Type"];
          delete config.headers["content-type"];
        }
      }
    } catch {}
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor ──────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const status = error.response?.status;
    const data = error.response?.data;

    // 403 — Account deactivated or forbidden
    if (status === 403) {
      const detail = data?.detail || data?.error || "";
      if (detail.toLowerCase().includes("deactivated") || detail.toLowerCase().includes("inactive")) {
        await SecureStore.deleteItemAsync(STORAGE_KEY_ACCESS);
        await SecureStore.deleteItemAsync(STORAGE_KEY_REFRESH);
        emitSessionEvent("deactivated", detail);
      }
      return Promise.reject(error);
    }

    // 401 — Unauthorised, attempt silent refresh
    if (status !== 401) return Promise.reject(error);

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (originalRequest._retry) return Promise.reject(error);

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }
        return apiClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await SecureStore.getItemAsync(STORAGE_KEY_REFRESH);
      if (!refreshToken) throw new Error("No refresh token");

      const response = await axios.post(`${BASE_URL}/api/v1/auth/token/refresh/`, {
        refresh: refreshToken,
      });

      const newAccess = response.data.access;
      await SecureStore.setItemAsync(STORAGE_KEY_ACCESS, newAccess);
      processQueue(null, newAccess);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      }
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      await SecureStore.deleteItemAsync(STORAGE_KEY_ACCESS);
      await SecureStore.deleteItemAsync(STORAGE_KEY_REFRESH);
      emitSessionEvent("session_expired");
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export { STORAGE_KEY_ACCESS, STORAGE_KEY_REFRESH, BASE_URL };
export default apiClient;
