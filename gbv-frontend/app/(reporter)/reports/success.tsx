import { View, Text, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp, BounceIn } from "react-native-reanimated";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { Button } from "../../../src/components/ui";

export default function SubmissionSuccessScreen() {
  const router = useRouter();
  const { caseNumber, reportId } = useLocalSearchParams<{ caseNumber: string; reportId: string }>();
  const { scheme, spacing, borderRadius, typography } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: scheme.background }]}>
      <View style={styles.content}>
        <Animated.View entering={BounceIn.duration(600).springify()} style={[styles.iconCircle, { backgroundColor: scheme.primaryContainer }]}>
          <Ionicons name="checkmark-circle" size={64} color={scheme.primary} />
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(200)} style={{ alignItems: "center" }}>
          <Text style={[typography.headline.small, { color: scheme.onBackground, textAlign: "center", marginTop: spacing.lg }]}>
            Report Submitted
          </Text>
          {caseNumber && (
            <View style={[styles.caseNumberBadge, { backgroundColor: scheme.surfaceVariant, borderRadius: borderRadius.md, marginTop: spacing.md }]}>
              <Text style={[typography.title.medium, { color: scheme.primary }]}>#{caseNumber}</Text>
            </View>
          )}
          <Text style={[typography.body.large, { color: scheme.onSurfaceVariant, textAlign: "center", marginTop: spacing.md, lineHeight: 24 }]}>
            Your report has been received. Our team will review it and reach out to you through this platform.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(400)} style={[styles.actions, { marginTop: spacing.xl }]}>
          <Button
            title="View Case Details"
            variant="filled"
            size="lg"
            onPress={() => router.replace(`/reports/${reportId}`)}
            style={{ width: "100%" }}
          />
          <Button
            title="Back to Home"
            variant="tonal"
            size="lg"
            onPress={() => router.replace("/(reporter)")}
            style={{ width: "100%", marginTop: spacing.sm }}
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  iconCircle: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  caseNumberBadge: { paddingHorizontal: 20, paddingVertical: 8 },
  actions: { width: "100%" },
});
