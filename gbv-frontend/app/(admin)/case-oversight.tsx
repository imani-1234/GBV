import { useState, useCallback, useMemo } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert, Modal } from "react-native";
import type { ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/ThemeProvider";
import { Card, Chip, Skeleton, Button, Divider, Snackbar } from "../../src/components/ui";
import { casesApi } from "../../src/api/cases";
import { usersApi } from "../../src/api/users";
import type { AllowedTransition } from "../../src/api/cases";
import type { Case, CaseNote, User } from "../../src/types";

const PRIORITY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  critical: { bg: "#FEE2E2", text: "#991B1B", dot: "#DC2626" },
  high: { bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
  medium: { bg: "#DBEAFE", text: "#1E40AF", dot: "#3B82F6" },
  low: { bg: "#D1FAE5", text: "#065F46", dot: "#10B981" },
};

const PRIORITIES = ["critical", "high", "medium", "low"];

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

function getStatusColor(status: string, scheme: Record<string, string>): string {
  const active = ["PENDING_REVIEW", "ASSIGNED", "UNDER_REVIEW", "AWAITING_REPORTER_RESPONSE", "UNDER_INVESTIGATION"];
  const resolved = ["RESOLVED", "CLOSED"];
  if (active.includes(status)) return scheme.primary;
  if (resolved.includes(status)) return scheme.success;
  return scheme.onSurfaceVariant;
}

function CaseRow({ item, onPress }: { item: Case; onPress: () => void }) {
  const { scheme, spacing, borderRadius: br, typography } = useTheme();
  const pc = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? scheme.surfaceVariant : scheme.surface,
        borderRadius: br.lg,
        padding: spacing.sm,
        marginBottom: spacing.xs,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        elevation: 1,
        boxShadow: "0px 1px 3px rgba(0,0,0,0.06)",
      })}
    >
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: pc.dot }} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
          <Text style={[typography.body.medium, { color: scheme.onSurface, fontWeight: "600", flex: 1 }]} numberOfLines={1}>
            {item.case_number ? `#${item.case_number}` : "Unassigned"}
          </Text>
          <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: pc.bg }}>
            <Text style={{ fontSize: 9, fontWeight: "700", color: pc.text, textTransform: "uppercase" }}>{item.priority}</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
          <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 3, backgroundColor: `${getStatusColor(item.status, scheme as any)}18` }}>
            <Text style={{ fontSize: 10, fontWeight: "600", color: getStatusColor(item.status, scheme as any) }}>
              {STATUS_LABELS[item.status] || item.status}
            </Text>
          </View>
          <Text style={{ fontSize: 10, color: scheme.onSurfaceVariant }} numberOfLines={1}>
            {item.assigned_officer?.full_name || "Unassigned"}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={scheme.onSurfaceVariant} />
    </Pressable>
  );
}

