import { useState, useCallback, useMemo } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Platform } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/ThemeProvider";
import { Card, Chip, Skeleton, Divider, BottomSheet, Button } from "../../src/components/ui";
import { analyticsApi } from "../../src/api/analytics";
import { useBreakpoint, isWide } from "../../src/hooks/useBreakpoint";
import type { AuditLogEntry } from "../../src/types";

const ACTION_COLORS: Record<string, string> = {
  create: "#10B981",
  update: "#3B82F6",
  delete: "#DC2626",
  login: "#8B5CF6",
  logout: "#6B7280",
  transition: "#F59E0B",
  assign: "#6366F1",
};

const ACTOR_TYPES = [
  { key: "", label: "All" },
  { key: "identified", label: "Identified" },
  { key: "anonymous", label: "Anonymous" },
  { key: "officer", label: "Officer" },
  { key: "admin", label: "Admin" },
];

const RESOURCE_TYPES = [
  { key: "", label: "All" },
  { key: "report", label: "Reports" },
  { key: "case", label: "Cases" },
  { key: "user", label: "Users" },
  { key: "message", label: "Messages" },
  { key: "category", label: "Categories" },
];

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AuditLogCard({ entry, isTable }: { entry: AuditLogEntry; isTable: boolean }) {
  const { scheme, spacing, borderRadius: br, typography } = useTheme();
  const actionColor = ACTION_COLORS[entry.action] || scheme.primary;

  if (isTable) {
    return (
      <View
        style={{
          flexDirection: "row",
          borderBottomWidth: 1,
          borderBottomColor: scheme.outlineVariant,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.sm,
          alignItems: "center",
        }}
      >
        <View style={{ width: 100 }}>
          <Text style={[typography.label.small, { color: scheme.onSurface }]}>{formatTimestamp(entry.timestamp)}</Text>
        </View>
        <View style={{ width: 80, paddingHorizontal: 4 }}>
          <View style={{ backgroundColor: `${actionColor}18`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: "flex-start" }}>
            <Text style={{ fontSize: 10, fontWeight: "700", color: actionColor, textTransform: "uppercase" }}>{entry.action}</Text>
          </View>
        </View>
        <View style={{ width: 100 }}>
          <Text style={[typography.body.small, { color: scheme.onSurface }]} numberOfLines={1}>{entry.actor_identifier}</Text>
        </View>
        <View style={{ width: 80 }}>
          <Text style={[typography.body.small, { color: scheme.onSurfaceVariant }]}>{entry.actor_type}</Text>
        </View>
        <View style={{ width: 80 }}>
          <Text style={[typography.body.small, { color: scheme.onSurfaceVariant }]}>{entry.resource_type}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.body.small, { color: scheme.onSurfaceVariant }, typography.mono]} numberOfLines={1}>
            {entry.resource_id?.slice(0, 12)}...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Card variant="elevated" padding="sm" style={{ marginBottom: spacing.sm }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}>
        <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${actionColor}18`, alignItems: "center", justifyContent: "center" }}>
          <Ionicons
            name={
              entry.action === "create" ? "add-circle" :
              entry.action === "delete" ? "trash" :
              entry.action === "login" ? "log-in" :
              entry.action === "transition" ? "swap-horizontal" :
              entry.action === "assign" ? "person-add" :
              "pencil"
            }
            size={16}
            color={actionColor}
          />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ backgroundColor: `${actionColor}18`, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
              <Text style={{ fontSize: 10, fontWeight: "700", color: actionColor, textTransform: "uppercase" }}>{entry.action}</Text>
            </View>
            <Text style={[typography.label.small, { color: scheme.onSurfaceVariant }]}>{formatTimestamp(entry.timestamp)}</Text>
          </View>
          <Text style={[typography.body.medium, { color: scheme.onSurface, marginTop: 4 }]}>
            <Text style={{ fontWeight: "600" }}>{entry.actor_identifier}</Text>
            {" · "}{entry.actor_type}
          </Text>
          <Text style={[typography.body.small, { color: scheme.onSurfaceVariant, marginTop: 2 }]}>
            {entry.resource_type} · {entry.resource_id?.slice(0, 12)}...
          </Text>
          {entry.ip_address && (
            <Text style={[typography.label.small, { color: scheme.onSurfaceVariant, marginTop: 2 }]}>
              IP: {entry.ip_address}
            </Text>
          )}
        </View>
      </View>
    </Card>
  );
}

function FilterSheet({
  visible,
  onClose,
  filters,
  onApply,
}: {
  visible: boolean;
  onClose: () => void;
  filters: { actor_type: string; resource_type: string; action: string };
  onApply: (f: typeof filters) => void;
}) {
  const { scheme, spacing, typography } = useTheme();
  const [local, setLocal] = useState(filters);

  return (
    <BottomSheet snapPoints={["50%", "70%"]} visible={visible} onClose={onClose}>
      <View>
        <Text style={[typography.title.medium, { color: scheme.onSurface, marginBottom: spacing.md }]}>Filter Audit Logs</Text>

        <Text style={[typography.label.large, { color: scheme.onSurfaceVariant }]}>Actor Type</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: spacing.xs, marginBottom: spacing.sm }}>
          {ACTOR_TYPES.map((a) => (
            <Chip key={a.key} label={a.label} variant="filter" selected={local.actor_type === a.key} onPress={() => setLocal((p) => ({ ...p, actor_type: a.key }))} />
          ))}
        </View>

        <Text style={[typography.label.large, { color: scheme.onSurfaceVariant }]}>Resource Type</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: spacing.xs, marginBottom: spacing.sm }}>
          {RESOURCE_TYPES.map((r) => (
            <Chip key={r.key} label={r.label} variant="filter" selected={local.resource_type === r.key} onPress={() => setLocal((p) => ({ ...p, resource_type: r.key }))} />
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
          <Button title="Reset" variant="outlined" onPress={() => setLocal({ actor_type: "", resource_type: "", action: "" })} style={{ flex: 1 }} />
          <Button title="Apply" variant="filled" onPress={() => { onApply(local); onClose(); }} style={{ flex: 1 }} />
        </View>
      </View>
    </BottomSheet>
  );
}

export default function AuditLogsScreen() {
  const { scheme, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const bp = useBreakpoint();
  const wide = isWide(bp);
  const isTableWidth = wide;

  const [filters, setFilters] = useState({ actor_type: "", resource_type: "", action: "" });
  const [filterVisible, setFilterVisible] = useState(false);
  const [page, setPage] = useState(1);

  const queryParams = useMemo(() => {
    const p: Record<string, string> = { page: String(page) };
    if (filters.actor_type) p.actor_type = filters.actor_type;
    if (filters.resource_type) p.resource_type = filters.resource_type;
    if (filters.action) p.action = filters.action;
    return p;
  }, [filters, page]);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["audit-logs", queryParams],
    queryFn: () => analyticsApi.auditLogs(queryParams),
    staleTime: 60_000,
  });

  const logs = useMemo(() => data?.results || [], [data?.results]);
  const activeFilterCount = [filters.actor_type, filters.resource_type, filters.action].filter(Boolean).length;

  return (
    <View style={{ flex: 1, backgroundColor: scheme.background }}>
      <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.headline.small, { color: scheme.onBackground }]}>Audit Logs</Text>
            <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant }]}>System activity trail</Text>
          </View>
          <Pressable
            onPress={() => setFilterVisible(true)}
            style={({ pressed }) => ({
              backgroundColor: activeFilterCount > 0 ? scheme.primaryContainer : scheme.surfaceVariant,
              borderRadius: 12,
              padding: 10,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Ionicons name="funnel" size={20} color={activeFilterCount > 0 ? scheme.onPrimaryContainer : scheme.onSurfaceVariant} />
            {activeFilterCount > 0 && (
              <View style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: scheme.error, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 10, fontWeight: "700", color: scheme.onError }}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={{ padding: spacing.md }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} width="100%" height={isTableWidth ? 44 : 80} borderRadius={12} style={{ marginBottom: spacing.sm }} />
          ))}
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1, marginTop: spacing.sm }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={refetch}
        >
          {isTableWidth ? (
            <View style={{ paddingHorizontal: spacing.md }}>
              {/* Table header */}
              <View style={{ flexDirection: "row", paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 2, borderBottomColor: scheme.outline }}>
                {["Timestamp", "Action", "Actor", "Type", "Resource", "ID"].map((h) => (
                  <Text key={h} style={[typography.label.medium, { color: scheme.onSurfaceVariant, width: h === "Action" ? 80 : h === "Timestamp" ? 100 : h === "Actor" ? 100 : h === "Type" ? 80 : h === "Resource" ? 80 : 100 }]}>
                    {h}
                  </Text>
                ))}
              </View>
              {logs.length === 0 ? (
                <View style={{ alignItems: "center", paddingTop: 40 }}>
                  <Text style={[typography.body.large, { color: scheme.onSurfaceVariant }]}>No log entries found</Text>
                </View>
              ) : (
                logs.map((entry) => <AuditLogCard key={entry.id} entry={entry} isTable />)
              )}
            </View>
          ) : (
            <View style={{ padding: spacing.md }}>
              {logs.length === 0 ? (
                <View style={{ alignItems: "center", paddingTop: 40 }}>
                  <Ionicons name="document-text-outline" size={48} color={scheme.outlineVariant} />
                  <Text style={[typography.body.large, { color: scheme.onSurfaceVariant, marginTop: 16 }]}>No log entries found</Text>
                </View>
              ) : (
                logs.map((entry) => <AuditLogCard key={entry.id} entry={entry} isTable={false} />)
              )}
            </View>
          )}

          <Divider style={{ marginVertical: spacing.sm }} />
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: spacing.md, paddingBottom: spacing.xl }}>
            <Pressable
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!data?.previous}
              style={({ pressed }) => ({ opacity: pressed || !data?.previous ? 0.5 : 1, padding: spacing.sm })}
            >
              <Ionicons name="chevron-back" size={20} color={scheme.primary} />
            </Pressable>
            <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant }]}>Page {page}</Text>
            <Pressable
              onPress={() => setPage((p) => p + 1)}
              disabled={!data?.next}
              style={({ pressed }) => ({ opacity: pressed || !data?.next ? 0.5 : 1, padding: spacing.sm })}
            >
              <Ionicons name="chevron-forward" size={20} color={scheme.primary} />
            </Pressable>
          </View>
        </ScrollView>
      )}

      <FilterSheet visible={filterVisible} onClose={() => setFilterVisible(false)} filters={filters} onApply={setFilters} />
    </View>
  );
}

const styles = StyleSheet.create({});
