import { Pressable, Text, View, ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import type { ReactNode } from "react";

interface ChipProps {
  label: string;
  onPress?: () => void;
  variant?: "assist" | "filter" | "input" | "suggestion";
  selected?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  disabled?: boolean;
}

export function Chip({
  label,
  onPress,
  variant = "assist",
  selected = false,
  leadingIcon,
  trailingIcon,
  disabled = false,
}: ChipProps) {
  const { scheme, spacing, borderRadius, typography } = useTheme();

  const isFilter = variant === "filter";
  const isInput = variant === "input";
  const isSuggestion = variant === "suggestion";
  const isAssist = variant === "assist";

  const bgColor = isFilter && selected
    ? scheme.primaryContainer
    : isInput
    ? scheme.secondaryContainer
    : isSuggestion
    ? scheme.primaryContainer
    : "transparent";

  const textColor = isFilter && selected
    ? scheme.onPrimaryContainer
    : isInput
    ? scheme.onSecondaryContainer
    : isSuggestion
    ? scheme.onPrimaryContainer
    : scheme.primary;

  const borderStyle = isAssist || (isFilter && !selected)
    ? { borderWidth: 1, borderColor: scheme.outline }
    : {};

  const chipStyle: ViewStyle = {
    backgroundColor: bgColor,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    opacity: disabled ? 0.5 : 1,
    ...borderStyle,
  };

  const content = (
    <View style={chipStyle}>
      {leadingIcon && <View style={{ marginRight: spacing.xs }}>{leadingIcon}</View>}
      <Text style={{ color: textColor, ...typography.label.large }}>{label}</Text>
      {trailingIcon && <View style={{ marginLeft: spacing.xs }}>{trailingIcon}</View>}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          { opacity: pressed ? 0.8 : disabled ? 0.5 : 1 },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}
