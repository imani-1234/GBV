import { Platform, TextStyle } from "react-native";

export type FontWeight = "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900";

export interface TypeStyle {
  fontFamily: string;
  fontWeight: FontWeight;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
}

// Use Inter via URL on web, system font on native
const fontFamily = Platform.select({
  web: "'Inter', 'SF Pro', system-ui, -apple-system, sans-serif",
  ios: "System",
  android: "Roboto",
  default: "System",
});

const monoFamily = Platform.select({
  web: "'JetBrains Mono', 'SF Mono', monospace",
  ios: "Menlo",
  android: "monospace",
  default: "monospace",
});

export interface Typography {
  display: { large: TypeStyle; medium: TypeStyle; small: TypeStyle };
  headline: { large: TypeStyle; medium: TypeStyle; small: TypeStyle };
  title: { large: TypeStyle; medium: TypeStyle; small: TypeStyle };
  body: { large: TypeStyle; medium: TypeStyle; small: TypeStyle };
  label: { large: TypeStyle; medium: TypeStyle; small: TypeStyle };
  mono: TypeStyle;
}

function ts(
  fontSize: number,
  lineHeight: number,
  fontWeight: FontWeight,
  letterSpacing: number = 0,
): TypeStyle {
  return { fontFamily, fontWeight, fontSize, lineHeight, letterSpacing };
}

export const typography: Typography = {
  display: {
    large: ts(57, 64, "400", -0.25),
    medium: ts(45, 52, "400", 0),
    small: ts(36, 44, "400", 0),
  },
  headline: {
    large: ts(32, 40, "400", 0),
    medium: ts(28, 36, "400", 0),
    small: ts(24, 32, "400", 0),
  },
  title: {
    large: ts(22, 28, "500", 0),
    medium: ts(16, 24, "500", 0.15),
    small: ts(14, 20, "500", 0.1),
  },
  body: {
    large: ts(16, 24, "400", 0.5),
    medium: ts(14, 20, "400", 0.25),
    small: ts(12, 16, "400", 0.4),
  },
  label: {
    large: ts(14, 20, "500", 0.1),
    medium: ts(12, 16, "500", 0.5),
    small: ts(11, 16, "500", 0.5),
  },
  mono: ts(14, 20, "400", 0),
};
