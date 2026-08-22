import { useEffect, useRef } from "react";
import { Animated, Text, Pressable, StyleSheet, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeProvider";

interface SnackbarAction {
  label: string;
  onPress: () => void;
}

interface SnackbarProps {
  visible: boolean;
  message: string;
  action?: SnackbarAction | null;
  duration?: number;
  onDismiss?: () => void;
  type?: "info" | "success" | "error" | "warning";
}

const TYPE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: (s: Record<string, string>) => string }> = {
  success: { icon: "checkmark-circle", color: (s) => s.success },
  error: { icon: "alert-circle", color: (s) => s.error },
  warning: { icon: "warning", color: (s) => s.warning },
  info: { icon: "information-circle", color: (s) => s.info },
};

export function Snackbar({
  visible,
  message,
  action = null,
  duration = 4000,
  onDismiss,
  type = "info",
}: SnackbarProps) {
  const { scheme, spacing, typography } = useTheme();
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.info;
  const accentColor = config.color(scheme);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.2)),
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 100,
            duration: 250,
            useNativeDriver: true,
            easing: Easing.in(Easing.ease),
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onDismiss?.();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: scheme.inverseSurface,
          borderRadius: 12,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm + 2,
          marginHorizontal: spacing.md,
          marginBottom: spacing.lg,
          transform: [{ translateY }],
          opacity,
          borderLeftWidth: 4,
          borderLeftColor: accentColor,
          elevation: 6,
          boxShadow: "0px 4px 8px rgba(0,0,0,0.15)",
        },
      ]}
    >
      <Ionicons name={config.icon} size={20} color={accentColor} style={{ marginRight: spacing.sm }} />
      <Text
        style={{
          color: scheme.inverseOnSurface,
          ...typography.body.medium,
          flex: 1,
        }}
      >
        {message}
      </Text>
      {action && (
        <Pressable
          onPress={() => {
            action.onPress();
            onDismiss?.();
          }}
          style={{ marginLeft: spacing.md }}
        >
          <Text
            style={{
              color: scheme.inversePrimary,
              ...typography.label.large,
              fontWeight: "700",
            }}
          >
            {action.label}
          </Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
  },
});
