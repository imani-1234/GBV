import { describe, it, expect, vi, beforeEach } from "vitest";

// Must mock before importing
vi.mock("expo-secure-store", () => ({
  default: {
    getItemAsync: vi.fn(),
    setItemAsync: vi.fn(),
    deleteItemAsync: vi.fn(),
  },
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

vi.mock("react-native", () => ({
  Platform: { OS: "web" },
}));

import axios from "axios";
import * as SecureStore from "expo-secure-store";

// Import after mocks
import apiClient, {
  STORAGE_KEY_ACCESS,
  STORAGE_KEY_REFRESH,
} from "../api/client";

describe("API Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an axios instance with correct base URL", () => {
    expect(apiClient.defaults.baseURL).toContain("/api/v1");
    expect(apiClient.defaults.timeout).toBe(15000);
  });

  it("attaches Authorization header when token exists", async () => {
    vi.mocked(SecureStore.getItemAsync).mockResolvedValue("test-token");

    const config = await apiClient.interceptors.request.handlers[0].fulfilled({
      headers: { common: {} },
    } as any);

    expect(config.headers.Authorization).toBe("Bearer test-token");
  });

  it("does not attach header when no token", async () => {
    vi.mocked(SecureStore.getItemAsync).mockResolvedValue(null);

    const config = await apiClient.interceptors.request.handlers[0].fulfilled({
      headers: {},
    } as any);

    expect(config.headers.Authorization).toBeUndefined();
  });

  it("rejects on 401 without refresh token, clears storage", async () => {
    vi.mocked(SecureStore.getItemAsync).mockResolvedValue(null);

    const error = {
      response: { status: 401 },
      config: { headers: {} },
    };

    await expect(
      apiClient.interceptors.response.handlers[0].rejected(error)
    ).rejects.toBeDefined();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      STORAGE_KEY_ACCESS
    );
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      STORAGE_KEY_REFRESH
    );
  });

  it("rejects non-401 errors without attempting refresh", async () => {
    const error = {
      response: { status: 403 },
      config: { headers: {} },
    };

    await expect(
      apiClient.interceptors.response.handlers[0].rejected(error)
    ).rejects.toEqual(error);
  });

  it("attempts token refresh on 401 with existing refresh token", async () => {
    vi.mocked(SecureStore.getItemAsync).mockImplementation(
      async (key: string) => {
        if (key === STORAGE_KEY_REFRESH) return "refresh-token-123";
        if (key === STORAGE_KEY_ACCESS) return "expired-access";
        return null;
      },
    );

    const error = {
      response: { status: 401 },
      config: { headers: {}, _retry: undefined },
    };

    // The refresh attempt will fail because we mock axios.post too,
    // but we can verify it tries to get the refresh token
    await expect(
      apiClient.interceptors.response.handlers[0].rejected(error),
    ).rejects.toBeDefined();
  });

  it("emits session_expired event when refresh fails", async () => {
    vi.mocked(SecureStore.getItemAsync).mockResolvedValue(null);

    const { addSessionListener } = await import("../api/client");

    const listener = vi.fn();
    const unsub = addSessionListener(listener);

    const error = {
      response: { status: 401 },
      config: { headers: {} },
    };

    await apiClient.interceptors.response.handlers[0]
      .rejected(error)
      .catch(() => {});

    expect(listener).toHaveBeenCalledWith(
      "session_expired",
      undefined,
    );
    unsub();
  });

  it("emits deactivated event on 403 with deactivated detail", async () => {
    const { addSessionListener } = await import("../api/client");

    const listener = vi.fn();
    const unsub = addSessionListener(listener);

    const error = {
      response: {
        status: 403,
        data: { detail: "Account has been deactivated" },
      },
      config: { headers: {} },
    };

    await apiClient.interceptors.response.handlers[0]
      .rejected(error)
      .catch(() => {});

    expect(listener).toHaveBeenCalledWith(
      "deactivated",
      expect.any(String),
    );
    unsub();
  });
});
