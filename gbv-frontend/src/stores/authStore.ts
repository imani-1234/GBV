import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import type { User, AuthTokens } from "../types";
import { useThemeStore } from "./themeStore";

const STORAGE_KEY_ACCESS = "auth_access_token";
const STORAGE_KEY_REFRESH = "auth_refresh_token";
const STORAGE_KEY_USER = "auth_user";
const STORAGE_KEY_ANONYMOUS_CODE = "anonymous_reporter_code";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAnonymous: boolean;
  anonymousReporterCode: string | null;
  login: (tokens: AuthTokens, user: User) => Promise<void>;
  anonymousRegister: (tokens: AuthTokens, user: User, reporterCode: string) => Promise<void>;
  setUser: (user: User | null) => void;
  setTokens: (tokens: AuthTokens) => Promise<void>;
  clearAuth: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isAnonymous: false,
  anonymousReporterCode: null,

  login: async (tokens: AuthTokens, user: User) => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEY_ACCESS, tokens.access);
      await SecureStore.setItemAsync(STORAGE_KEY_REFRESH, tokens.refresh);
      await SecureStore.setItemAsync(STORAGE_KEY_USER, JSON.stringify(user));
    } catch {}
    set({ user, isAuthenticated: true, isAnonymous: false });
    useThemeStore.getState().setRole(user.role);
  },

  anonymousRegister: async (tokens: AuthTokens, user: User, reporterCode: string) => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEY_ACCESS, tokens.access);
      await SecureStore.setItemAsync(STORAGE_KEY_REFRESH, tokens.refresh);
      await SecureStore.setItemAsync(STORAGE_KEY_USER, JSON.stringify(user));
      await SecureStore.setItemAsync(STORAGE_KEY_ANONYMOUS_CODE, reporterCode);
    } catch {}
    set({ user, isAuthenticated: true, isAnonymous: true, anonymousReporterCode: reporterCode });
    useThemeStore.getState().setRole(user.role);
  },

  setUser: (user) => {
    if (user) {
      try { SecureStore.setItemAsync(STORAGE_KEY_USER, JSON.stringify(user)); } catch {}
    }
    set({ user, isAuthenticated: !!user });
    useThemeStore.getState().setRole(user?.role ?? null);
  },

  setTokens: async (tokens) => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEY_ACCESS, tokens.access);
      await SecureStore.setItemAsync(STORAGE_KEY_REFRESH, tokens.refresh);
    } catch {}
  },

  clearAuth: async () => {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEY_ACCESS);
      await SecureStore.deleteItemAsync(STORAGE_KEY_REFRESH);
      await SecureStore.deleteItemAsync(STORAGE_KEY_USER);
      await SecureStore.deleteItemAsync(STORAGE_KEY_ANONYMOUS_CODE);
    } catch {}
    set({ user: null, isAuthenticated: false, isAnonymous: false, anonymousReporterCode: null });
    useThemeStore.getState().setRole(null);
  },

  hydrate: async () => {
    try {
      const userJson = await SecureStore.getItemAsync(STORAGE_KEY_USER);
      const code = await SecureStore.getItemAsync(STORAGE_KEY_ANONYMOUS_CODE);
      if (userJson) {
        const user: User = JSON.parse(userJson);
        const isAnonymous = user.actor_type === "anonymous" || !!code;
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          isAnonymous,
          anonymousReporterCode: code,
        });
        useThemeStore.getState().setRole(user.role);
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
