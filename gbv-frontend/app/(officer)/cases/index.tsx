import { useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ListRenderItemInfo,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../../src/theme/ThemeProvider";
import {
  Card,
  Chip,
  Skeleton,
  BottomSheet,
  Button,
  Divider,
} from "../../../src/components/ui";
import { ResponsiveListDetail } from "../../../src/components/navigation";
import { useBreakpoint, isWide } from "../../../src/hooks/useBreakpoint";
import { casesApi } from "../../../src/api/cases";
import type { Case, CaseStatus } from "../../../src/types";

const PRIORITY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  critical: { bg: "#FEE2E2", text: "#991B1B", dot: "#DC2626" },
  high: { bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
  medium: { bg: "#DBEAFE", text: "#1E40AF", dot: "#3B82F6" },
  low: { bg: "#D1FAE5", text: "#065F46", dot: "#10B981" },
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: "Pending Review",
  ASSIGNED: "Assigned",
  UNDER_REVIEW: "Under Review",
  AWAITING_REPORTER_RESPONSE: "Awaiting Response",
  UNDER_INVESTIGATION: "Under Investigation",
  REFERRED: "Referred",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  REOPENED: "Reopened",
};

const SORT_OPTIONS = [
  { key: "-updated_at", label: "Recently Updated" },
  { key: "updated_at", label: "Least Recently Updated" },
  { key: "-created_at", label: "Newest First" },
  { key: "created_at", label: "Oldest First" },
  { key: "-report__priority", label: "Priority (High-Low)" },
  { key: "report__priority", label: "Priority (Low-High)" },
] as const;

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: "", label: "All" },
  ...Object.entries(STATUS_LABELS).map(([key, label]) => ({ key, label })),
];

const PRIORITY_FILTERS = [
  { key: "", label: "All" },
  { key: "critical", label: "Critical" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
];

function getStatusColor(status: string, scheme: Record<string, string>): string {
  const active = ["PENDING_REVIEW", "ASSIGNED", "UNDER_REVIEW", "AWAITING_REPORTER_RESPONSE", "UNDER_INVESTIGATION"];
  const resolved = ["RESOLVED", "CLOSED"];
  if (active.includes(status)) return scheme.primary;
  if (resolved.includes(status)) return scheme.success;
  return scheme.onSurfaceVariant;
}

function CaseListItem({
  item,
  onPress,
  isSelected,
}: {
  item: Case;
  onPress: () => void;
  isSelected: boolean;
}) {
  const { scheme, spacing, borderRadius: br, typography } = useTheme();
  const priorityColor = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.listItem,
        {
          backgroundColor: isSelected ? scheme.primaryContainer : scheme.surface,
          borderRadius: br.lg,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Case ${item.report?.case_number || "Unassigned"}, ${item.status}`}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}>
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: priorityColor.dot,
            marginTop: 6,
          }}
        />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <Text
              style={[typography.title.small, { color: scheme.onSurface, flex: 1 }]}
              numberOfLines={1}
            >
              {item.report?.case_number ? `#${item.report.case_number}` : "Unassigned Case"}
            </Text>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 4,
                backgroundColor: priorityColor.bg,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: priorityColor.text,
                  textTransform: "uppercase",
                }}
              >
                {item.priority}
              </Text>
            </View>
          </View>
          <Text
            style={[typography.body.small, { color: scheme.onSurfaceVariant, marginTop: 2 }]}
            numberOfLines={1}
          >
            {item.report?.category?.name || "Incident Report"}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
            <View
              style={[
                {
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 4,
                  backgroundColor: `${getStatusColor(item.status, scheme)}18`,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  color: getStatusColor(item.status, scheme),
                }}
              >
                {STATUS_LABELS[item.status] || item.status}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: scheme.onSurfaceVariant }}>
              {item.updated_at
                ? new Date(item.updated_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : ""}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={scheme.onSurfaceVariant} />
      </View>
    </Pressable>
  );
}

