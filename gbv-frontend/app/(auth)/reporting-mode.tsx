import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme/ThemeProvider";

export default function ReportingModeScreen() {
  const router = useRouter();
  const { scheme, spacing, borderRadius, typography } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: scheme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={scheme.onBackground} />
        </Pressable>

        <Text style={[typography.headline.small, { color: scheme.onBackground, marginBottom: spacing.xs }]}>
          How would you like to report?
        </Text>
        <Text style={[typography.body.large, { color: scheme.onSurfaceVariant, marginBottom: spacing.xl }]}>
          Choose the option that feels safest for you. You can always change your mind later.
        </Text>

        {/* Identified Card */}
        <Pressable
          onPress={() => router.push("/(auth)/register")}
          style={[styles.card, { backgroundColor: scheme.surface, borderRadius: borderRadius.xl, borderColor: scheme.outlineVariant }]}
        >
          <View style={[styles.cardIcon, { backgroundColor: scheme.primaryContainer }]}>
            <Ionicons name="person" size={28} color={scheme.primary} />
          </View>
          <View style={styles.cardBody}>
            <Text style={[typography.title.medium, { color: scheme.onSurface }]}>
              Report with my identity
            </Text>
            <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant, marginTop: spacing.xs }]}>
              Share your name and contact information. This makes it easier for our support team to follow up with you, 
              provide updates, and offer personalised assistance throughout the process.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={scheme.onSurfaceVariant} />
        </Pressable>

        {/* Anonymous Card */}
        <Pressable
          onPress={() => router.push("/(auth)/anonymous-access")}
          style={[styles.card, { backgroundColor: scheme.surface, borderRadius: borderRadius.xl, borderColor: scheme.secondary, borderWidth: 1 }]}
        >
          <View style={[styles.cardIcon, { backgroundColor: scheme.secondaryContainer }]}>
            <Ionicons name="eye-off" size={28} color={scheme.secondary} />
          </View>
          <View style={styles.cardBody}>
            <Text style={[typography.title.medium, { color: scheme.onSurface }]}>
              Report anonymously
            </Text>
            <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant, marginTop: spacing.xs }]}>
              No name, no email, no personal details ever stored. You will receive a unique Reporter Code 
              to track your report. Once lost, it cannot be recovered — so keep it safe.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={scheme.onSurfaceVariant} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 40 },
  back: { marginBottom: 24, alignSelf: "flex-start" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    boxShadow: "0px 2px 8px rgba(0,0,0,0.06)",
    elevation: 2,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  cardBody: { flex: 1 },
});
