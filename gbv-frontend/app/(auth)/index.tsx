import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp, FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme/ThemeProvider";
import { Button } from "../../src/components/ui";

export default function LandingScreen() {
  const router = useRouter();
  const { scheme, spacing, borderRadius, typography } = useTheme();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: scheme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroContainer}>
          {/* Decorative top shape */}
          <View style={[styles.heroBg, { backgroundColor: scheme.primaryContainer, opacity: 0.3 }]} />

          {showContent && (
            <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.heroContent}>
              {/* Icon circle */}
              <View style={[styles.iconCircle, { backgroundColor: scheme.primaryContainer }]}>
                <Ionicons name="shield-checkmark" size={40} color={scheme.primary} />
              </View>

              <Text style={[typography.display.small, styles.heroTitle, { color: scheme.onBackground }]}>
                Your voice{'\n'}matters.
              </Text>
              <Text style={[typography.body.large, styles.heroSubtitle, { color: scheme.onSurfaceVariant }]}>
                A safe, confidential space to share your experience and get the support you deserve. 
                However you choose to report — we believe you, and we are here for you.
              </Text>
            </Animated.View>
          )}
        </View>

        {/* CTA Buttons */}
        {showContent && (
          <Animated.View entering={FadeInUp.duration(600).delay(200).springify()} style={styles.ctas}>
            <Button
              title="Report an Incident"
              variant="filled"
              size="lg"
              onPress={() => router.push("/(auth)/reporting-mode")}
              style={{ width: "100%" }}
            />

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: scheme.outlineVariant }]} />
              <Text style={[typography.label.medium, { color: scheme.onSurfaceVariant }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: scheme.outlineVariant }]} />
            </View>

            <View style={styles.secondaryRow}>
              <Pressable
                onPress={() => router.push("/(auth)/login")}
                style={[styles.secondaryCta, { borderColor: scheme.outline, borderRadius: borderRadius.lg }]}
              >
                <Ionicons name="log-in-outline" size={18} color={scheme.primary} style={{ marginRight: spacing.xs }} />
                <Text style={[typography.label.large, { color: scheme.primary }]}>Sign In</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/(auth)/register")}
                style={[styles.secondaryCta, { backgroundColor: scheme.primaryContainer, borderRadius: borderRadius.lg }]}
              >
                <Ionicons name="person-add-outline" size={19} color={scheme.onPrimaryContainer} style={{ marginRight: spacing.xs }} />
                <Text style={[typography.label.large, { color: scheme.onPrimaryContainer }]}>Create Account</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Immediate Help Link */}
        {showContent && (
          <Animated.View entering={FadeInUp.duration(600).delay(500)} style={styles.helpSection}>
            <Pressable
              onPress={() => router.push("/(auth)/resources")}
              style={[styles.helpLink, { borderColor: scheme.errorContainer, borderRadius: borderRadius.lg, backgroundColor: scheme.errorContainer + "30" }]}
            >
              <Ionicons name="heart" size={20} color={scheme.error} />
              <Text style={[typography.body.medium, { color: scheme.error, fontWeight: "700", marginLeft: spacing.sm, flex: 1 }]}>
                I need immediate help
              </Text>
              <Ionicons name="chevron-forward" size={18} color={scheme.error} />
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 24 },
  heroContainer: {
    flex: 1,
    minHeight: 420,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    position: "relative",
    overflow: "hidden",
  },
  heroBg: {
    position: "absolute",
    top: -120,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  heroContent: { alignItems: "center" },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  heroTitle: {
    textAlign: "center",
    marginBottom: 16,
  },
  heroSubtitle: {
    textAlign: "center",
    lineHeight: 26,
    paddingHorizontal: 8,
  },
  ctas: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 16,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  secondaryRow: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryCta: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderWidth: 1.5,
  },
  helpSection: {
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 16,
  },
  helpLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
});