function TransitionModal({
  visible,
  transitions,
  onSelect,
  onClose,
}: {
  visible: boolean;
  transitions: AllowedTransition[];
  onSelect: (t: AllowedTransition) => void;
  onClose: () => void;
}) {
  const { scheme, spacing, borderRadius: br, typography } = useTheme();
  const [selected, setSelected] = useState<AllowedTransition | null>(null);
  const [note, setNote] = useState("");

  const handleConfirm = () => {
    if (selected) onSelect(selected);
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 24 }} onPress={onClose}>
        <Pressable style={{ backgroundColor: scheme.surface, borderRadius: br.xl, padding: spacing.lg, maxHeight: "80%" }} onPress={() => {}}>
          <Text style={[typography.title.medium, { color: scheme.onSurface, marginBottom: spacing.md }]}>Update Status</Text>
          <ScrollView style={{ maxHeight: 300 }}>
            {transitions.map((t) => (
              <Pressable
                key={t.status}
                onPress={() => {
                  setSelected(t);
                  setNote("");
                }}
                style={({ pressed }) => ({
                  padding: spacing.sm,
                  borderRadius: br.md,
                  backgroundColor: selected?.status === t.status ? scheme.primaryContainer : pressed ? scheme.surfaceVariant : "transparent",
                  marginBottom: spacing.xs,
                })}
              >
                <Text style={[typography.body.medium, { color: selected?.status === t.status ? scheme.onPrimaryContainer : scheme.onSurface, fontWeight: "600" }]}>
                  {t.label}
                </Text>
                {t.requires_note && <Text style={[typography.body.small, { color: scheme.onSurfaceVariant }]}>Requires note</Text>}
              </Pressable>
            ))}
          </ScrollView>
          {selected?.requires_note && (
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Transition note..."
              placeholderTextColor={scheme.onSurfaceVariant}
              multiline
              style={[typography.body.medium, { color: scheme.onSurface, backgroundColor: scheme.surfaceVariant, borderRadius: br.md, padding: spacing.sm, marginTop: spacing.sm, minHeight: 60, textAlignVertical: "top" }]}
            />
          )}
          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, marginTop: spacing.md }}>
            <Button title="Cancel" variant="text" onPress={onClose} />
            <Button title="Update Status" variant="filled" onPress={handleConfirm} disabled={!selected} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function AssignOfficerModal({
  visible,
  currentOfficerId,
  onAssign,
  onClose,
}: {
  visible: boolean;
  currentOfficerId?: string | null;
  onAssign: (officer: User) => void;
  onClose: () => void;
}) {
  const { scheme, spacing, borderRadius: br, typography } = useTheme();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-officers"],
    queryFn: () => usersApi.list({ role: "OFFICER" }),
    enabled: visible,
    staleTime: 60_000,
  });
  const officers = useMemo(() => (data?.results || []).filter((o) => o.is_active), [data?.results]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }} onPress={onClose}>
        <Pressable
          style={{ backgroundColor: scheme.surface, borderTopLeftRadius: br.xl, borderTopRightRadius: br.xl, padding: spacing.lg, maxHeight: "80%", minHeight: 300 }}
          onPress={() => {}}
        >
          <Text style={[typography.title.medium, { color: scheme.onSurface, marginBottom: spacing.sm }]}>Assign Officer</Text>
          <Text style={[typography.body.small, { color: scheme.onSurfaceVariant, marginBottom: spacing.md }]}>Choose an officer to handle this case</Text>
          {isLoading ? (
            <View style={{ padding: spacing.sm }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} width="100%" height={56} borderRadius={12} style={{ marginBottom: spacing.sm }} />
              ))}
            </View>
          ) : (
            <FlashList
              data={officers}
              keyExtractor={(o) => o.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => onAssign(item)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    padding: spacing.sm,
                    borderRadius: br.md,
                    backgroundColor: pressed ? scheme.surfaceVariant : "transparent",
                    marginBottom: spacing.xs,
                  })}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#D1FAE5", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#065F46" }}>
                      {item.full_name?.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase() || "?"}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text style={[typography.body.medium, { color: scheme.onSurface, fontWeight: "600" }]} numberOfLines={1}>{item.full_name}</Text>
                    <Text style={[typography.body.small, { color: scheme.onSurfaceVariant }]} numberOfLines={1}>{item.email}</Text>
                  </View>
                  {item.id === currentOfficerId && <Ionicons name="checkmark-circle" size={20} color={scheme.primary} />}
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant, textAlign: "center", paddingVertical: 40 }]}>
                  No officers available
                </Text>
              }
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PriorityModal({
  visible,
  current,
  onSelect,
  onClose,
}: {
  visible: boolean;
  current?: string;
  onSelect: (p: string) => void;
  onClose: () => void;
}) {
  const { scheme, spacing, borderRadius: br, typography } = useTheme();

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 24 }} onPress={onClose}>
        <Pressable style={{ backgroundColor: scheme.surface, borderRadius: br.xl, padding: spacing.lg }} onPress={() => {}}>
          <Text style={[typography.title.medium, { color: scheme.onSurface, marginBottom: spacing.md }]}>Change Priority</Text>
          {PRIORITIES.map((p) => {
            const pc = PRIORITY_COLORS[p];
            const selected = p === current;
            return (
              <Pressable
                key={p}
                onPress={() => onSelect(p)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  padding: spacing.sm,
                  borderRadius: br.md,
                  backgroundColor: selected ? `${pc.bg}` : pressed ? scheme.surfaceVariant : "transparent",
                  marginBottom: spacing.xs,
                })}
              >
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: pc.dot }} />
                <Text style={[typography.body.medium, { color: scheme.onSurface, fontWeight: "600", textTransform: "capitalize", marginLeft: spacing.sm, flex: 1 }]}>{p}</Text>
                {selected && <Ionicons name="checkmark-circle" size={20} color={pc.dot} />}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value?: ReactNode }) {
  const { scheme, typography } = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[typography.label.large, { color: scheme.onSurfaceVariant }]}>{label}</Text>
      <Text style={[typography.body.medium, { color: scheme.onSurface, marginTop: 2 }]}>{value || "—"}</Text>
    </View>
  );
}

