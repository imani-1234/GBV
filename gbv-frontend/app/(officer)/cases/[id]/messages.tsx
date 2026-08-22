import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../../src/theme/ThemeProvider";
import { ChatThread } from "../../../../src/components/shared";
import { useAuthStore } from "../../../../src/stores/authStore";
import { casesApi } from "../../../../src/api/cases";

export default function OfficerCaseMessagesScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { scheme, spacing, borderRadius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const markAwaitingMutation = useMutation({
    mutationFn: () => casesApi.transition(id!, "AWAITING_REPORTER_RESPONSE"),
    onSuccess: () => Alert.alert("Updated", "Case marked as awaiting reporter response."),
    onError: () => Alert.alert("Error", "Failed to update case status."),
  });

  return (
    <View style={{ flex: 1, backgroundColor: scheme.background }}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: scheme.surface }}>
        <View style={[styles.chatHeader, { backgroundColor: scheme.surface, borderBottomColor: scheme.outlineVariant, paddingTop: insets.top > 0 ? 0 : spacing.sm }]}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color={scheme.onBackground} />
          </Pressable>
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={[typography.title.small, { color: scheme.onSurface }]}>Case #{id?.slice(0, 8)}</Text>
            <Text style={[typography.body.small, { color: scheme.onSurfaceVariant }]}>Secure conversation</Text>
          </View>
          <Pressable
            onPress={() => markAwaitingMutation.mutate()}
            style={[styles.headerAction, { borderColor: scheme.secondary, borderRadius: borderRadius.md }]}
            accessibilityLabel="Mark case as awaiting response"
          >
            <Ionicons name="time-outline" size={16} color={scheme.secondary} />
            <Text style={[typography.label.small, { color: scheme.secondary, marginLeft: 4 }]}>Awaiting</Text>
          </Pressable>
        </View>
      </SafeAreaView>
      {id ? <ChatThread caseId={id} currentUserRole="OFFICER" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chatHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1 },
  headerBtn: { padding: 4 },
  headerAction: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1.5 },
});
