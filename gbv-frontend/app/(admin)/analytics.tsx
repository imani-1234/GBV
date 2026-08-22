import { useState, useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme/ThemeProvider";
import { Card, Skeleton, Divider } from "../../src/components/ui";
import { analyticsApi } from "../../src/api/analytics";

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#DC2626",
  high: "#F59E0B",
  medium: "#3B82F6",
  low: "#10B981",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  assigned: "Assigned",
  resolved: "Resolved",
  closed: "Closed",
};

function formatTime(seconds: number | null): string {
  if (!seconds) return "N/A";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  const { scheme, spacing, borderRadius: br } = useTheme();
  return (
    <Card variant="elevated" padding="sm" style={{ flex: 1, minWidth: 140, marginBottom: spacing.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: `${color}18`, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: "700", color: scheme.onSurface }}>{value}</Text>
          <Text style={{ fontSize: 12, color: scheme.onSurfaceVariant }}>{label}</Text>
        </View>
      </View>
    </Card>
  );
}

function BarChartSkeleton() {
  const { scheme } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", height: 180, gap: 8, paddingTop: 20 }}>
      {[60, 90, 45, 120, 70, 100, 50, 80].map((h, i) => (
        <View key={i} style={{ flex: 1, alignItems: "center", gap: 6 }}>
          <View style={{ width: "80%", height: h, backgroundColor: scheme.shimmer, borderRadius: 4, opacity: 0.3 + (i % 3) * 0.2 }} />
          <View style={{ width: "100%", height: 8, backgroundColor: scheme.shimmer, borderRadius: 2, opacity: 0.3 }} />
        </View>
      ))}
    </View>
  );
}

function DonutSkeleton() {
  const { scheme } = useTheme();
  return (
    <View style={{ alignItems: "center", justifyContent: "center", height: 200 }}>
      <View style={{ width: 140, height: 140, borderRadius: 70, backgroundColor: scheme.shimmer, opacity: 0.4 }} />
    </View>
  );
}

function LineSkeleton() {
  const { scheme } = useTheme();
  return (
    <View style={{ height: 180, justifyContent: "flex-end", paddingBottom: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, height: 150 }}>
        {[40, 55, 38, 65, 50, 80, 60, 90, 72, 95, 78, 100].map((h, i) => (
          <View key={i} style={{ flex: 1, height: h, backgroundColor: scheme.shimmer, borderRadius: 2, opacity: 0.3 + (i % 3) * 0.2 }} />
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 4, marginTop: 8 }}>
        {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m) => (
          <View key={m} style={{ flex: 1, height: 10, backgroundColor: scheme.shimmer, borderRadius: 2, opacity: 0.3 }} />
        ))}
      </View>
    </View>
  );
}