function CaseDetailPreview({
  item,
  onViewFull,
}: {
  item: Case;
  onViewFull: () => void;
}) {
  const { scheme, spacing, borderRadius: br, typography } = useTheme();

  if (!item) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 32,
        }}
      >
        <Ionicons name="folder-open-outline" size={48} color={scheme.outlineVariant} />
        <Text style={[typography.body.large, { color: scheme.onSurfaceVariant, marginTop: 16 }]}>
          Select a case to view details
        </Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 24, flex: 1 }}>
      <Text style={[typography.headline.small, { color: scheme.onBackground }]}>
        {item.report?.case_number ? `Case #${item.report.case_number}` : "Unassigned"}
      </Text>
      <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant, marginTop: 4 }]}>
        {item.report?.category?.name || "Incident Report"} · {STATUS_LABELS[item.status] || item.status}
      </Text>

      <Divider style={{ marginVertical: spacing.md }} />

      <Text style={[typography.body.medium, { color: scheme.onSurface }]}>
        {item.report?.description || "No description provided."}
      </Text>

      <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.label.medium, { color: scheme.onSurfaceVariant }]}>Date</Text>
          <Text style={[typography.body.medium, { color: scheme.onSurface }]}>
            {item.report?.incident_date
              ? new Date(item.report.incident_date).toLocaleDateString()
              : "N/A"}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.label.medium, { color: scheme.onSurfaceVariant }]}>Location</Text>
          <Text style={[typography.body.medium, { color: scheme.onSurface }]}>
            {item.report?.campus || "N/A"}
          </Text>
        </View>
      </View>

      {item.assigned_officer && (
        <View style={{ marginTop: spacing.md }}>
          <Text style={[typography.label.medium, { color: scheme.onSurfaceVariant }]}>Assigned Officer</Text>
          <Text style={[typography.body.medium, { color: scheme.onSurface }]}>
            {item.assigned_officer.full_name}
          </Text>
        </View>
      )}

      <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: "auto", paddingTop: spacing.md }}>
        <Button
          title="Open Full Case"
          onPress={onViewFull}
          variant="filled"
          style={{ flex: 1 }}
        />
      </View>
    </View>
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
  filters: {
    status: string;
    priority: string;
    sort: string;
  };
  onApply: (f: typeof filters) => void;
}) {
  const { scheme, spacing, borderRadius: br, typography } = useTheme();
  const [local, setLocal] = useState(filters);

  useMemo(() => {
    if (visible) setLocal(filters);
  }, [visible]);

  const toggleChip = (key: "status" | "priority", value: string) => {
    setLocal((prev) => ({ ...prev, [key]: prev[key] === value ? "" : value }));
  };

  return (
    <BottomSheet snapPoints={["50%", "75%"]} visible={visible} onClose={onClose}>
      <View style={{ paddingVertical: spacing.sm }}>
        <Text
          style={[
            typography.title.medium,
            { color: scheme.onSurface, marginBottom: spacing.sm },
          ]}
        >
          Filter Cases
        </Text>

        <Text style={[typography.label.large, { color: scheme.onSurfaceVariant, marginTop: spacing.sm }]}>
          Status
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.xs }}>
          {STATUS_FILTERS.map((s) => (
            <Chip
              key={s.key}
              label={s.label}
              variant="filter"
              selected={local.status === s.key}
              onPress={() => toggleChip("status", s.key)}
            />
          ))}
        </View>

        <Text style={[typography.label.large, { color: scheme.onSurfaceVariant, marginTop: spacing.md }]}>
          Priority
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.xs }}>
          {PRIORITY_FILTERS.map((p) => (
            <Chip
              key={p.key}
              label={p.label}
              variant="filter"
              selected={local.priority === p.key}
              onPress={() => toggleChip("priority", p.key)}
            />
          ))}
        </View>

        <Text style={[typography.label.large, { color: scheme.onSurfaceVariant, marginTop: spacing.md }]}>
          Sort By
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.xs }}>
          {SORT_OPTIONS.map((s) => (
            <Chip
              key={s.key}
              label={s.label}
              variant="filter"
              selected={local.sort === s.key}
              onPress={() => setLocal((prev) => ({ ...prev, sort: s.key }))}
            />
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg }}>
          <Button
            title="Reset"
            variant="outlined"
            onPress={() => setLocal({ status: "", priority: "", sort: "-updated_at" })}
            style={{ flex: 1 }}
          />
          <Button
            title="Apply Filters"
            variant="filled"
            onPress={() => {
              onApply(local);
              onClose();
            }}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </BottomSheet>
  );
}