function NoteItem({ note }: { note: CaseNote }) {
  const { scheme, spacing, typography } = useTheme();
  return (
    <View style={{ marginBottom: 12, padding: spacing.sm, borderRadius: 12, backgroundColor: scheme.surfaceVariant }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={[typography.label.large, { color: scheme.onSurface, fontWeight: "600" }]} numberOfLines={1}>
          {note.author_name || "Unknown"}
        </Text>
        {note.is_internal && (
          <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: "#FEF3C7" }}>
            <Text style={{ fontSize: 9, fontWeight: "700", color: "#92400E" }}>INTERNAL</Text>
          </View>
        )}
      </View>
      <Text style={[typography.body.medium, { color: scheme.onSurface, marginTop: 4 }]}>{note.note_text}</Text>
      <Text style={[typography.label.small, { color: scheme.onSurfaceVariant, marginTop: 6 }]}>
        {new Date(note.created_at).toLocaleString()}
      </Text>
    </View>
  );
}

export default function CaseOversightScreen() {
  const { scheme, spacing, borderRadius: br, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transitionOpen, setTransitionOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [snackbar, setSnackbar] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const queryParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (search.trim()) p.search = search.trim();
    return p;
  }, [search]);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-cases", queryParams],
    queryFn: () => casesApi.list(queryParams),
    staleTime: 30_000,
  });

  const cases = useMemo(() => data?.results || [], [data?.results]);

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["admin-case-detail", selectedId],
    queryFn: () => casesApi.get(selectedId!),
    enabled: !!selectedId,
    staleTime: 15_000,
  });

  const { data: allowedTransitions } = useQuery({
    queryKey: ["admin-allowed-transitions", selectedId],
    queryFn: () => casesApi.allowedTransitions(selectedId!),
    enabled: !!selectedId,
    staleTime: 60_000,
  });

  const refreshCases = () => queryClient.invalidateQueries({ queryKey: ["admin-cases"] });

  const assignMutation = useMutation({
    mutationFn: (officerId: string) => casesApi.assign(selectedId!, officerId),
    onSuccess: () => {
      refreshCases();
      queryClient.invalidateQueries({ queryKey: ["admin-case-detail", selectedId] });
      setAssignOpen(false);
      setSnackbar({ message: "Case assigned to officer", type: "success" });
    },
    onError: () => setSnackbar({ message: "Failed to assign officer", type: "error" }),
  });

  const unassignMutation = useMutation({
    mutationFn: () => casesApi.unassign(selectedId!),
    onSuccess: () => {
      refreshCases();
      queryClient.invalidateQueries({ queryKey: ["admin-case-detail", selectedId] });
      setSnackbar({ message: "Case unassigned", type: "success" });
    },
    onError: () => setSnackbar({ message: "Failed to unassign", type: "error" }),
  });

  const transitionMutation = useMutation({
    mutationFn: ({ status, note }: { status: string; note?: string }) => casesApi.transition(selectedId!, status, note),
    onSuccess: () => {
      refreshCases();
      queryClient.invalidateQueries({ queryKey: ["admin-case-detail", selectedId] });
      setTransitionOpen(false);
      setSnackbar({ message: "Case status updated", type: "success" });
    },
    onError: () => setSnackbar({ message: "Failed to update status", type: "error" }),
  });

  const priorityMutation = useMutation({
    mutationFn: (priority: string) => casesApi.overwritePriority(selectedId!, priority),
    onSuccess: () => {
      refreshCases();
      queryClient.invalidateQueries({ queryKey: ["admin-case-detail", selectedId] });
      setPriorityOpen(false);
      setSnackbar({ message: "Case priority updated", type: "success" });
    },
    onError: () => setSnackbar({ message: "Failed to update priority", type: "error" }),
  });

  const noteMutation = useMutation({
    mutationFn: (text: string) => casesApi.addNote(selectedId!, text, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-case-detail", selectedId] });
      setNoteText("");
      setSnackbar({ message: "Note added", type: "success" });
    },
    onError: () => setSnackbar({ message: "Failed to add note", type: "error" }),
  });

  const handleTransitionSelect = useCallback(
    (t: AllowedTransition) => {
      Alert.alert("Confirm Status Update", `Move case to "${t.label}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", style: "destructive", onPress: () => transitionMutation.mutate({ status: t.status }) },
      ]);
    },
    [transitionMutation],
  );

  const handleAssign = useCallback(
    (officer: User) => {
      Alert.alert("Assign Officer", `Assign this case to ${officer.full_name}?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Assign", onPress: () => assignMutation.mutate(officer.id) },
      ]);
    },
    [assignMutation],
  );

  const handleUnassign = useCallback(() => {
    Alert.alert("Unassign Case", "Remove the currently assigned officer?", [
      { text: "Cancel", style: "cancel" },
      { text: "Unassign", style: "destructive", onPress: () => unassignMutation.mutate() },
    ]);
  }, [unassignMutation]);

  const handleAddNote = useCallback(() => {
    const text = noteText.trim();
    if (!text) return;
    noteMutation.mutate(text);
  }, [noteText, noteMutation]);

  const report = detail?.report;

  const renderChip = (status: string) => {
    const color = getStatusColor(status, scheme as any);
    return (
      <View style={{ alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: `${color}18` }}>
        <Text style={{ fontSize: 11, fontWeight: "700", color }}>{STATUS_LABELS[status] || status}</Text>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: scheme.background }}>
      <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
        <Text style={[typography.headline.small, { color: scheme.onBackground }]}>Case Oversight</Text>
        <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant, marginBottom: spacing.md }]}>View, assign, and manage all cases</Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: scheme.surfaceVariant, borderRadius: 12, paddingHorizontal: 12 }}>
            <Ionicons name="search" size={18} color={scheme.onSurfaceVariant} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search cases..."
              placeholderTextColor={scheme.onSurfaceVariant}
              style={[typography.body.medium, { color: scheme.onSurface, flex: 1, paddingVertical: 10, marginLeft: 8 }]}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}><Ionicons name="close-circle" size={18} color={scheme.onSurfaceVariant} /></Pressable>
            )}
          </View>
        </View>

        <Text style={[typography.body.small, { color: scheme.onSurfaceVariant, marginTop: spacing.sm }]}>
          {data?.count != null ? `${data.count} case${data.count !== 1 ? "s" : ""}` : ""}
        </Text>
      </View>

      {isLoading ? (
        <View style={{ padding: spacing.md }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} width="100%" height={64} borderRadius={12} style={{ marginBottom: spacing.sm }} />
          ))}
        </View>
      ) : (
        <FlashList
          data={cases}
          renderItem={({ item }: any) => <CaseRow item={item} onPress={() => setSelectedId(item.id)} />}
          keyExtractor={(item: Case) => item.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 100 }}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <Ionicons name="folder-open-outline" size={48} color={scheme.outlineVariant} />
              <Text style={[typography.body.large, { color: scheme.onSurfaceVariant, marginTop: 16 }]}>
                {search ? "No cases match search" : "No cases found"}
              </Text>
            </View>
          }
        />
      )}

      {selectedId && (
        <Modal transparent animationType="slide" onRequestClose={() => setSelectedId(null)} statusBarTranslucent>
          <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }} onPress={() => setSelectedId(null)}>
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
                      {report?.case_number ? `Case #${report.case_number}` : "Case"}
                    </Text>
                    <Pressable onPress={() => setSelectedId(null)} style={{ padding: spacing.xs }}>
                      <Ionicons name="close" size={24} color={scheme.onSurfaceVariant} />
                    </Pressable>
                  </View>

                  <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap", marginTop: spacing.sm }}>
                    {renderChip(detail.status)}
                    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: (PRIORITY_COLORS[detail.priority] || PRIORITY_COLORS.medium).bg }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", textTransform: "uppercase", color: (PRIORITY_COLORS[detail.priority] || PRIORITY_COLORS.medium).text }}>
                        {detail.priority}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
                    <Button title="Assign" variant="filled" onPress={() => setAssignOpen(true)} style={{ flex: 1 }} />
                    <Button title="Unassign" variant="outlined" onPress={handleUnassign} style={{ flex: 1 }} disabled={!detail.assigned_officer} />
                  </View>
                  <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
                    <Button title="Status" variant="outlined" onPress={() => setTransitionOpen(true)} style={{ flex: 1 }} />
                    <Button title="Priority" variant="outlined" onPress={() => setPriorityOpen(true)} style={{ flex: 1 }} />
                  </View>

                  <Divider style={{ marginVertical: spacing.lg }} />

                  <Text style={[typography.title.small, { color: scheme.onSurface, marginBottom: spacing.md }]}>Report</Text>
                  <DetailRow label="Category" value={report?.category?.name} />
                  <DetailRow label="Incident Date" value={report?.incident_date ? new Date(report.incident_date).toLocaleDateString() : undefined} />
                  <DetailRow label="Campus" value={report?.campus} />
                  <DetailRow label="Department" value={report?.department} />
                  <DetailRow label="Location" value={report?.location_text} />
                  <DetailRow label="Description" value={report?.description} />
                  {report?.reporter_info && (report.reporter_info.full_name || report.reporter_info.reporter_code) && (
                    <DetailRow label="Reporter" value={report.reporter_info.full_name || `Anonymous (${report.reporter_info.reporter_code})`} />
                  )}

                  <Divider style={{ marginVertical: spacing.lg }} />

                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md }}>
                    <Text style={[typography.title.small, { color: scheme.onSurface }]}>Follow-up Notes</Text>
                    <Text style={[typography.label.small, { color: scheme.onSurfaceVariant }]}>{detail.notes?.length || 0} notes</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md }}>
                    <TextInput
                      value={noteText}
                      onChangeText={setNoteText}
                      placeholder="Add a follow-up note..."
                      placeholderTextColor={scheme.onSurfaceVariant}
                      multiline
                      style={[typography.body.medium, { color: scheme.onSurface, backgroundColor: scheme.surfaceVariant, borderRadius: br.md, padding: spacing.sm, flex: 1, minHeight: 44, maxHeight: 90, textAlignVertical: "top" }]}
                    />
                    <Pressable
                      onPress={handleAddNote}
                      disabled={!noteText.trim() || noteMutation.isPending}
                      style={{ padding: spacing.sm, borderRadius: 12, backgroundColor: noteText.trim() ? scheme.primary : scheme.surfaceVariant }}
                    >
                      <Ionicons name="send" size={18} color={noteText.trim() ? scheme.onPrimary : scheme.onSurfaceVariant} />
                    </Pressable>
                  </View>
                  {(detail.notes || []).length === 0 ? (
                    <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant, textAlign: "center", paddingVertical: 24 }]}>
                      No notes yet
                    </Text>
                  ) : (
                    (detail.notes as CaseNote[]).map((n) => <NoteItem key={n.id} note={n} />)
                  )}
                </ScrollView>
              )}
            </Pressable>
          </Pressable>
        </Modal>
      )}

      <TransitionModal
        visible={transitionOpen && !!selectedId}
        transitions={allowedTransitions || []}
        onSelect={handleTransitionSelect}
        onClose={() => setTransitionOpen(false)}
      />
      <AssignOfficerModal
        visible={assignOpen && !!selectedId}
        currentOfficerId={detail?.assigned_officer?.id}
        onAssign={handleAssign}
        onClose={() => setAssignOpen(false)}
      />
      <PriorityModal
        visible={priorityOpen && !!selectedId}
        current={detail?.priority}
        onSelect={(p) => priorityMutation.mutate(p)}
        onClose={() => setPriorityOpen(false)}
      />

      <Snackbar visible={!!snackbar} message={snackbar?.message || ""} type={snackbar?.type || "info"} onDismiss={() => setSnackbar(null)} duration={3000} />
    </View>
  );
}

const styles = StyleSheet.create({});