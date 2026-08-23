import { useState, useCallback, useMemo } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Modal } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/ThemeProvider";
import { Divider, Skeleton } from "../../src/components/ui";
import { reportsApi } from "../../src/api/reports";
import type { Report } from "../../src/types";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: "#F3F4F6", text: "#4B5563" },
  submitted: { bg: "#DBEAFE", text: "#1E40AF" },
  under_review: { bg: "#FEF3C7", text: "#92400E" },
  assigned: { bg: "#FEF3C7", text: "#92400E" },
  resolved: { bg: "#D1FAE5", text: "#065F46" },
  closed: { bg: "#E5E7EB", text: "#374151" },
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  assigned: "Assigned",
  resolved: "Resolved",
  closed: "Closed",
};

function ReportRow({ report, onPress }: { report: Report; onPress: () => void }) {
  const { scheme, spacing, borderRadius: br, typography } = useTheme();
  const sc = STATUS_COLORS[report.status] || STATUS_COLORS.draft;
  const reporterName = report.reporter_info?.full_name || (report.reporter_info?.reporter_code ? `Anonymous (${report.reporter_info.reporter_code})` : "Unknown");

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? scheme.surfaceVariant : scheme.surface,
        borderRadius: br.lg,
        padding: spacing.sm,
        marginBottom: spacing.xs,
        elevation: 1,
        boxShadow: "0px 1px 3px rgba(0,0,0,0.06)",
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: `${sc.bg}`, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="document-text" size={18} color={sc.text} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <Text style={[typography.body.medium, { color: scheme.onSurface, fontWeight: "600", flex: 1 }]} numberOfLines={1}>
              {report.case_number ? `#${report.case_number}` : "No case yet"}
            </Text>
            <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: sc.bg }}>
              <Text style={{ fontSize: 9, fontWeight: "700", color: sc.text, textTransform: "uppercase" }}>{STATUS_LABELS[report.status] || report.status}</Text>
            </View>
          </View>
          <Text style={[typography.body.small, { color: scheme.onSurfaceVariant }]} numberOfLines={1}>
            {report.category?.name || "Uncategorized"} · {reporterName}
          </Text>
          <Text style={[typography.label.small, { color: scheme.onSurfaceVariant, marginTop: 2 }]}>
            {report.incident_date ? new Date(report.incident_date).toLocaleDateString() : "—"} · {report.campus || "No campus"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={scheme.onSurfaceVariant} />
      </View>
    </Pressable>
  );
}

function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  const { scheme, typography } = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[typography.label.large, { color: scheme.onSurfaceVariant }]}>{label}</Text>
      <Text style={[typography.body.medium, { color: scheme.onSurface, marginTop: 2 }]}>{value || "—"}</Text>
    </View>
  );
}

