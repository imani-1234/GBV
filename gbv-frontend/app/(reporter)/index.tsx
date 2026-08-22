import { useCallback } from "react";
import { View, Text, ScrollView, RefreshControl, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme/ThemeProvider";
import { Button, Card, Chip, Divider, Skeleton } from "../../src/components/ui";
import { reportsApi } from "../../src/api/reports";
import { casesApi } from "../../src/api/cases";
import { useAuthStore } from "../../src/stores/authStore";
import type { Case, CaseStatus } from "../../src/types";

const STATUS_CHIP_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING_REVIEW: { bg: "#FFF3CD", text: "#856404" },
  ASSIGNED: { bg: "#CCE5FF", text: "#004085" },
  UNDER_REVIEW: { bg: "#D4EDDA", text: "#155724" },
  AWAITING_REPORTER_RESPONSE: { bg: "#F8D7DA", text: "#721C24" },
  UNDER_INVESTIGATION: { bg: "#E2D5F1", text: "#4A1B7A" },
  REFERRED: { bg: "#FFF3CD", text: "#856404" },
  RESOLVED: { bg: "#D4EDDA", text: "#155724" },
  CLOSED: { bg: "#E2E3E5", text: "#383D41" },
  REOPENED: { bg: "#F8D7DA", text: "#721C24" },
};

function getStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon4";
  return "Good evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function LoadingSkeleton() {
  const { scheme, spacing, borderRadius } = useTheme();
  return (
    <View style={{ padding: 24 }}>
      <Skeleton width="60%" height={28} borderRadius={borderRadius.sm} />
      <Skeleton width="40%" height={16} borderRadius={borderRadius.sm} style={{ marginTop: 8 }} />
      <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: scheme.surfaceVariant, borderRadius: borderRadius.xl, padding: 20, marginTop: 24 }}>
        <View style={{ flex: 1 }}>
          <Skeleton width="60%" height={18} borderRadius={4} />
          <Skeleton width="90%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
          <Skeleton width="70%" height={12} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
        <Skeleton width={56} height={56} borderRadius={28} />
      </View>
      <Skeleton width="30%" height={16} borderRadius={4} style={{ marginTop: 24 }} />
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ flex: 1, padding: 14, alignItems: "center", borderWidth: 1, borderColor: scheme.outlineVariant, borderRadius: borderRadius.lg }}>
            <Skeleton width="40%" height={24} borderRadius={4} />
            <Skeleton width="60%" height={12} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
        ))}
      </View>
      <Skeleton width="30%" height={16} borderRadius={4} style={{ marginTop: 24 }} />
      {[1, 2].map((i) => (
        <View key={i} style={{ padding: 16, borderWidth: 1, borderColor: scheme.outlineVariant, borderRadius: borderRadius.lg, marginTop: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Skeleton width={70} height={22} borderRadius={11} />
            <Skeleton width={50} height={12} borderRadius={4} style={{ marginLeft: "auto" }} />
          </View>
          <Skeleton width="80%" height={14} borderRadius={4} />
        </View>
      ))}
    </View>
  );
}

