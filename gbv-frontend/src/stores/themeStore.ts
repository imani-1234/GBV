import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { generateLightScheme, generateDarkScheme, tonalPalettes } from "../theme/colors";
import type { M3Scheme } from "../theme/colors";

type UserRole = "REPORTER" | "OFFICER" | "ADMIN";
type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "gbv_theme_mode";

function getSystemIsDark(): boolean {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return false;
}

function deriveNavColors(scheme: M3Scheme, role: UserRole | null) {
  const base = { navActiveTint: scheme.primary, navInactiveTint: scheme.outline };
  if (!role) return base;
  switch (role) {
    case "REPORTER":
      return { navActiveTint: scheme.primary, navInactiveTint: scheme.outline };
    case "OFFICER":
      return { navActiveTint: scheme.secondary, navInactiveTint: scheme.outline };
    case "ADMIN":
      return { navActiveTint: scheme.tertiary, navInactiveTint: scheme.outline };
    default:
      return base;
  }
}

export type { UserRole, ThemeMode };

export interface ThemeState {
  scheme: M3Scheme;
  isDark: boolean;
  mode: ThemeMode;
  role: UserRole | null;
  isReady: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
  setRole: (role: UserRole | null) => void;
  hydrate: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  scheme: generateLightScheme(),
  isDark: false,
  mode: "system",
  role: null,
  isReady: false,

  setMode: async (mode: ThemeMode) => {
    const isDark = mode === "dark" || (mode === "system" && getSystemIsDark());
    const scheme = isDark ? generateDarkScheme() : generateLightScheme();
    const role = get().role;
    const navColors = deriveNavColors(scheme, role);
    set({ scheme: { ...scheme, ...navColors }, isDark, mode });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, mode);
    } catch {}
  },

  setRole: (role: UserRole | null) => {
    const state = get();
    const navColors = deriveNavColors(state.scheme, role);
    set({ role, scheme: { ...state.scheme, ...navColors } });
  },

  hydrate: async () => {
    let mode: ThemeMode = "system";
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "system") {
        mode = stored;
      }
    } catch {}
    const isDark = mode === "dark" || (mode === "system" && getSystemIsDark());
    const scheme = isDark ? generateDarkScheme() : generateLightScheme();
    set({ scheme, isDark, mode, isReady: true });
  },
}));
