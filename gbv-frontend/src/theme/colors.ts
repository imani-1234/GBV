// ── Tonal Palettes (generated from source color) ─────────────────────
// These are 13-step tonal palettes (0–100) used by M3 token generation.

export interface TonalPalette {
  0: string;    // Near-black tint
  10: string;   // Darkest (roles: on-primary-container text in dark)
  20: string;   // Very dark
  30: string;   // Dark (roles: surface tint, on-primary text)
  40: string;   // Medium-dark (roles: primary in light, on-primary in dark)
  50: string;   // Medium
  60: string;   // Medium-light
  70: string;   // Light
  80: string;   // Very light (roles: primary-container in light)
  90: string;   // Near-white (roles: primary-container in dark, surface-variant)
  95: string;   // Very near white (roles: surface-variant in dark, outline)
  99: string;   // Near-pure white
  100: string;  // Pure white
}

export interface TonalPalettes {
  primary: TonalPalette;
  secondary: TonalPalette;
  tertiary: TonalPalette;
  error: TonalPalette;
  neutral: TonalPalette;
  neutralVariant: TonalPalette;
}

// Violet/Indigo — Primary brand
const primaryPalette: TonalPalette = {
  0: "#000000", 10: "#1A0066", 20: "#2D0099", 30: "#4300CC",
  40: "#6C63FF", 50: "#8B85FF", 60: "#A5A0FF", 70: "#C0BCFF",
  80: "#DCDAFF", 90: "#EDECFF", 95: "#F5F4FF", 99: "#FCFBFF", 100: "#FFFFFF",
};

// Teal — Secondary for less prominent accents
const secondaryPalette: TonalPalette = {
  0: "#000000", 10: "#00201B", 20: "#003830", 30: "#005046",
  40: "#006B5E", 50: "#008576", 60: "#00A08E", 70: "#00BFA6",
  80: "#5CD4C0", 90: "#A0F0E0", 95: "#C5F8EC", 99: "#E6FFF5", 100: "#FFFFFF",
};

// Amber/Coral — Tertiary for CTAs and highlight
const tertiaryPalette: TonalPalette = {
  0: "#000000", 10: "#2E1500", 20: "#4A2500", 30: "#683500",
  40: "#894600", 50: "#A85900", 60: "#C96D00", 70: "#E88200",
  80: "#FFB443", 90: "#FFDDB3", 95: "#FFEED5", 99: "#FFF8F0", 100: "#FFFFFF",
};

// Red — Error
const errorPalette: TonalPalette = {
  0: "#000000", 10: "#410002", 20: "#690005", 30: "#93000A",
  40: "#BA1A1A", 50: "#DE3730", 60: "#FF5449", 70: "#FF897D",
  80: "#FFB4AB", 90: "#FFDAD6", 95: "#FFEDEA", 99: "#FFFCF9", 100: "#FFFFFF",
};

// Neutral — Backgrounds, surfaces
const neutralPalette: TonalPalette = {
  0: "#000000", 10: "#1C1B1F", 20: "#313034", 30: "#484649",
  40: "#605D62", 50: "#79767A", 60: "#938F94", 70: "#AEAAAE",
  80: "#C9C5CA", 90: "#E6E1E5", 95: "#F4EFF4", 99: "#FFFBFE", 100: "#FFFFFF",
};

const neutralVariantPalette: TonalPalette = {
  0: "#000000", 10: "#1D1A22", 20: "#322F37", 30: "#49454F",
  40: "#615D67", 50: "#7A7580", 60: "#948F9A", 70: "#AFA9B4",
  80: "#CAC4D0", 90: "#E7E0EC", 95: "#F5EEFA", 99: "#FFFBFE", 100: "#FFFFFF",
};

export const tonalPalettes: TonalPalettes = {
  primary: primaryPalette,
  secondary: secondaryPalette,
  tertiary: tertiaryPalette,
  error: errorPalette,
  neutral: neutralPalette,
  neutralVariant: neutralVariantPalette,
};

// ── M3 Semantic Color Tokens ─────────────────────────────────────────