export default function ReporterHome() {
  const router = useRouter();
  const { scheme, spacing, borderRadius, typography } = useTheme();
  const isAnonymous = useAuthStore((s) => s.isAnonymous);

  const { data: reportsData, isLoading: reportsLoading, refetch: refetchReports } = useQuery({
    queryKey: ["reporter-reports"],
    queryFn: () => reportsApi.list(),
  });

  const { data: casesData, isLoading: casesLoading, refetch: refetchCases } = useQuery({
    queryKey: ["reporter-cases"],
    queryFn: () => casesApi.list(),
  });

  const isLoading = reportsLoading || casesLoading;
  const reports = reportsData?.results || [];
  const cases = casesData?.results || [];
  const openCases = cases.filter((c) => !["RESOLVED", "CLOSED"].includes(c.status));
  const totalReports = reports.length;
  const resolvedCases = cases.filter((c) => c.status === "RESOLVED" || c.status === "CLOSED").length;

  const onRefresh = useCallback(() => {
    refetchReports();
    refetchCases();
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: scheme.background }]} edges={["top"]}>
        <ScrollView><LoadingSkeleton /></ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: scheme.background }]} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={scheme.primary} />}
      >
        {/* Greeting */}
        <Text style={[typography.display.small, { color: scheme.onBackground, fontSize: 28, lineHeight: 36 }]}>
          {getGreeting()}
        </Text>
        <Text style={[typography.body.large, { color: scheme.onSurfaceVariant, marginTop: 4, marginBottom: spacing.lg }]}>
          {formatDate()}
        </Text>

        {/* Submit CTA */}
        <Pressable
          onPress={() => router.push("/(reporter)/reports/new")}
          style={[styles.ctaCard, { backgroundColor: scheme.primaryContainer, borderRadius: borderRadius.xl }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[typography.title.medium, { color: scheme.onPrimaryContainer }]}>
              Submit a Report
            </Text>
            <Text style={[typography.body.medium, { color: scheme.onPrimaryContainer, marginTop: 4, opacity: 0.8 }]}>
              We are here to support you. Your report will be handled with care and confidentiality.
            </Text>
          </View>
          <View style={[styles.ctaIcon, { backgroundColor: scheme.primary }]}>
            <Ionicons name="shield-checkmark" size={28} color={scheme.onPrimary} />
          </View>
        </Pressable>

        {/* Quick Stats */}
        <Text style={[typography.title.small, { color: scheme.onBackground, marginTop: spacing.lg, marginBottom: spacing.sm }]}>
          Overview
        </Text>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: scheme.surface, borderRadius: borderRadius.lg, borderColor: scheme.outlineVariant }]}>
            <Text style={[typography.display.small, { color: scheme.primary, fontSize: 24, lineHeight: 32 }]}>{totalReports}</Text>
            <Text style={[typography.label.medium, { color: scheme.onSurfaceVariant, marginTop: 2 }]}>Total Reports</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: scheme.surface, borderRadius: borderRadius.lg, borderColor: scheme.outlineVariant }]}>
            <Text style={[typography.display.small, { color: scheme.secondary, fontSize: 24, lineHeight: 32 }]}>{openCases.length}</Text>
            <Text style={[typography.label.medium, { color: scheme.onSurfaceVariant, marginTop: 2 }]}>Open Cases</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: scheme.surface, borderRadius: borderRadius.lg, borderColor: scheme.outlineVariant }]}>
            <Text style={[typography.display.small, { color: "#10B981", fontSize: 24, lineHeight: 32 }]}>{resolvedCases}</Text>
            <Text style={[typography.label.medium, { color: scheme.onSurfaceVariant, marginTop: 2 }]}>Resolved</Text>
          </View>
        </View>

        <Divider />

        {/* Open Cases */}
        <Text style={[typography.title.small, { color: scheme.onBackground, marginBottom: spacing.sm }]}>
          Open Cases
        </Text>

        {openCases.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: scheme.surfaceVariant, borderRadius: borderRadius.lg }]}>
            <Ionicons name="folder-open-outline" size={32} color={scheme.onSurfaceVariant} />
            <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant, marginTop: spacing.sm, textAlign: "center" }]}>
              No open cases. When you submit a report and it is assigned, your case updates will appear here.
            </Text>
          </View>
        ) : (
          openCases.slice(0, 3).map((c: Case) => (
            <Pressable
              key={c.id}
              onPress={() => router.push(`/reports/${c.report?.id || c.id}`)}
              style={[styles.caseCard, { backgroundColor: scheme.surface, borderRadius: borderRadius.lg, borderColor: scheme.outlineVariant }]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <Chip
                  label={getStatusLabel(c.status)}
                  variant="filter"
                  selected
                  onPress={() => {}}
                />
                {c.report?.case_number && (
                  <Text style={[typography.label.medium, { color: scheme.onSurfaceVariant, marginLeft: "auto" }]}>
                    #{c.report.case_number}
                  </Text>
                )}
              </View>
              <Text style={[typography.body.medium, { color: scheme.onSurface }]} numberOfLines={2}>
                {c.report?.description || "No description"}
              </Text>
            </Pressable>
          ))
        )}

        {openCases.length > 3 && (
          <Pressable onPress={() => router.push("/(reporter)/reports")}>
            <Text style={[typography.label.large, { color: scheme.primary, textAlign: "center", marginTop: spacing.sm }]}>
              View all {openCases.length} cases
            </Text>
          </Pressable>
        )}

        <Divider />

        {/* Need Help */}
        <Pressable
          onPress={() => router.push("/(auth)/resources")}
          style={[styles.helpCard, { backgroundColor: scheme.errorContainer, borderRadius: borderRadius.xl }]}
        >
          <Ionicons name="heart" size={24} color={scheme.error} />
          <View style={{ marginLeft: spacing.md, flex: 1 }}>
            <Text style={[typography.title.small, { color: scheme.onErrorContainer }]}>Need immediate help?</Text>
            <Text style={[typography.body.small, { color: scheme.onErrorContainer, marginTop: 2, opacity: 0.8 }]}>
              Access support resources and helplines
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={scheme.onErrorContainer} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 40 },
  ctaCard: { flexDirection: "row", alignItems: "center", padding: 20 },
  ctaIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginLeft: 16 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  statCard: { flex: 1, padding: 14, alignItems: "center", borderWidth: 1 },
  emptyState: { padding: 32, alignItems: "center" },
  caseCard: { padding: 16, marginBottom: 8, borderWidth: 1 },
  helpCard: { flexDirection: "row", alignItems: "center", padding: 18 },
});