function QueueSkeleton() {
  const { scheme, spacing } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: scheme.background, padding: spacing.md }}>
      <Skeleton width="40%" height={28} borderRadius={4} />
      <Skeleton width="70%" height={16} borderRadius={4} style={{ marginTop: 6 }} />
      <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: 16 }}>
        <Skeleton width="100%" height={44} borderRadius={12} style={{ flex: 1 }} />
        <Skeleton width={44} height={44} borderRadius={12} />
      </View>
      <Skeleton width="30%" height={14} borderRadius={4} style={{ marginTop: spacing.sm }} />
      {[1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: spacing.sm,
            marginTop: spacing.sm,
            backgroundColor: scheme.surface,
            borderRadius: 12,
            padding: 14,
            elevation: 1,
            boxShadow: "0px 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <Skeleton width={10} height={10} borderRadius={5} style={{ marginTop: 6 }} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Skeleton width="50%" height={16} borderRadius={4} />
              <Skeleton width={40} height={18} borderRadius={4} style={{ marginLeft: "auto" }} />
            </View>
            <Skeleton width="60%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
              <Skeleton width={60} height={18} borderRadius={4} />
              <Skeleton width={50} height={12} borderRadius={4} />
            </View>
          </View>
          <Skeleton width={16} height={16} borderRadius={8} />
        </View>
      ))}
    </View>
  );
}

