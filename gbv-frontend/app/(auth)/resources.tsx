import { View, Text, Pressable, ScrollView, StyleSheet, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme/ThemeProvider";
import { Divider } from "../../src/components/ui";

const resources = [
  {
    name: "National GBV Helpline",
    phone: "0800-GBV-HELP",
    description: "24/7 confidential support for survivors of gender-based violence.",
    icon: "call",
  },
  {
    name: "Emergency Services",
    phone: "911",
    description: "If you are in immediate danger, call emergency services right away.",
    icon: "warning",
  },
  {
    name: "Counselling & Support",
    phone: "0800-SAFE-TALK",
    description: "Free, confidential counselling available 24/7.",
    icon: "heart",
  },
  {
    name: "Legal Aid Hotline",
    phone: "0800-LEGAL-AID",
    description: "Free legal advice and representation for survivors.",
    icon: "shield-checkmark",
  },
  {
    name: "Campus Support Office",
    phone: "CAMPUS-EXT-101",
    description: "On-campus support services during office hours.",
    icon: "school",
  },
];

export default function ResourcesScreen() {
  const { scheme, spacing, borderRadius, typography } = useTheme();

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, "")}`);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: scheme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: scheme.errorContainer }]}>
            <Ionicons name="heart" size={32} color={scheme.error} />
          </View>
          <Text style={[typography.headline.small, { color: scheme.onBackground, textAlign: "center", marginTop: spacing.md, marginBottom: spacing.xs }]}>
            You are not alone
          </Text>
          <Text style={[typography.body.large, { color: scheme.onSurfaceVariant, textAlign: "center", lineHeight: 24 }]}>
            Help is available. These resources are here to support you — 
            whenever you need them.
          </Text>
        </View>

        <Divider />

        {resources.map((resource, index) => (
          <Pressable
            key={index}
            style={[styles.resourceCard, { backgroundColor: scheme.surface, borderRadius: borderRadius.lg, borderColor: scheme.outlineVariant }]}
            onPress={() => handleCall(resource.phone)}
          >
            <View style={[styles.resourceIcon, { backgroundColor: scheme.primaryContainer }]}>
              <Ionicons name={resource.icon as any} size={24} color={scheme.primary} />
            </View>
            <View style={styles.resourceBody}>
              <Text style={[typography.title.small, { color: scheme.onSurface }]}>{resource.name}</Text>
              <Text style={[typography.body.small, { color: scheme.onSurfaceVariant, marginTop: 2 }]}>{resource.description}</Text>
              <Text style={[typography.label.large, { color: scheme.primary, marginTop: 6 }]}>{resource.phone}</Text>
            </View>
            <Ionicons name="call-outline" size={22} color={scheme.primary} />
          </Pressable>
        ))}

        <View style={[styles.disclaimer, { backgroundColor: scheme.surfaceVariant, borderRadius: borderRadius.md }]}>
          <Ionicons name="information-circle" size={18} color={scheme.onSurfaceVariant} />
          <Text style={[typography.body.small, { color: scheme.onSurfaceVariant, marginLeft: 8, flex: 1 }]}>
            All helplines are confidential. Your call is private and secure.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 40 },
  header: { alignItems: "center", marginBottom: 16 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  resourceCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  resourceIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", marginRight: 14 },
  resourceBody: { flex: 1 },
  disclaimer: { flexDirection: "row", alignItems: "center", padding: 14, marginTop: 8 },
});