function BarChartCard({ data }: { data: { department: string; count: number }[] }) {
  const { scheme, spacing } = useTheme();
  const { width } = useWindowDimensions();
  const chartWidth = Math.min(width - 64, 600);
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <Card variant="filled" padding="md" style={{ marginBottom: spacing.md }}>
      <Text style={{ fontSize: 16, fontWeight: "600", color: scheme.onSurface, marginBottom: spacing.md }}>Reports by Department</Text>
      <View style={{ gap: spacing.sm }}>
        {data.map((d) => {
          const pct = (d.count / maxCount) * 100;
          return (
            <View key={d.department}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontSize: 13, color: scheme.onSurface }}>{d.department}</Text>
                <Text style={{ fontSize: 13, fontWeight: "600", color: scheme.onSurfaceVariant }}>{d.count}</Text>
              </View>
              <View style={{ height: 22, backgroundColor: scheme.surface, borderRadius: 6, overflow: "hidden" }}>
                <View
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    backgroundColor: scheme.primary,
                    borderRadius: 6,
                    minWidth: 4,
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

function DonutChartCard({ byStatus }: { byStatus: Record<string, number> }) {
  const { scheme, spacing } = useTheme();
  const entries = Object.entries(byStatus).filter(([, v]) => v > 0);
  const total = entries.reduce((a, [, v]) => a + v, 0) || 1;
  const palette = [scheme.primary, scheme.tertiary, scheme.secondary, scheme.success, scheme.warning, scheme.info, scheme.error];

  return (
    <Card variant="filled" padding="md" style={{ marginBottom: spacing.md }}>
      <Text style={{ fontSize: 16, fontWeight: "600", color: scheme.onSurface, marginBottom: spacing.md }}>Status Distribution</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: scheme.surface, alignItems: "center", justifyContent: "center", position: "relative" }}>
          {(() => {
            let cumulative = 0;
            return entries.map(([status, count], i) => {
              const pct = (count / total) * 360;
              const startAngle = cumulative;
              cumulative += pct;
              const color = palette[i % palette.length];
              return (
                <View
                  key={status}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    borderWidth: 16,
                    borderColor: color,
                    opacity: 0.85,
                    transform: [{ rotate: `${startAngle}deg` }],
                  }}
                />
              );
            });
          })()}
          <Text style={{ fontSize: 20, fontWeight: "700", color: scheme.onSurface }}>{total}</Text>
          <Text style={{ fontSize: 10, color: scheme.onSurfaceVariant }}>Total</Text>
        </View>
        <View style={{ flex: 1, gap: 6, justifyContent: "center" }}>
          {entries.map(([status, count], i) => {
            const color = palette[i % palette.length];
            return (
              <View key={status} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
                <Text style={{ fontSize: 12, color: scheme.onSurface, flex: 1 }}>{STATUS_LABELS[status] || status}</Text>
                <Text style={{ fontSize: 12, fontWeight: "600", color: scheme.onSurfaceVariant }}>{count}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </Card>
  );
}

function LineChartCard({ data }: { data: { month: string; count: number; resolved: number }[] }) {
  const { scheme, spacing } = useTheme();
  const maxVal = Math.max(...data.map((d) => Math.max(d.count, d.resolved)), 1);
  const chartHeight = 160;

  return (
    <Card variant="filled" padding="md" style={{ marginBottom: spacing.md }}>
      <Text style={{ fontSize: 16, fontWeight: "600", color: scheme.onSurface, marginBottom: spacing.md }}>Monthly Trend</Text>
      <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12, marginBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 10, height: 3, backgroundColor: scheme.primary, borderRadius: 2 }} />
          <Text style={{ fontSize: 11, color: scheme.onSurfaceVariant }}>Filed</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 10, height: 3, backgroundColor: scheme.success, borderRadius: 2 }} />
          <Text style={{ fontSize: 11, color: scheme.onSurfaceVariant }}>Resolved</Text>
        </View>
      </View>
      <View style={{ height: chartHeight, flexDirection: "row", alignItems: "flex-end", gap: 2 }}>
        {data.map((d, i) => {
          const filedH = (d.count / maxVal) * chartHeight;
          const resolvedH = (d.resolved / maxVal) * chartHeight;
          return (
            <View key={i} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: chartHeight }}>
              <View style={{ width: "60%", height: Math.max(resolvedH, 2), backgroundColor: scheme.success, borderRadius: 2, opacity: 0.7 }} />
              <View style={{ width: "60%", height: Math.max(filedH - resolvedH, 2), backgroundColor: scheme.primary, borderRadius: 2, marginTop: 1 }} />
              <Text style={{ fontSize: 8, color: scheme.onSurfaceVariant, marginTop: 4, transform: [{ rotate: "-45deg" }] }}>
                {d.month?.slice(0, 3) || ""}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

function PriorityBarCard({ byPriority }: { byPriority: Record<string, number> }) {
  const { scheme, spacing } = useTheme();
  const order = ["critical", "high", "medium", "low"];
  const total = order.reduce((a, k) => a + (byPriority[k] || 0), 0) || 1;

  return (
    <Card variant="filled" padding="md" style={{ marginBottom: spacing.md }}>
      <Text style={{ fontSize: 16, fontWeight: "600", color: scheme.onSurface, marginBottom: spacing.md }}>Reports by Priority</Text>
      {order.map((key) => {
        const count = byPriority[key] || 0;
        const pct = (count / total) * 100;
        const color = PRIORITY_COLORS[key];
        return (
          <View key={key} style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                <Text style={{ fontSize: 13, color: scheme.onSurface, textTransform: "capitalize" }}>{key}</Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: "600", color: scheme.onSurfaceVariant }}>{count}</Text>
            </View>
            <View style={{ height: 8, backgroundColor: scheme.surface, borderRadius: 4, overflow: "hidden" }}>
              <View style={{ width: `${pct}%`, height: "100%", backgroundColor: color, borderRadius: 4 }} />
            </View>
          </View>
        );
      })}
    </Card>
  );
}

export default function AnalyticsScreen() {
  const { scheme, spacing } = useTheme();

  const summaryQuery = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: () => analyticsApi.summary(),
    staleTime: 120_000,
  });

  const deptQuery = useQuery({
    queryKey: ["analytics-by-department"],
    queryFn: () => analyticsApi.byDepartment(),
    staleTime: 120_000,
  });

  const monthQuery = useQuery({
    queryKey: ["analytics-by-month"],
    queryFn: () => analyticsApi.byMonth(),
    staleTime: 120_000,
  });

  const isLoading = summaryQuery.isLoading || deptQuery.isLoading || monthQuery.isLoading;
  const summary = summaryQuery.data;
  const byDept = deptQuery.data || [];
  const byMonth = monthQuery.data || [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: scheme.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={{ fontSize: 24, fontWeight: "700", color: scheme.onBackground, marginBottom: 4 }}>Analytics Dashboard</Text>
      <Text style={{ fontSize: 14, color: scheme.onSurfaceVariant, marginBottom: spacing.lg }}>System-wide reporting metrics</Text>

      {isLoading ? (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md }}>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} variant="elevated" padding="sm" style={{ flex: 1, minWidth: 140 }}>
                <Skeleton width={40} height={40} borderRadius={10} />
                <Skeleton width="60%" height={22} style={{ marginTop: 8 }} />
                <Skeleton width="80%" height={12} style={{ marginTop: 4 }} />
              </Card>
            ))}
          </View>
          <BarChartSkeleton />
          <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
            <View style={{ flex: 1 }}><DonutSkeleton /></View>
            <View style={{ flex: 1 }}><DonutSkeleton /></View>
          </View>
          <LineSkeleton />
        </>
      ) : (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <StatCard icon="document-text" label="Total Reports" value={summary?.total_reports ?? 0} color={scheme.primary} />
            <StatCard icon="people" label="Identified" value={summary?.identified_reports ?? 0} color={scheme.info} />
            <StatCard icon="eye-off-outline" label="Anonymous" value={summary?.anonymous_reports ?? 0} color={scheme.warning} />
            <StatCard icon="time" label="Avg Resolution" value={formatTime(summary?.avg_resolution_time_seconds ?? null)} color={scheme.success} />
          </View>

          {byDept.length > 0 && <BarChartCard data={byDept} />}

          {summary?.by_status && Object.keys(summary.by_status).length > 0 && (
            <DonutChartCard byStatus={summary.by_status} />
          )}

          {byMonth.length > 0 && <LineChartCard data={byMonth} />}

          {summary?.by_priority && Object.keys(summary.by_priority).length > 0 && (
            <PriorityBarCard byPriority={summary.by_priority} />
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({});