export interface M3Scheme {
  // Primary
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  // Secondary
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  // Tertiary
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  // Error
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  // Surface
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  surfaceTint: string;
  // Outline
  outline: string;
  outlineVariant: string;
  // Inverse
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;
  // Fixed (for containers that should stay in their scheme)
  primaryFixed: string;
  onPrimaryFixed: string;
  secondaryFixed: string;
  onSecondaryFixed: string;
  // Custom app tokens (for branding)
  success: string;
  onSuccess: string;
  successContainer: string;
  warning: string;
  onWarning: string;
  warningContainer: string;
  info: string;
  onInfo: string;
  background: string;
  onBackground: string;
  backdrop: string;
  shimmer: string;
  shimmerHighlight: string;
  // Nav chrome — derived per-role in themeStore
  navActiveTint: string;
  navInactiveTint: string;
}

export function generateLightScheme(palettes: TonalPalettes = tonalPalettes): M3Scheme {
  const p = palettes.primary;
  const s = palettes.secondary;
  const t = palettes.tertiary;
  const e = palettes.error;
  const n = palettes.neutral;
  const nv = palettes.neutralVariant;

  return {
    primary: p[20], onPrimary: p[100], primaryContainer: p[90], onPrimaryContainer: p[10],
    secondary: s[40], onSecondary: s[100], secondaryContainer: s[90], onSecondaryContainer: s[10],
    tertiary: t[40], onTertiary: t[100], tertiaryContainer: t[90], onTertiaryContainer: t[10],
    error: e[40], onError: e[100], errorContainer: e[90], onErrorContainer: e[10],
    surface: n[99], onSurface: n[10], surfaceVariant: nv[90], onSurfaceVariant: nv[30],
    surfaceTint: p[40],
    outline: nv[50], outlineVariant: nv[80],
    inverseSurface: n[20], inverseOnSurface: n[95], inversePrimary: p[80],
    primaryFixed: p[90], onPrimaryFixed: p[10],
    secondaryFixed: s[90], onSecondaryFixed: s[10],
    success: "#10B981", onSuccess: "#FFFFFF", successContainer: "#D1FAE5",
    warning: "#F59E0B", onWarning: "#FFFFFF", warningContainer: "#FEF3C7",
    info: "#3B82F6", onInfo: "#FFFFFF", background: n[99], onBackground: n[10],
    backdrop: "rgba(0,0,0,0.4)",
    shimmer: n[90], shimmerHighlight: n[99],
    navActiveTint: p[40], navInactiveTint: nv[50],
  };
}

export function generateDarkScheme(palettes: TonalPalettes = tonalPalettes): M3Scheme {
  const p = palettes.primary;
  const s = palettes.secondary;
  const t = palettes.tertiary;
  const e = palettes.error;
  const n = palettes.neutral;
  const nv = palettes.neutralVariant;

  return {
    primary: p[80], onPrimary: p[20], primaryContainer: p[30], onPrimaryContainer: p[90],
    secondary: s[80], onSecondary: s[20], secondaryContainer: s[30], onSecondaryContainer: s[90],
    tertiary: t[80], onTertiary: t[20], tertiaryContainer: t[30], onTertiaryContainer: t[90],
    error: e[80], onError: e[20], errorContainer: e[30], onErrorContainer: e[90],
    surface: n[10], onSurface: n[90], surfaceVariant: nv[30], onSurfaceVariant: nv[80],
    surfaceTint: p[80],
    outline: nv[60], outlineVariant: nv[30],
    inverseSurface: n[90], inverseOnSurface: n[20], inversePrimary: p[40],
    primaryFixed: p[90], onPrimaryFixed: p[10],
    secondaryFixed: s[90], onSecondaryFixed: s[10],
    success: "#34D399", onSuccess: "#064E3B", successContainer: "#064E3B",
    warning: "#FBBF24", onWarning: "#78350F", warningContainer: "#78350F",
    info: "#60A5FA", onInfo: "#1E3A5F", background: n[10], onBackground: n[90],
    backdrop: "rgba(0,0,0,0.6)",
    shimmer: n[30], shimmerHighlight: n[40],
    navActiveTint: p[80], navInactiveTint: nv[60],
  };
}
