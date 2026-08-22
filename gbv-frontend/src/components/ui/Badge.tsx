import { View, Text, ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  count?: number;
  color?: string;
  size?: "sm" | "md";
  style?: ViewStyle;
}

export function Badge({
  children,
  count,
  color: customColor,
  size = "sm",
  style,
}: BadgeProps) {
  const { scheme, spacing, typography } = useTheme();

  const bgColor = customColor || scheme.error;
  const dotSize = size === "sm" ? 8 : 10;
  const capsuleHeight = size === "sm" ? 16 : 20;
  const minWidth = size === "sm" ? 16 : 20;

  const showCount = count != null;

  const badge = (
    <View
      style={[
        {
          position: "absolute",
          top: -spacing.xs,
          right: -spacing.xs,
          zIndex: 10,
          backgroundColor: bgColor,
          justifyContent: "center",
          alignItems: "center",
        },
        showCount
          ? {
              minWidth,
              height: capsuleHeight,
              borderRadius: capsuleHeight / 2,
              paddingHorizontal: spacing.xs,
            }
          : {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
            },
        style,
      ]}
    >
      {showCount && (
        <Text
          style={{
            color: scheme.onError,
            fontSize: typography.label.small.fontSize,
            fontWeight: "700",
            lineHeight: capsuleHeight - 2,
            textAlign: "center",
          }}
        >
          {count > 99 ? "99+" : count}
        </Text>
      )}
    </View>
  );

  return (
    <View style={{ position: "relative" }}>
      {children}
      {badge}
    </View>
  );
}