export default function AdminReportsScreen() {
  const { scheme, spacing, borderRadius: br, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const queryParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (search.trim()) p.search = search.trim();
    return p;
  }, [search]);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-reports", queryParams],
    queryFn: () => reportsApi.list(queryParams),
    staleTime: 30_000,
  });

  const reports = useMemo(() => data?.results || [], [data?.results]);

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["admin-report-detail", selectedId],
    queryFn: () => reportsApi.get(selectedId!),
    enabled: !!selectedId,
    staleTime: 15_000,
  });

  return (
    <View style={{ flex: 1, backgroundColor: scheme.background }}>
      <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
        <Text style={[typography.headline.small, { color: scheme.onBackground }]}>All Reports</Text>
        <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant, marginBottom: spacing.md }]}>View every report and incident in the system</Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: scheme.surfaceVariant, borderRadius: 12, paddingHorizontal: 12 }}>
            <Ionicons name="search" size={18} color={scheme.onSurfaceVariant} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search reports..."
              placeholderTextColor={scheme.onSurfaceVariant}
              style={[typography.body.medium, { color: scheme.onSurface, flex: 1, paddingVertical: 10, marginLeft: 8 }]}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}><Ionicons name="close-circle" size={18} color={scheme.onSurfaceVariant} /></Pressable>
            )}
          </View>
        </View>

        <Text style={[typography.body.small, { color: scheme.onSurfaceVariant, marginTop: spacing.sm }]}>
          {data?.count != null ? `${data.count} report${data.count !== 1 ? "s" : ""}` : ""}
        </Text>
      </View>

      {isLoading ? (
        <View style={{ padding: spacing.md }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} width="100%" height={68} borderRadius={12} style={{ marginBottom: spacing.sm }} />
          ))}
        </View>
      ) : (
        <FlashList
          data={reports}
          renderItem={({ item }: any) => <ReportRow report={item} onPress={() => setSelectedId(item.id)} />}
          keyExtractor={(item: Report) => item.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 100 }}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <Ionicons name="document-text-outline" size={48} color={scheme.outlineVariant} />
              <Text style={[typography.body.large, { color: scheme.onSurfaceVariant, marginTop: 16 }]}>
                {search ? "No reports match search" : "No reports found"}
              </Text>
            </View>
          }
        />
      )}

      {selectedId && (
        <Modal transparent animationType="slide" onRequestClose={() => setSelectedId(null)} statusBarTranslucent>
          <Pressable style={{ flex: 1, backgroundColor: "transparent", justifyContent: "flex-end" }} onPress={() => setSelectedId(null)}>
            <Pressable
              style={{ backgroundColor: scheme.background, borderTopLeftRadius: br.xl, borderTopRightRadius: br.xl, maxHeight: "92%", paddingBottom: insets.bottom + spacing.md }}
              onPress={() => {}}
            >
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: scheme.outlineVariant, alignSelf: "center", marginTop: spacing.sm }} />
              {detailLoading || !detail ? (
                <View style={{ padding: spacing.lg }}>
                  <Skeleton width="60%" height={24} borderRadius={8} style={{ marginBottom: spacing.md }} />
                  <Skeleton width="100%" height={120} borderRadius={12} style={{ marginBottom: spacing.md }} />
                  <Skeleton width="100%" height={60} borderRadius={12} />
                </View>
              ) : (
                <ScrollView style={{ padding: spacing.lg }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={[typography.title.large, { color: scheme.onBackground }]}>
                      {detail.case_number ? `Report #${detail.case_number}` : "Report"}
                    </Text>
                    <Pressable onPress={() => setSelectedId(null)} style={{ padding: spacing.xs }}>
                      <Ionicons name="close" size={24} color={scheme.onSurfaceVariant} />
                    </Pressable>
                  </View>

                  <View style={{ alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: (STATUS_COLORS[detail.status] || STATUS_COLORS.draft).bg, marginTop: spacing.sm }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: (STATUS_COLORS[detail.status] || STATUS_COLORS.draft).text }}>
                      {STATUS_LABELS[detail.status] || detail.status}
                    </Text>
                  </View>

                  <Divider style={{ marginVertical: spacing.lg }} />

                  <Text style={[typography.title.small, { color: scheme.onSurface, marginBottom: spacing.md }]}>Details</Text>
                  <DetailRow label="Category" value={detail.category?.name} />
                  <DetailRow label="Incident Date" value={detail.incident_date ? new Date(detail.incident_date).toLocaleDateString() : undefined} />
                  <DetailRow label="Campus" value={detail.campus} />
                  <DetailRow label="Department" value={detail.department} />
                  <DetailRow label="Location" value={detail.location_text} />
                  <DetailRow label="Priority" value={detail.priority} />
                  <DetailRow label="Description" value={detail.description} />

                  {detail.reporter_info && (detail.reporter_info.full_name || detail.reporter_info.reporter_code) && (
                    <DetailRow label="Reporter" value={detail.reporter_info.full_name || `Anonymous (${detail.reporter_info.reporter_code})`} />
                  )}

                  <DetailRow
                    label="Evidence"
                    value={
                      detail.evidence?.length
                        ? `${detail.evidence.length} file${detail.evidence.length !== 1 ? "s" : ""} attached`
                        : "No evidence"
                    }
                  />

                  <DetailRow label="Reported" value={detail.created_at ? new Date(detail.created_at).toLocaleString() : undefined} />
                </ScrollView>
              )}
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({});
