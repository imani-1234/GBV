import { Pressable, View, Text, ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  color?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
  color: customColor,
}: CheckboxProps) {
  const { scheme, spacing, borderRadius, typography } = useTheme();

  const boxColor = customColor || scheme.primary;
  const checkSize = 20;

  return (
    <Pressable
      onPress={() => onChange(!checked)}
      disabled={disabled}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        paddingVertical: spacing.xs,
      })}
    >
      <View
        style={{
          width: checkSize,
          height: checkSize,
          borderRadius: borderRadius.sm,
          borderWidth: checked ? 0 : 2,
          borderColor: scheme.onSurfaceVariant,
          backgroundColor: checked ? boxColor : "transparent",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {checked && (
          <Text
            style={{
              color: scheme.onPrimary,
              fontSize: 14,
              fontWeight: "700",
              lineHeight: 18,
            }}
          >
            ✓
          </Text>
        )}
      </View>
      {label && (
        <Text
          style={{
            color: scheme.onSurface,
            marginLeft: spacing.sm,
            ...typography.body.large,
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
