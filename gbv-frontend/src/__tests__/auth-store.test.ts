import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User, AuthTokens } from "../types";

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

vi.mock("../stores/themeStore", () => ({
  useThemeStore: {
    getState: () => ({ setRole: vi.fn() }),
  },
}));

import * as SecureStore from "expo-secure-store";
import { useAuthStore } from "../stores/authStore";

const mockTokens: AuthTokens = { access: "access-123", refresh: "refresh-123" };
const mockUser: User = {
  id: "user-1",
  email: "jane@test.edu",
  full_name: "Jane Doe",
  role: "REPORTER",
  is_active: true,
  requires_totp: false,
};

describe("authStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isAnonymous: false,
      anonymousReporterCode: null,
    });
  });

  it("starts unauthenticated", () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it("login sets user and tokens, stores in SecureStore", async () => {
    await useAuthStore.getState().login(mockTokens, mockUser);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
    expect(state.isAnonymous).toBe(false);

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "auth_access_token",
      mockTokens.access,
    );
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "auth_refresh_token",
      mockTokens.refresh,
    );
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "auth_user",
      JSON.stringify(mockUser),
    );
  });

  it("anonymousRegister stores code and sets anonymous flag", async () => {
    await useAuthStore
      .getState()
      .anonymousRegister(mockTokens, mockUser, "RPT-ABC123");

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.isAnonymous).toBe(true);
    expect(state.anonymousReporterCode).toBe("RPT-ABC123");

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "anonymous_reporter_code",
      "RPT-ABC123",
    );
  });

  it("clearAuth resets everything and deletes from SecureStore", async () => {
    await useAuthStore.getState().login(mockTokens, mockUser);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    await useAuthStore.getState().clearAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.isAnonymous).toBe(false);
    expect(state.anonymousReporterCode).toBeNull();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      "auth_access_token",
    );
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      "auth_refresh_token",
    );
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("auth_user");
  });

  it("setUser updates user and persists to SecureStore", () => {
    useAuthStore.getState().setUser(mockUser);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "auth_user",
      JSON.stringify(mockUser),
    );
  });

  it("setUser with null clears authentication", () => {
    useAuthStore.getState().setUser(mockUser);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    useAuthStore.getState().setUser(null);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("hydrate loads user from SecureStore", async () => {
    vi.mocked(SecureStore.getItemAsync).mockImplementation(
      async (key: string) => {
        if (key === "auth_user") return JSON.stringify(mockUser);
        if (key === "anonymous_reporter_code") return null;
        return null;
      },
    );

    await useAuthStore.getState().hydrate();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
    expect(state.isLoading).toBe(false);
  });

  it("hydrate handles missing user gracefully", async () => {
    vi.mocked(SecureStore.getItemAsync).mockResolvedValue(null);

    await useAuthStore.getState().hydrate();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(false);
  });
});
