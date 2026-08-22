import { useRef, useCallback } from "react";
import { Pressable, Text, ActivityIndicator, ViewStyle, View, Animated } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import type { ReactNode } from "react";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "filled" | "tonal" | "outlined" | "text" | "elevated";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = "filled",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  style,
}: ButtonProps) {
  const { scheme, spacing, borderRadius, typography, getElevation } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const bgColor = variant === "filled"
    ? scheme.primary
    : variant === "tonal"
    ? scheme.primaryContainer
    : variant === "elevated"
    ? scheme.surface
    : "transparent";

  const textColor = variant === "filled"
    ? scheme.onPrimary
    : variant === "tonal"
    ? scheme.onPrimaryContainer
    : variant === "elevated"
    ? scheme.primary
    : scheme.primary;

  const borderStyle = variant === "outlined"
    ? { borderWidth: 1.5, borderColor: scheme.outline }
    : {};

  const sizeStyle = {
    sm: { paddingVertical: spacing.sm + 1, paddingHorizontal: spacing.lg },
    md: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
    lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl + spacing.sm },
  }[size];

  const elevationStyle = variant === "elevated" ? getElevation(2) : {};

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          {
            backgroundColor: bgColor,
            borderRadius: borderRadius.xl,
            minHeight: size === "lg" ? 54 : size === "md" ? 48 : 42,
            opacity: disabled ? 0.5 : 1,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
          },
          borderStyle,
          sizeStyle,
          elevationStyle,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={textColor} size="small" />
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {icon && <View style={{ marginRight: spacing.sm }}>{icon}</View>}
            <Text style={{ color: textColor, ...typography.label.large, fontWeight: "700", letterSpacing: 0.15 }}>{title}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}
