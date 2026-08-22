import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../src/theme/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";

export default function NotificationsScreen() {
  const { scheme, spacing, typography } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: scheme.background }]}>
      <Ionicons name="notifications-outline" size={48} color={scheme.onSurfaceVariant} />
      <Text style={[typography.title.medium, { color: scheme.onSurface, marginTop: spacing.md }]}>Notifications</Text>
      <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant, marginTop: spacing.xs }]}>No notifications yet.</Text>
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 } });
