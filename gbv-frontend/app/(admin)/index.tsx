import { useMemo } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme/ThemeProvider";
import { Card, Skeleton, Divider } from "../../src/components/ui";
import { analyticsApi } from "../../src/api/analytics";

function formatTime(seconds: number | null): string {
  if (!seconds) return "N/A";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

function QuickStat({ icon, label, value, color, onPress }: { icon: string; label: string; value: string | number; color: string; onPress?: () => void }) {
  const { scheme, spacing, borderRadius: br } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: scheme.surface,
        borderRadius: br.xl,
        padding: spacing.md,
        flex: 1,
        minWidth: 140,
        borderLeftWidth: 4,
        borderLeftColor: color,
        opacity: pressed ? 0.85 : 1,
        elevation: 1,
        boxShadow: "0px 1px 4px rgba(0,0,0,0.08)",
      })}
    >
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${color}18`, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={{ fontSize: 26, fontWeight: "700", color: scheme.onSurface, marginTop: spacing.sm }}>{value}</Text>
      <Text style={{ fontSize: 13, color: scheme.onSurfaceVariant }}>{label}</Text>
    </Pressable>
  );
}

function NavCard({ icon, label, description, route, color }: { icon: string; label: string; description: string; route: string; color: string }) {
  const { scheme, spacing, borderRadius: br, typography } = useTheme();
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(route)}
      style={({ pressed }) => ({
        backgroundColor: scheme.surface,
        borderRadius: br.xl,
        padding: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        opacity: pressed ? 0.85 : 1,
        elevation: 1,
        boxShadow: "0px 1px 3px rgba(0,0,0,0.06)",
      })}
    >
      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: `${color}18`, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.title.small, { color: scheme.onSurface }]}>{label}</Text>
        <Text style={[typography.body.small, { color: scheme.onSurfaceVariant }]}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={scheme.onSurfaceVariant} />
    </Pressable>
  );
}

export default function AdminDashboard() {
  const { scheme, spacing } = useTheme();

  const { data: summary, isLoading } = useQuery({
    queryKey: ["admin-dashboard-summary"],
    queryFn: () => analyticsApi.summary(),
    staleTime: 120_000,
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: scheme.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ marginBottom: spacing.md }}>
        <Text style={{ fontSize: 24, fontWeight: "700", color: scheme.onBackground }}>Admin Dashboard</Text>
        <Text style={{ fontSize: 14, color: scheme.onSurfaceVariant, marginTop: 4 }}>System overview and management</Text>
      </View>

      {isLoading ? (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={{ flex: 1, minWidth: 140, padding: spacing.md }}>
                <Skeleton width={36} height={36} borderRadius={10} />
                <Skeleton width="60%" height={26} style={{ marginTop: 8 }} />
                <Skeleton width="80%" height={12} style={{ marginTop: 4 }} />
              </View>
            ))}
          </View>
          <Divider style={{ marginVertical: spacing.lg }} />
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} width="100%" height={68} borderRadius={16} style={{ marginBottom: spacing.sm }} />
          ))}
        </>
      ) : (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md }}>
            <QuickStat icon="document-text" label="Total Reports" value={summary?.total_reports ?? 0} color={scheme.primary} />
            <QuickStat icon="people" label="Identified" value={summary?.identified_reports ?? 0} color={scheme.info} />
            <QuickStat icon="eye-off-outline" label="Anonymous" value={summary?.anonymous_reports ?? 0} color={scheme.warning} />
            <QuickStat icon="time" label="Avg Resolution" value={formatTime(summary?.avg_resolution_time_seconds ?? null)} color={scheme.success} />
          </View>

          <Divider style={{ marginBottom: spacing.md }} />

          <Text style={{ fontSize: 16, fontWeight: "600", color: scheme.onSurface, marginBottom: spacing.md }}>Quick Navigation</Text>

          <View style={{ gap: spacing.sm }}>
            <NavCard icon="bar-chart" label="Analytics" description="Charts, trends, and system metrics" route="/(admin)/analytics" color={scheme.tertiary} />
            <NavCard icon="document-text" label="All Reports" description="View every report in the system" route="/(admin)/reports" color={scheme.primary} />
            <NavCard icon="folder-open" label="Case Oversight" description="View and manage all cases" route="/(admin)/case-oversight" color={scheme.primary} />
            <NavCard icon="people" label="User Management" description="Manage officers and users" route="/(admin)/user-management" color={scheme.secondary} />
            <NavCard icon="document-text" label="Audit Logs" description="System activity trail" route="/(admin)/audit-logs" color={scheme.info} />
            <NavCard icon="pricetags" label="Categories" description="Manage incident categories" route="/(admin)/categories" color={scheme.warning} />
            <NavCard icon="settings" label="Settings" description="System configuration" route="/(admin)/settings" color={scheme.onSurfaceVariant} />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({});
