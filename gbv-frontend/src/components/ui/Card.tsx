import { View, Pressable, ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  variant?: "elevated" | "filled" | "outlined";
  padding?: "none" | "sm" | "md" | "lg";
  onPress?: () => void;
  style?: ViewStyle;
}

export function Card({
  children,
  variant = "elevated",
  padding = "md",
  onPress,
  style,
}: CardProps) {
  const { scheme, spacing, borderRadius, getElevation } = useTheme();

  const bgColor = variant === "filled"
    ? scheme.surfaceVariant
    : scheme.surface;

  const borderStyle = variant === "outlined"
    ? { borderWidth: 1, borderColor: scheme.outline }
    : {};

  const elevationStyle = variant === "elevated" ? getElevation(2) : {};

  const paddingStyle = {
    none: { padding: 0 },
    sm: { padding: spacing.sm },
    md: { padding: spacing.md },
    lg: { padding: spacing.lg },
  }[padding];

  const commonStyle: ViewStyle = {
    backgroundColor: bgColor,
    borderRadius: borderRadius.xl,
    ...borderStyle,
    ...elevationStyle,
    ...paddingStyle,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          commonStyle,
          { opacity: pressed ? 0.85 : 1 },
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[commonStyle, style]}>{children}</View>;
}
