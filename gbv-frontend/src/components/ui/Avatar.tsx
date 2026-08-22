import { View, Text, Image, ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

interface AvatarProps {
  name: string;
  imageUrl?: string;
  size?: "sm" | "md" | "lg" | "xl";
  color?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function Avatar({
  name,
  imageUrl,
  size = "md",
  color: customColor,
}: AvatarProps) {
  const { scheme, borderRadius, typography } = useTheme();

  const avatarSize = {
    sm: 32,
    md: 40,
    lg: 56,
    xl: 72,
  }[size];

  const fontSize = {
    sm: typography.title.small.fontSize,
    md: typography.title.medium.fontSize,
    lg: typography.title.large.fontSize,
    xl: 28,
  }[size];

  const bgColor = customColor || scheme.primary;

  const containerStyle: ViewStyle = {
    width: avatarSize,
    height: avatarSize,
    borderRadius: avatarSize / 2,
    backgroundColor: bgColor,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  };

  if (imageUrl) {
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: imageUrl }}
          style={{ width: avatarSize, height: avatarSize }}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <Text
        style={{
          color: scheme.onPrimary,
          fontSize,
          fontWeight: "500",
          textAlign: "center",
        }}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}
