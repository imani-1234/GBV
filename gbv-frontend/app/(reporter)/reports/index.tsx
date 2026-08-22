import { useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { Chip, Skeleton } from "../../../src/components/ui";
import { reportsApi } from "../../../src/api/reports";
import type { Report } from "../../../src/types";

const STATUS_FILTERS = ["all", "draft", "submitted", "under_review", "resolved", "closed"] as const;

function getStatusLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getStatusChipColor(s: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    draft: { bg: "#E2E3E5", text: "#383D41" },
    submitted: { bg: "#CCE5FF", text: "#004085" },
    under_review: { bg: "#D4EDDA", text: "#155724" },
    assigned: { bg: "#E2D5F1", text: "#4A1B7A" },
    resolved: { bg: "#D4EDDA", text: "#155724" },
    closed: { bg: "#E2E3E5", text: "#383D41" },
  };
  return map[s] || { bg: "#E2E3E5", text: "#383D41" };
}

function SkeletonCard() {
  const { scheme, spacing, borderRadius, typography } = useTheme();
  return (
    <View style={[styles.skeletonCard, { borderColor: scheme.outlineVariant, borderRadius: borderRadius.lg }]}>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
        <Skeleton width={80} height={24} borderRadius={borderRadius.sm} />
        <Skeleton width={60} height={24} borderRadius={borderRadius.sm} />
      </View>
      <Skeleton width="70%" height={16} borderRadius={borderRadius.sm} />
      <Skeleton width="40%" height={14} borderRadius={borderRadius.sm} style={{ marginTop: 6 }} />
    </View>
  );
}

export default function MyReportsScreen() {
  const router = useRouter();
  const { scheme, spacing, borderRadius, typography } = useTheme();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useQuery({
    queryKey: ["my-reports", statusFilter],
    queryFn: () => reportsApi.list(statusFilter !== "all" ? { status: statusFilter } : undefined),
  });

  const reports = data?.results || [];

  const renderItem = useCallback(({ item }: { item: Report }) => {
    const chipColor = getStatusChipColor(item.status);
    return (
      <Pressable
        onPress={() => router.push(`/reports/${item.id}`)}
        style={[styles.card, { backgroundColor: scheme.surface, borderRadius: borderRadius.lg, borderColor: scheme.outlineVariant }]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <View style={[styles.statusChip, { backgroundColor: chipColor.bg }]}>
            <Text style={[typography.label.small, { color: chipColor.text }]}>{getStatusLabel(item.status)}</Text>
          </View>
          {item.case_number && (
            <Text style={[typography.label.small, { color: scheme.onSurfaceVariant, marginLeft: "auto" }]}>
              #{item.case_number}
            </Text>
          )}
        </View>
        <Text style={[typography.body.medium, { color: scheme.onSurface }]} numberOfLines={2}>
          {item.category?.name || "Uncategorised"}
        </Text>
        <Text style={[typography.body.small, { color: scheme.onSurfaceVariant, marginTop: 4 }]}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </Pressable>
    );
  }, [scheme]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: scheme.background }]} edges={["top"]}>
      <View style={styles.header}>
        <Text style={[typography.headline.small, { color: scheme.onBackground }]}>My Reports</Text>
        <Pressable onPress={() => router.push("/(reporter)/reports/new")} style={[styles.addBtn, { backgroundColor: scheme.primary, borderRadius: borderRadius.full }]}>
          <Ionicons name="add" size={22} color={scheme.onPrimary} />
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <Chip key={f} label={getStatusLabel(f)} variant="filter" selected={statusFilter === f} onPress={() => setStatusFilter(f)} />
        ))}
      </View>

      {isLoading ? (
        <View style={{ padding: 24, gap: 12 }}>
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : reports.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: scheme.surfaceVariant, borderRadius: borderRadius.lg }]}>
          <Ionicons name="document-text-outline" size={40} color={scheme.onSurfaceVariant} />
          <Text style={[typography.body.large, { color: scheme.onSurfaceVariant, marginTop: spacing.md, textAlign: "center" }]}>
            No reports yet
          </Text>
          <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant, marginTop: 4, textAlign: "center" }]}>
            When you submit a report, it will appear here.
          </Text>
        </View>
      ) : (
        <FlashList
          data={reports}
          renderItem={renderItem}
          estimatedItemSize={120}
          keyExtractor={(item: Report) => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={scheme.primary} />}
          onEndReached={() => { if (hasNextPage) fetchNextPage(); }}
          onEndReachedThreshold={0.5}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8 },
  addBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  filterRow: { flexDirection: "row", paddingHorizontal: 16, gap: 6, paddingBottom: 8, flexWrap: "wrap" },
  card: { padding: 16, marginBottom: 8, borderWidth: 1 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  empty: { marginHorizontal: 24, marginTop: 40, padding: 40, alignItems: "center" },
  skeletonCard: { padding: 16, marginBottom: 8, borderWidth: 1 },
});
