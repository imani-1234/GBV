import { Pressable, ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import type { ReactNode } from "react";

interface IconButtonProps {
  icon: ReactNode;
  onPress?: () => void;
  size?: "sm" | "md" | "lg";
  color?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

export function IconButton({
  icon,
  onPress,
  size = "md",
  color: customColor,
  disabled = false,
  style,
}: IconButtonProps) {
  const { scheme } = useTheme();

  const btnSize = { sm: 32, md: 40, lg: 48 }[size];
  const iconScale = { sm: 18, md: 24, lg: 32 }[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          width: btnSize,
          height: btnSize,
          borderRadius: btnSize / 2,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: pressed ? scheme.surfaceVariant : "transparent",
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {icon}
    </Pressable>
  );
}
