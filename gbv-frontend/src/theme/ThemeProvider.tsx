import { createContext, useContext, useEffect, ReactNode } from "react";
import * as SplashScreen from "expo-splash-screen";
import { Platform } from "react-native";
import { useThemeStore } from "../stores/themeStore";
import type { M3Scheme } from "./colors";
import { typography } from "./typography";
import type { Typography } from "./typography";
import { spacing, borderRadius } from "./spacing";
import { getElevation } from "./elevation";

export interface ThemeContextValue {
  scheme: M3Scheme;
  isDark: boolean;
  setMode: (mode: "light" | "dark" | "system") => Promise<void>;
  setRole: (role: "REPORTER" | "OFFICER" | "ADMIN" | null) => void;
  role: "REPORTER" | "OFFICER" | "ADMIN" | null;
  typography: Typography;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  getElevation: (level: number) => ReturnType<typeof getElevation>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const isReady = useThemeStore((s) => s.isReady);
  const scheme = useThemeStore((s) => s.scheme);
  const isDark = useThemeStore((s) => s.isDark);
  const role = useThemeStore((s) => s.role);
  const setMode = useThemeStore((s) => s.setMode);
  const setRole = useThemeStore((s) => s.setRole);
  const hydrate = useThemeStore((s) => s.hydrate);

  useEffect(() => {
    hydrate().then(() => SplashScreen.hideAsync());
  }, []);

  // Listen for system color scheme changes
  useEffect(() => {
    if (Platform.OS === "web") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => {
        const mode = useThemeStore.getState().mode;
        if (mode === "system") {
          const dark = mq.matches;
          const { generateDarkScheme, generateLightScheme } = require("./colors");
          const newScheme = dark ? generateDarkScheme() : generateLightScheme();
          useThemeStore.setState({ scheme: newScheme, isDark: dark });
        }
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else {
      // React Native Appearance API
      const { Appearance } = require("react-native");
      const sub = Appearance.addChangeListener(({ colorScheme }: { colorScheme: string | null }) => {
        const mode = useThemeStore.getState().mode;
        if (mode === "system") {
          const dark = colorScheme === "dark";
          const { generateDarkScheme, generateLightScheme } = require("./colors");
          const newScheme = dark ? generateDarkScheme() : generateLightScheme();
          useThemeStore.setState({ scheme: newScheme, isDark: dark });
        }
      });
      return () => sub.remove();
    }
  }, []);

  if (!isReady) return null;

  const value: ThemeContextValue = {
    scheme,
    isDark,
    role,
    setMode,
    setRole,
    typography,
    spacing,
    borderRadius,
    getElevation: (level: number) => getElevation(level as 0|1|2|3|4|5, isDark),
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
