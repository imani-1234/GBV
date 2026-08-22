import { View, ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

interface DividerProps {
  color?: string;
  thickness?: number;
  inset?: boolean;
  style?: ViewStyle;
}

export function Divider({
  color: customColor,
  thickness = 1,
  inset = false,
  style,
}: DividerProps) {
  const { scheme } = useTheme();

  return (
    <View
      style={[
        {
          height: thickness,
          backgroundColor: customColor || scheme.outlineVariant,
          marginLeft: inset ? 16 : 0,
        },
        style,
      ]}
    />
  );
}
