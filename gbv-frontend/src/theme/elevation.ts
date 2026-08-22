export interface ElevationLevel {
  boxShadow: string;
  elevation: number;
}

export function getElevation(level: 0 | 1 | 2 | 3 | 4 | 5, isDark: boolean): ElevationLevel {
  const opacity = isDark ? level * 0.07 + 0.1 : level * 0.05 + 0.05;
  const offsetX = 0;
  const offsetY = level;
  const blur = level * 2;
  const alpha = opacity.toFixed(2);
  return {
    boxShadow: `${offsetX}px ${offsetY}px ${blur}px rgba(0,0,0,${alpha})`,
    elevation: level,
  };
}

export const elevationLevels = [0, 1, 2, 3, 4, 5] as const;
export type Elevation = (typeof elevationLevels)[number];
