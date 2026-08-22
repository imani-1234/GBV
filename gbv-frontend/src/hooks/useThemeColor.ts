import { useThemeStore } from "../stores/themeStore";

type ColorKey = keyof ReturnType<typeof useThemeStore.getState>["scheme"];

export function useThemeColor(key: ColorKey): string {
  return useThemeStore((s) => s.scheme)[key];
}
