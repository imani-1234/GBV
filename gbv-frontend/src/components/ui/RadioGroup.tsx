import { Pressable, View, Text } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

interface RadioOption {
  label: string;
  value: string;
}

interface RadioGroupProps {
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  color?: string;
}

export function RadioGroup({
  options,
  value,
  onChange,
  disabled = false,
  color: customColor,
}: RadioGroupProps) {
  const { scheme, spacing, typography } = useTheme();

  const radioColor = customColor || scheme.primary;
  const outerSize = 20;
  const innerSize = 10;

  return (
    <View>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            disabled={disabled}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: spacing.sm,
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <View
              style={{
                width: outerSize,
                height: outerSize,
                borderRadius: outerSize / 2,
                borderWidth: 2,
                borderColor: selected ? radioColor : scheme.onSurfaceVariant,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {selected && (
                <View
                  style={{
                    width: innerSize,
                    height: innerSize,
                    borderRadius: innerSize / 2,
                    backgroundColor: radioColor,
                  }}
                />
              )}
            </View>
            <Text
              style={{
                color: scheme.onSurface,
                marginLeft: spacing.sm,
                ...typography.body.large,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