export default function CasesList() {
  const router = useRouter();
  const { priority: urlPriority } = useLocalSearchParams<{ priority?: string }>();
  const { scheme, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const bp = useBreakpoint();
  const wide = isWide(bp);

  const [search, setSearch] = useState("");
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    priority: urlPriority || "",
    sort: "-updated_at",
  });
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);

  const queryParams = useMemo(() => {
    const p: Record<string, string> = { ordering: filters.sort };
    if (filters.status) p.status = filters.status;
    if (filters.priority) p.priority = filters.priority;
    if (search.trim()) p.search = search.trim();
    return p;
  }, [filters, search]);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["officer-cases", queryParams],
    queryFn: () => casesApi.list(queryParams),
  });

  const cases = useMemo(() => data?.results || [], [data?.results]);

  const handleCasePress = useCallback(
    (c: Case) => {
      if (wide) {
        setSelectedCase(c);
      } else {
        router.push(`/(officer)/cases/${c.id}`);
      }
    },
    [wide, router],
  );

  const handleFilterApply = useCallback((f: typeof filters) => {
    setFilters(f);
    setSelectedCase(null);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status) count++;
    if (filters.priority) count++;
    return count;
  }, [filters]);

  const listHeader = useMemo(
    () => (
      <View style={{ paddingHorizontal: spacing.sm, paddingBottom: spacing.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: scheme.surfaceVariant,
                borderRadius: 12,
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
              },
            ]}
          >
            <Ionicons name="search" size={18} color={scheme.onSurfaceVariant} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by case number..."
              placeholderTextColor={scheme.onSurfaceVariant}
              style={[
                typography.body.medium,
                { color: scheme.onSurface, flex: 1, paddingVertical: 10, marginLeft: 8 },
              ]}
              accessibilityLabel="Search cases by number"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={18} color={scheme.onSurfaceVariant} />
              </Pressable>
            )}
          </View>
          <Pressable
            onPress={() => setFilterVisible(true)}
            style={[
              styles.filterBtn,
              {
                backgroundColor: activeFilterCount > 0 ? scheme.primaryContainer : scheme.surfaceVariant,
                borderRadius: 12,
              },
            ]}
            accessibilityLabel="Open filters"
            accessibilityRole="button"
          >
            <Ionicons
              name="funnel"
              size={18}
              color={activeFilterCount > 0 ? scheme.onPrimaryContainer : scheme.onSurfaceVariant}
            />
            {activeFilterCount > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: scheme.error,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: "700", color: scheme.onError }}>
                  {activeFilterCount}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        <Text
          style={[
            typography.body.small,
            { color: scheme.onSurfaceVariant, marginTop: spacing.sm },
          ]}
        >
          {data?.count != null ? `${data.count} case${data.count !== 1 ? "s" : ""}` : ""}
          {filters.status || filters.priority ? " (filtered)" : ""}
        </Text>
      </View>
    ),
    [search, scheme, spacing, typography, activeFilterCount, data?.count, filters.status, filters.priority],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Case>) => (
      <CaseListItem
        item={item}
        onPress={() => handleCasePress(item)}
        isSelected={wide && selectedCase?.id === item.id}
      />
    ),
    [handleCasePress, wide, selectedCase],
  );

  const listKeyExtractor = useCallback((item: Case) => item.id, []);

  const listComponent = useMemo(
    () => (
      <View style={{ flex: 1, backgroundColor: scheme.background }}>
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md }}>
          <Text style={[typography.headline.small, { color: scheme.onBackground, marginBottom: 4 }]}>
            Case Queue
          </Text>
          <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant }]}>
            Manage and review assigned cases
          </Text>
        </View>

        {isLoading ? (
          <QueueSkeleton />
        ) : (
          <FlashList
            data={cases}
            renderItem={renderItem}
            keyExtractor={listKeyExtractor}
            estimatedItemSize={88}
            contentContainerStyle={{
              padding: spacing.md,
              paddingBottom: insets.bottom + 100,
            }}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={
              <View style={{ flex: 1, alignItems: "center", paddingTop: 60 }}>
                <Ionicons name="folder-open-outline" size={48} color={scheme.outlineVariant} />
                <Text
                  style={[
                    typography.body.large,
                    { color: scheme.onSurfaceVariant, marginTop: 16, textAlign: "center" },
                  ]}
                >
                  {search || filters.status || filters.priority
                    ? "No cases match your filters"
                    : "No cases assigned"}
                </Text>
                {(search || filters.status || filters.priority) && (
                  <Pressable
                    onPress={() => {
                      setSearch("");
                      setFilters({ status: "", priority: "", sort: "-updated_at" });
                    }}
                    style={{ marginTop: 12 }}
                  >
                    <Text style={{ color: scheme.primary, fontWeight: "600" }}>
                      Clear all filters
                    </Text>
                  </Pressable>
                )}
              </View>
            }
            refreshing={isRefetching}
            onRefresh={refetch}
            keyboardShouldPersistTaps="handled"
          />
        )}

        <FilterSheet
          visible={filterVisible}
          onClose={() => setFilterVisible(false)}
          filters={filters}
          onApply={handleFilterApply}
        />
      </View>
    ),
    [
      scheme,
      spacing,
      typography,
      isLoading,
      cases,
      renderItem,
      listKeyExtractor,
      listHeader,
      insets.bottom,
      search,
      filters,
      filterVisible,
      handleFilterApply,
      isRefetching,
      refetch,
    ],
  );

  const detailComponent = useMemo(
    () =>
      selectedCase ? (
        <CaseDetailPreview
          item={selectedCase}
          onViewFull={() => router.push(`/(officer)/cases/${selectedCase.id}`)}
        />
      ) : (
        <CaseDetailPreview
          item={null as any}
          onViewFull={() => {}}
        />
      ),
    [selectedCase, router],
  );

  return (
    <ResponsiveListDetail
      list={listComponent}
      detail={detailComponent}
      showDetail={wide && !!selectedCase}
    />
  );
}

const styles = StyleSheet.create({
  listItem: {
    padding: 14,
    marginBottom: 8,
    elevation: 1,
    boxShadow: "0px 1px 3px rgba(0,0,0,0.06)",
  },
  searchBar: {
    height: 44,
  },
  filterBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
