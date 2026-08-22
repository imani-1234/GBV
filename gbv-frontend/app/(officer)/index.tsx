import { useCallback, useMemo } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/ThemeProvider";
import { Card, Skeleton, Chip, Divider } from "../../src/components/ui";
import { casesApi } from "../../src/api/cases";
import type { Case } from "../../src/types";

const PRIORITY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  critical: { bg: "#FEE2E2", text: "#991B1B", dot: "#DC2626" },
  high: { bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
  medium: { bg: "#DBEAFE", text: "#1E40AF", dot: "#3B82F6" },
  low: { bg: "#D1FAE5", text: "#065F46", dot: "#10B981" },
};

function getStatusLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatCard({
  label,
  value,
  color,
  icon,
  onPress,
}: {
  label: string;
  value: string | number;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}) {
  const { scheme, spacing, borderRadius: br } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.statCard,
        {
          backgroundColor: scheme.surface,
          borderRadius: br.xl,
          borderLeftWidth: 4,
          borderLeftColor: color,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
    >
      <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={{ marginTop: spacing.sm }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "700",
            color: scheme.onSurface,
          }}
        >
          {value}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: scheme.onSurfaceVariant,
            marginTop: 2,
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function PriorityChartCard({
  byPriority,
}: {
  byPriority: Record<string, number>;
}) {
  const { scheme, spacing, borderRadius: br } = useTheme();
  const order = ["critical", "high", "medium", "low"];
  const total = Object.values(byPriority).reduce((a, b) => a + b, 0) || 1;

  return (
    <Card variant="filled" padding="md" style={{ marginBottom: spacing.md }}>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: scheme.onSurface,
          marginBottom: spacing.sm,
          marginLeft: 4,
        }}
      >
        Cases by Priority
      </Text>
      {order.map((key) => {
        const count = byPriority[key] || 0;
        const pct = Math.round((count / total) * 100);
        const colors = PRIORITY_COLORS[key];
        return (
          <View key={key} style={{ marginBottom: spacing.xs }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colors.dot,
                  }}
                />
                <Text
                  style={{
                    fontSize: 13,
                    color: scheme.onSurface,
                    textTransform: "capitalize",
                  }}
                >
                  {key}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: scheme.onSurfaceVariant,
                }}
              >
                {count}
              </Text>
            </View>
            <View
              style={{
                height: 6,
                backgroundColor: scheme.surfaceVariant,
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  backgroundColor: colors.dot,
                  borderRadius: 3,
                }}
              />
            </View>
          </View>
        );
      })}
    </Card>
  );
}

function NeedsAttentionCard({
  cases,
  onPress,
}: {
  cases: Case[];
  onPress: (c: Case) => void;
}) {
  const { scheme, spacing, borderRadius: br, typography } = useTheme();

  if (cases.length === 0) return null;

  return (
    <Card variant="outlined" padding="none" style={{ marginBottom: spacing.md, overflow: "hidden" }}>
      <View
        style={{
          backgroundColor: "#FEF2F2",
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
        }}
      >
        <Ionicons name="alert-circle" size={18} color="#DC2626" />
        <Text style={{ fontSize: 15, fontWeight: "600", color: "#991B1B" }}>
          Needs Attention ({cases.length})
        </Text>
      </View>
      {cases.slice(0, 5).map((c, i) => {
        const isLast = i === Math.min(cases.length - 1, 4);
        const priorityColors = PRIORITY_COLORS[c.priority] || PRIORITY_COLORS.medium;
        return (
          <Pressable
            key={c.id}
            onPress={() => onPress(c)}
            style={({ pressed }) => [
              styles.attentionItem,
              {
                backgroundColor: pressed ? scheme.surfaceVariant : "transparent",
                borderBottomWidth: isLast ? 0 : 1,
                borderBottomColor: scheme.outlineVariant,
              },
            ]}
          >
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: priorityColors.dot,
                marginTop: 4,
              }}
            />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text
                style={[typography.body.medium, { color: scheme.onSurface, fontWeight: "600" }]}
                numberOfLines={1}
              >
                {c.report?.case_number ? `#${c.report.case_number}` : "Unassigned"}
              </Text>
              <Text
                style={[typography.body.small, { color: scheme.onSurfaceVariant }]}
                numberOfLines={1}
              >
                {c.report?.category?.name || "Incident Report"} · {getStatusLabel(c.status)}
              </Text>
            </View>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 4,
                backgroundColor: priorityColors.bg,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: priorityColors.text,
                  textTransform: "capitalize",
                }}
              >
                {c.priority}
              </Text>
            </View>
          </Pressable>
        );
      })}
      {cases.length > 5 && (
        <Pressable
          onPress={() => {}}
          style={({ pressed }) => ({
            padding: spacing.sm,
            alignItems: "center",
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: 13, color: scheme.primary, fontWeight: "600" }}>
            +{cases.length - 5} more
          </Text>
        </Pressable>
      )}
    </Card>
  );
}

