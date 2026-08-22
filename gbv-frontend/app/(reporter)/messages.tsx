import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme/ThemeProvider";
import { ChatThread } from "../../src/components/shared";
import { useAuthStore } from "../../src/stores/authStore";

export default function ReporterMessagesScreen() {
  const router = useRouter();
  const { caseId } = useLocalSearchParams<{ caseId?: string }>();
  const { scheme, spacing, borderRadius, typography } = useTheme();
  const user = useAuthStore((s) => s.user);

  if (caseId) {
    return (
      <View style={{ flex: 1, backgroundColor: scheme.background }}>
        <SafeAreaView edges={["top"]} style={{ backgroundColor: scheme.surface }}>
          <View style={[styles.chatHeader, { backgroundColor: scheme.surface, borderBottomColor: scheme.outlineVariant }]}>
            <Pressable onPress={() => router.back()} style={styles.headerBtn} accessibilityLabel="Go back">
              <Ionicons name="arrow-back" size={24} color={scheme.onBackground} />
            </Pressable>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={[typography.title.small, { color: scheme.onSurface }]}>Case Messages</Text>
              <Text style={[typography.body.small, { color: scheme.onSurfaceVariant }]}>Secure conversation</Text>
            </View>
          </View>
        </SafeAreaView>
        <ChatThread caseId={caseId} currentUserRole="REPORTER" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: scheme.background }]} edges={["top"]}>
      <View style={styles.noChat}>
        <View style={[styles.emptyIcon, { backgroundColor: scheme.primaryContainer }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={48} color={scheme.primary} />
        </View>
        <Text style={[typography.title.medium, { color: scheme.onBackground, marginTop: spacing.md, textAlign: "center" }]}>
          No conversation selected
        </Text>
        <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant, marginTop: spacing.xs, textAlign: "center", paddingHorizontal: 32 }]}>
          Open a case report and tap "Case Messages" to start a secure conversation with your assigned officer.
        </Text>
        <Pressable
          onPress={() => router.push("/(reporter)/reports")}
          style={[styles.goToReports, { backgroundColor: scheme.primary, borderRadius: borderRadius.lg }]}
        >
          <Text style={[typography.label.large, { color: scheme.onPrimary }]}>View My Reports</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chatHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1 },
  headerBtn: { padding: 4 },
  noChat: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyIcon: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
  goToReports: { paddingHorizontal: 24, paddingVertical: 12, marginTop: 24 },
});
