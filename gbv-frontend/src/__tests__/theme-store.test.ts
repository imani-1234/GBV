import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("react-native", () => ({
  Platform: { OS: "web" },
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useThemeStore } from "../stores/themeStore";
import { generateLightScheme, generateDarkScheme } from "../theme/colors";

describe("themeStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useThemeStore.setState({
      scheme: generateLightScheme(),
      isDark: false,
      mode: "system",
      role: null,
      isReady: false,
    });
  });

  it("starts with light scheme by default after hydrate", async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    await useThemeStore.getState().hydrate();

    const state = useThemeStore.getState();
    expect(state.isReady).toBe(true);
    expect(state.isDark).toBe(false);
    expect(state.mode).toBe("system");
  });

  it("setMode changes to dark scheme", async () => {
    await useThemeStore.getState().setMode("dark");

    const state = useThemeStore.getState();
    expect(state.isDark).toBe(true);
    expect(state.mode).toBe("dark");
    expect(state.scheme.primary).toBe(
      generateDarkScheme().primary,
    );
  });

  it("setMode persists to AsyncStorage", async () => {
    await useThemeStore.getState().setMode("light");

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "gbv_theme_mode",
      "light",
    );
  });

  it("setRole updates nav colors for each role", () => {
    useThemeStore.getState().setRole("OFFICER");
    expect(useThemeStore.getState().role).toBe("OFFICER");
    expect(useThemeStore.getState().scheme.navActiveTint).toBe(
      generateLightScheme().secondary,
    );

    useThemeStore.getState().setRole("ADMIN");
    expect(useThemeStore.getState().role).toBe("ADMIN");
    expect(useThemeStore.getState().scheme.navActiveTint).toBe(
      generateLightScheme().tertiary,
    );

    useThemeStore.getState().setRole("REPORTER");
    expect(useThemeStore.getState().role).toBe("REPORTER");
    expect(useThemeStore.getState().scheme.navActiveTint).toBe(
      generateLightScheme().primary,
    );
  });

  it("setRole null resets to default nav colors", () => {
    useThemeStore.getState().setRole("ADMIN");
    useThemeStore.getState().setRole(null);

    expect(useThemeStore.getState().role).toBeNull();
  });

  it("hydrate loads saved mode from AsyncStorage", async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue("dark");

    await useThemeStore.getState().hydrate();

    const state = useThemeStore.getState();
    expect(state.isDark).toBe(true);
    expect(state.mode).toBe("dark");
    expect(state.isReady).toBe(true);
  });
});