function DashboardSkeleton() {
  const { scheme, spacing } = useTheme();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: scheme.background }}
      contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
    >
      <Skeleton width="50%" height={28} />
      <Skeleton width="70%" height={16} style={{ marginTop: 8 }} />

      <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
        <View style={{ flex: 1 }}>
          <Skeleton width="100%" height={100} borderRadius={16} />
        </View>
        <View style={{ flex: 1 }}>
          <Skeleton width="100%" height={100} borderRadius={16} />
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
        <View style={{ flex: 1 }}>
          <Skeleton width="100%" height={100} borderRadius={16} />
        </View>
        <View style={{ flex: 1 }}>
          <Skeleton width="100%" height={100} borderRadius={16} />
        </View>
      </View>

      <Skeleton width="100%" height={180} borderRadius={16} style={{ marginTop: 24 }} />
      <Skeleton width="100%" height={200} borderRadius={16} style={{ marginTop: 16 }} />
    </ScrollView>
  );
}

export default function OfficerDashboard() {
  const router = useRouter();
  const { scheme, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();

  const { data: stats, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["officer-stats"],
    queryFn: () => casesApi.officerStats(),
  });

  const handleCasePress = useCallback(
    (c: Case) => {
      router.push(`/(officer)/cases/${c.id}`);
    },
    [router],
  );

  const statusCounts = useMemo(() => {
    if (!stats?.by_status) return [];
    return Object.entries(stats.by_status)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6);
  }, [stats?.by_status]);

  if (isLoading) return <DashboardSkeleton />;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: scheme.background }}
      contentContainerStyle={{
        padding: spacing.lg,
        paddingBottom: insets.bottom + 100,
      }}
      showsVerticalScrollIndicator={false}
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      <View style={{ marginBottom: spacing.sm }}>
        <Text
          style={[
            typography.headline.small,
            { color: scheme.onBackground, marginBottom: 4 },
          ]}
        >
          Case Dashboard
        </Text>
        <Text
          style={[
            typography.body.medium,
            { color: scheme.onSurfaceVariant },
          ]}
        >
          Overview of your assigned cases
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
        <View style={{ flex: 1 }}>
          <StatCard
            label="Total Cases"
            value={stats?.total_assigned ?? 0}
            color={scheme.primary}
            icon="folder"
          />
        </View>
        <View style={{ flex: 1 }}>
          <StatCard
            label="Critical"
            value={(stats?.by_priority?.critical ?? 0) + (stats?.by_priority?.high ?? 0)}
            color={PRIORITY_COLORS.critical.dot}
            icon="flame"
            onPress={() => router.push("/(officer)/cases/index?priority=critical")}
          />
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <StatCard
            label="Needs Response"
            value={stats?.by_status?.AWAITING_REPORTER_RESPONSE ?? 0}
            color={PRIORITY_COLORS.high.dot}
            icon="chatbubble-ellipses"
          />
        </View>
        <View style={{ flex: 1 }}>
          <StatCard
            label="Under Review"
            value={stats?.by_status?.UNDER_REVIEW ?? 0}
            color={scheme.info}
            icon="search"
          />
        </View>
      </View>

      <PriorityChartCard byPriority={stats?.by_priority ?? {}} />

      {stats?.needs_attention && stats.needs_attention.length > 0 && (
        <NeedsAttentionCard cases={stats.needs_attention} onPress={handleCasePress} />
      )}

      <View
        style={{
          flexDirection: "row",
          gap: spacing.sm,
          flexWrap: "wrap",
        }}
      >
        {statusCounts.length > 0 && (
          <Card variant="filled" padding="md" style={{ marginBottom: spacing.md, flex: 1, minWidth: 200 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: scheme.onSurface,
                marginBottom: spacing.xs,
              }}
            >
              Status Breakdown
            </Text>
            {statusCounts.map(([status, count]) => (
              <View
                key={status}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 6,
                  borderBottomWidth: 1,
                  borderBottomColor: scheme.outlineVariant,
                }}
              >
                <Text style={{ fontSize: 13, color: scheme.onSurface }}>
                  {getStatusLabel(status)}
                </Text>
                <Text
                  style={{ fontSize: 13, fontWeight: "700", color: scheme.onSurfaceVariant }}
                >
                  {count}
                </Text>
              </View>
            ))}
          </Card>
        )}
      </View>

      <Pressable
        onPress={() => router.push("/(officer)/cases/index")}
        style={({ pressed }) => [
          styles.quickNav,
          {
            backgroundColor: scheme.primaryContainer,
            borderRadius: 16,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Go to Case Queue"
      >
        <Ionicons name="list" size={22} color={scheme.onPrimaryContainer} />
        <Text
          style={[
            typography.title.small,
            { color: scheme.onPrimaryContainer, marginLeft: spacing.sm, flex: 1 },
          ]}
        >
          View All Cases
        </Text>
        <Ionicons name="chevron-forward" size={20} color={scheme.onPrimaryContainer} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  statCard: {
    padding: 14,
    elevation: 1,
    boxShadow: "0px 1px 4px rgba(0,0,0,0.08)",
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  attentionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  quickNav: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    marginTop: 8,
  },
});
