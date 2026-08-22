import { Image, StyleSheet, type ImageSourcePropType, type ImageStyle, type StyleProp } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

type BrandVariant = "vertical" | "horizontal" | "minimal" | "icon" | "oneColor";

type BrandLockupProps = {
  variant?: BrandVariant;
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
};

const ASSETS: Record<BrandVariant, { light: ImageSourcePropType; dark: ImageSourcePropType }> = {
  vertical: {
    light: require("../../../assets/branding/sauti_yako_vertical_light.png"),
    dark: require("../../../assets/branding/sauti_yako_vertical_dark.png"),
  },
  horizontal: {
    light: require("../../../assets/branding/sauti_yako_horizontal_light.png"),
    dark: require("../../../assets/branding/sauti_yako_horizontal_dark.png"),
  },
  minimal: {
    light: require("../../../assets/branding/sauti_yako_minimal_light.png"),
    dark: require("../../../assets/branding/sauti_yako_minimal_dark.png"),
  },
  icon: {
    light: require("../../../assets/branding/sauti_yako_app_icon_light.png"),
    dark: require("../../../assets/branding/sauti_yako_app_icon_dark.png"),
  },
  oneColor: {
    light: require("../../../assets/branding/sauti_yako_symbol_one_color_light.png"),
    dark: require("../../../assets/branding/sauti_yako_symbol_one_color_dark.png"),
  },
};

const DEFAULT_SIZES: Record<BrandVariant, { width: number; height: number }> = {
  vertical: { width: 180, height: 270 },
  horizontal: { width: 220, height: 150 },
  minimal: { width: 72, height: 72 },
  icon: { width: 72, height: 72 },
  oneColor: { width: 72, height: 72 },
};

export function BrandLockup({
  variant = "vertical",
  width,
  height,
  style,
  accessibilityLabel = "Sauti Yako",
}: BrandLockupProps) {
  const { isDark } = useTheme();
  const size = DEFAULT_SIZES[variant];
  const source = isDark ? ASSETS[variant].dark : ASSETS[variant].light;

  return (
    <Image
      source={source}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[styles.image, { width: width ?? size.width, height: height ?? size.height }, style]}
    />
  );
}

const styles = StyleSheet.create({
  image: { alignSelf: "center" },
});
