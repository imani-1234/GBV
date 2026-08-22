import { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  Linking,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useTheme } from "../../../src/theme/ThemeProvider";
import {
  Card,
  Chip,
  Divider,
  Button,
  Skeleton,
  Snackbar,
} from "../../../src/components/ui";
import { casesApi } from "../../../src/api/cases";
import { haptics } from "../../../src/utils/haptics";
import type { AllowedTransition } from "../../../src/api/cases";
import type { Case, CaseNote, Evidence, InformationRequest } from "../../../src/types";

const PRIORITY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  critical: { bg: "#FEE2E2", text: "#991B1B", dot: "#DC2626" },
  high: { bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
  medium: { bg: "#DBEAFE", text: "#1E40AF", dot: "#3B82F6" },
  low: { bg: "#D1FAE5", text: "#065F46", dot: "#10B981" },
};

const PRIORITY_OPTIONS = [
  { key: "low", label: "Low" },
  { key: "medium", label: "Medium" },
  { key: "high", label: "High" },
  { key: "critical", label: "Critical" },
];

function getStatusLabel(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getStatusColor(status: string, scheme: Record<string, string>): string {
  const active = ["PENDING_REVIEW", "ASSIGNED", "UNDER_REVIEW", "AWAITING_REPORTER_RESPONSE", "UNDER_INVESTIGATION"];
  const resolved = ["RESOLVED", "CLOSED"];
  if (active.includes(status)) return scheme.primary;
  if (resolved.includes(status)) return scheme.success;
  return scheme.onSurfaceVariant;
}

function UnauthorizedScreen() {
  const { scheme, typography } = useTheme();
  const router = useRouter();
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: scheme.background,
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
      }}
      edges={["top"]}
    >
      <Ionicons name="lock-closed" size={48} color={scheme.error} />
      <Text
        style={[
          typography.title.large,
          { color: scheme.onBackground, marginTop: 16, textAlign: "center" },
        ]}
      >
        Not Authorized
      </Text>
      <Text
        style={[
          typography.body.medium,
          { color: scheme.onSurfaceVariant, marginTop: 8, textAlign: "center" },
        ]}
      >
        You do not have permission to view this case. It may be assigned to another officer or
        restricted by your role.
      </Text>
      <Button
        title="Back to Dashboard"
        onPress={() => router.replace("/(officer)")}
        variant="filled"
        style={{ marginTop: 24 }}
      />
    </SafeAreaView>
  );
}

function CaseSkeleton() {
  const { scheme } = useTheme();
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: scheme.background }}
      edges={["top"]}
    >
      <View style={{ padding: 24 }}>
        <Skeleton width={40} height={24} />
        <Skeleton width="60%" height={28} style={{ marginTop: 16 }} />
        <Skeleton width="100%" height={120} borderRadius={16} style={{ marginTop: 16 }} />
        <Skeleton width="100%" height={80} borderRadius={16} style={{ marginTop: 12 }} />
        <Skeleton width="100%" height={160} borderRadius={16} style={{ marginTop: 12 }} />
      </View>
    </SafeAreaView>
  );
}

function EvidenceItem({ evidence }: { evidence: Evidence }) {
  const { scheme, spacing, borderRadius: br, typography } = useTheme();
  const isImage = evidence.file_type?.startsWith("image");
  const isVideo = evidence.file_type?.startsWith("video");
  const isPdf = evidence.file_type === "application/pdf";

  const handleOpen = useCallback(async () => {
    try {
      const supported = await Linking.canOpenURL(evidence.file);
      if (supported) {
        await Linking.openURL(evidence.file);
      } else {
        Alert.alert("Cannot Open", "Unable to open this file type.");
      }
    } catch {
      Alert.alert("Error", "Failed to open file.");
    }
  }, [evidence.file]);

  return (
    <Pressable
      onPress={handleOpen}
      style={({ pressed }) => [
        {
          backgroundColor: scheme.surfaceVariant,
          borderRadius: br.md,
          padding: spacing.sm,
          opacity: pressed ? 0.85 : 1,
          marginBottom: spacing.xs,
        },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        {isImage ? (
          <Image
            source={{ uri: evidence.file }}
            style={{ width: 48, height: 48, borderRadius: br.sm }}
            contentFit="cover"
          />
        ) : isVideo ? (
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: br.sm,
              backgroundColor: "#1C1B1F20",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="videocam" size={22} color={scheme.onSurfaceVariant} />
          </View>
        ) : (
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: br.sm,
              backgroundColor: scheme.errorContainer,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={isPdf ? "document-text" : "document-outline"}
              size={22}
              color={scheme.onErrorContainer}
            />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[typography.body.medium, { color: scheme.onSurface }]} numberOfLines={1}>
            {evidence.file?.split("/").pop() || "File"}
          </Text>
          <Text style={[typography.body.small, { color: scheme.onSurfaceVariant }]}>
            {evidence.file_type || "Unknown type"}
          </Text>
        </View>
        <Ionicons name="open-outline" size={16} color={scheme.primary} />
      </View>
    </Pressable>
  );
}

function InfoRequestItem({ request }: { request: InformationRequest }) {
  const { scheme, spacing, borderRadius: br, typography } = useTheme();
  return (
    <Card
      variant={request.status === "FULFILLED" ? "filled" : "outlined"}
      padding="sm"
      style={{ marginBottom: spacing.sm }}
    >
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Ionicons
          name={request.status === "FULFILLED" ? "checkmark-circle" : "help-circle"}
          size={20}
          color={request.status === "FULFILLED" ? scheme.success : scheme.warning}
        />
        <View style={{ flex: 1 }}>
          <Text style={[typography.body.medium, { color: scheme.onSurface, fontWeight: "600" }]}>
            {request.request_text}
          </Text>
          <Text
            style={[
              typography.body.small,
              { color: scheme.onSurfaceVariant, marginTop: 4 },
            ]}
          >
            {request.status === "FULFILLED"
              ? `Response: ${request.reporter_response || ""}`
              : "Awaiting reporter response"}
          </Text>
          <Text style={[typography.label.small, { color: scheme.onSurfaceVariant, marginTop: 4 }]}>
            {new Date(request.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </Text>
        </View>
      </View>
    </Card>
  );
}

function PriorityPicker({
  current,
  onSelect,
  onClose,
}: {
  current: string;
  onSelect: (p: string) => void;
  onClose: () => void;
}) {
  const { scheme, spacing, borderRadius: br, typography } = useTheme();
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 32 }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: scheme.surface,
            borderRadius: br.xl,
            padding: spacing.lg,
          }}
          onPress={() => {}}
        >
          <Text style={[typography.title.medium, { color: scheme.onSurface, marginBottom: spacing.md }]}>
            Override Priority
          </Text>
          {PRIORITY_OPTIONS.map((opt) => {
            const colors = PRIORITY_COLORS[opt.key];
            const selected = current === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => onSelect(opt.key)}
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                    borderRadius: br.md,
                    backgroundColor: selected ? `${colors.dot}15` : "transparent",
                    opacity: pressed ? 0.7 : 1,
                    marginBottom: spacing.xs,
                  },
                ]}
              >
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: colors.dot,
                    marginRight: spacing.sm,
                  }}
                />
                <Text
                  style={[
                    typography.body.large,
                    {
                      color: selected ? colors.text : scheme.onSurface,
                      fontWeight: selected ? "700" : "400",
                    },
                  ]}
                >
                  {opt.label}
                </Text>
                {selected && (
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={colors.dot}
                    style={{ marginLeft: "auto" }}
                  />
                )}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function OfficerCaseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { scheme, spacing, borderRadius: br, typography } = useTheme();
  const queryClient = useQueryClient();

  const [noteText, setNoteText] = useState("");
  const [noteInternal, setNoteInternal] = useState(true);
  const [infoRequestText, setInfoRequestText] = useState("");
  const [infoRequestOpen, setInfoRequestOpen] = useState(false);
  const [priorityPickerOpen, setPriorityPickerOpen] = useState(false);
  const [transitionModalOpen, setTransitionModalOpen] = useState(false);
  const [transitionNote, setTransitionNote] = useState("");
  const [selectedTransition, setSelectedTransition] = useState<AllowedTransition | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const {
    data: caseData,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["officer-case", id],
    queryFn: () => casesApi.get(id!),
    enabled: !!id,
  });

  const { data: allowedTransitions } = useQuery({
    queryKey: ["allowed-transitions", id],
    queryFn: () => casesApi.allowedTransitions(id!),
    enabled: !!id,
  });

  const transitionMutation = useMutation({
    mutationFn: ({ newStatus, note }: { newStatus: string; note?: string }) =>
      casesApi.transition(id!, newStatus, note),
    onMutate: async ({ newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ["officer-case", id] });
      const prev = queryClient.getQueryData(["officer-case", id]);
      queryClient.setQueryData(["officer-case", id], (old: Case | undefined) =>
        old ? { ...old, status: newStatus as Case["status"] } : old,
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["officer-case", id], context.prev);
      }
      setSnackbar({ message: "Status transition failed. Reverted.", type: "error" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["officer-case", id] });
      queryClient.invalidateQueries({ queryKey: ["allowed-transitions", id] });
      queryClient.invalidateQueries({ queryKey: ["officer-cases"] });
      queryClient.invalidateQueries({ queryKey: ["officer-stats"] });
    },
  });

  const noteMutation = useMutation({
    mutationFn: ({ text, isInternal }: { text: string; isInternal: boolean }) =>
      casesApi.addNote(id!, text, isInternal),
    onMutate: async ({ text, isInternal }) => {
      await queryClient.cancelQueries({ queryKey: ["officer-case", id] });
      const prev = queryClient.getQueryData(["officer-case", id]);
      const tempNote: CaseNote = {
        id: `temp-${Date.now()}`,
        case: id!,
        author: null,
        note_text: text,
        is_internal: isInternal,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData(["officer-case", id], (old: Case | undefined) =>
        old ? { ...old, notes: [...(old.notes || []), tempNote] } : old,
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["officer-case", id], context.prev);
      }
      setSnackbar({ message: "Failed to save note.", type: "error" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["officer-case", id] });
      setNoteText("");
    },
  });

  const priorityMutation = useMutation({
    mutationFn: (priority: string) => casesApi.overwritePriority(id!, priority),
    onMutate: async (priority) => {
      await queryClient.cancelQueries({ queryKey: ["officer-case", id] });
      const prev = queryClient.getQueryData(["officer-case", id]);
      queryClient.setQueryData(["officer-case", id], (old: Case | undefined) =>
        old ? { ...old, priority } : old,
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        queryClient.setQueryData(["officer-case", id], context.prev);
      }
      setSnackbar({ message: "Failed to update priority.", type: "error" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["officer-case", id] });
      setPriorityPickerOpen(false);
    },
  });

  const infoRequestMutation = useMutation({
    mutationFn: (question: string) => casesApi.requestInformation(id!, question),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["officer-case", id] });
      setInfoRequestText("");
      setInfoRequestOpen(false);
      setSnackbar({ message: "Information request sent to reporter.", type: "success" });
    },
    onError: () => {
      setSnackbar({ message: "Failed to send information request.", type: "error" });
    },
  });

  const handleTransition = useCallback(
    (transition: AllowedTransition) => {
      if (transition.requires_note) {
        setSelectedTransition(transition);
        setTransitionNote("");
        setTransitionModalOpen(true);
      } else {
        haptics.medium();
        transitionMutation.mutate({ newStatus: transition.status });
        setSnackbar({
          message: `Case moved to ${transition.label}`,
          type: "success",
        });
      }
    },
    [transitionMutation],
  );

  const confirmTransitionWithNote = useCallback(() => {
    if (!selectedTransition) return;
    haptics.medium();
    transitionMutation.mutate({
      newStatus: selectedTransition.status,
      note: transitionNote || undefined,
    });
    setTransitionModalOpen(false);
    setSelectedTransition(null);
    setTransitionNote("");
    setSnackbar({
      message: `Case moved to ${selectedTransition.label}`,
      type: "success",
    });
  }, [selectedTransition, transitionNote, transitionMutation]);

  const handlePrioritySelect = useCallback(
    (p: string) => {
      haptics.light();
      priorityMutation.mutate(p);
    },
    [priorityMutation],
  );

  const handleAddNote = useCallback(() => {
    const trimmed = noteText.trim();
    if (!trimmed) return;
    noteMutation.mutate({ text: trimmed, isInternal: noteInternal });
  }, [noteText, noteInternal, noteMutation]);

  const handleRequestInfo = useCallback(() => {
    const trimmed = infoRequestText.trim();
    if (!trimmed) return;
    infoRequestMutation.mutate(trimmed);
  }, [infoRequestText, infoRequestMutation]);

  const c = caseData;

  if (isLoading) return <CaseSkeleton />;

  if (isError && (error as any)?.response?.status === 403) {
    return <UnauthorizedScreen />;
  }

  if (!c) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: scheme.background }} edges={["top"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 32 }}>
          <Ionicons name="alert-circle-outline" size={48} color={scheme.error} />
          <Text style={[typography.title.medium, { color: scheme.onBackground, marginTop: 16 }]}>
            Case not found
          </Text>
          <Button
            title="Back"
            onPress={() => router.back()}
            variant="outlined"
            style={{ marginTop: 16 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const priorityColor = PRIORITY_COLORS[c.priority] || PRIORITY_COLORS.medium;
  const statusColor = getStatusColor(c.status, scheme as any);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: scheme.background }}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshing={isRefetching}
        onRefresh={refetch}
      >
        <View style={{ padding: spacing.lg }}>
          {/* Back + Header */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.md }}>
            <Pressable
              onPress={() => router.back()}
              style={{ padding: 4, marginRight: spacing.sm }}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back" size={24} color={scheme.onBackground} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[typography.headline.small, { color: scheme.onBackground }]}>
                {c.report?.case_number ? `Case #${c.report.case_number}` : "Case Details"}
              </Text>
              <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant }]}>
                {c.report?.category?.name || "Incident Report"}
              </Text>
            </View>
            <Chip
              label={getStatusLabel(c.status)}
              variant="filter"
              selected
              onPress={() => {}}
            />
          </View>

          {/* Priority Badge */}
          <Card variant="filled" padding="md" style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <View
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: priorityColor.dot,
                  }}
                />
                <View>
                  <Text style={[typography.label.medium, { color: scheme.onSurfaceVariant }]}>Priority</Text>
                  <Text
                    style={[
                      typography.title.small,
                      { color: priorityColor.text, textTransform: "capitalize" },
                    ]}
                  >
                    {c.priority}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setPriorityPickerOpen(true)}
                style={({ pressed }) => ({
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: br.md,
                  backgroundColor: pressed ? scheme.surfaceVariant : "transparent",
                })}
              >
                <Text style={[typography.label.large, { color: scheme.primary }]}>Override</Text>
              </Pressable>
            </View>
          </Card>

          {/* Status Transitions */}
          {allowedTransitions && allowedTransitions.length > 0 && (
            <Card variant="filled" padding="md" style={{ marginBottom: spacing.sm }}>
              <Text style={[typography.title.small, { color: scheme.onSurface, marginBottom: spacing.sm }]}>
                Status Actions
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
                {allowedTransitions.map((t) => (
                  <Pressable
                    key={t.status}
                    onPress={() => handleTransition(t)}
                    disabled={transitionMutation.isPending}
                    style={({ pressed }) => ({
                      backgroundColor: scheme.primaryContainer,
                      borderRadius: br.lg,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      opacity: pressed ? 0.85 : transitionMutation.isPending ? 0.5 : 1,
                    })}
                  >
                    <Text
                      style={[
                        typography.label.large,
                        { color: scheme.onPrimaryContainer, fontWeight: "600" },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card>
          )}

          {/* Description */}
          <Card variant="filled" padding="md" style={{ marginBottom: spacing.sm }}>
            <Text style={[typography.label.medium, { color: scheme.onSurfaceVariant }]}>Description</Text>
            <Text style={[typography.body.large, { color: scheme.onSurface, marginTop: 4 }]}>
              {c.report?.description || "No description"}
            </Text>
          </Card>

          {/* Date & Location */}
          <Card variant="filled" padding="md" style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.label.medium, { color: scheme.onSurfaceVariant }]}>Date</Text>
                <Text style={[typography.body.medium, { color: scheme.onSurface, marginTop: 2 }]}>
                  {c.report?.incident_date
                    ? new Date(c.report.incident_date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "N/A"}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.label.medium, { color: scheme.onSurfaceVariant }]}>Location</Text>
                <Text style={[typography.body.medium, { color: scheme.onSurface, marginTop: 2 }]}>
                  {c.report?.campus || "N/A"}
                </Text>
                {c.report?.location_text && (
                  <Text style={[typography.body.small, { color: scheme.onSurfaceVariant, marginTop: 2 }]}>
                    {c.report.location_text}
                  </Text>
                )}
              </View>
            </View>
          </Card>

          {/* Assigned Officer */}
          <Card variant="filled" padding="md" style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={[typography.label.medium, { color: scheme.onSurfaceVariant }]}>
                  Assigned Officer
                </Text>
                <Text style={[typography.body.large, { color: scheme.onSurface, marginTop: 4 }]}>
                  {c.assigned_officer?.full_name || "Unassigned"}
                </Text>
              </View>
              {/* Only show assign for admin/unassigned pool */}
              {!c.assigned_officer && (
                <Pressable
                  style={({ pressed }) => ({
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: br.md,
                    backgroundColor: pressed ? scheme.surfaceVariant : "transparent",
                  })}
                >
                  <Text style={[typography.label.large, { color: scheme.primary }]}>Assign</Text>
                </Pressable>
              )}
            </View>
          </Card>

          <Divider style={{ marginVertical: spacing.sm }} />

          {/* Evidence Section */}
          {c.report?.evidence && c.report.evidence.length > 0 && (
            <View style={{ marginBottom: spacing.md }}>
              <Text
                style={[
                  typography.title.small,
                  { color: scheme.onSurface, marginBottom: spacing.sm },
                ]}
              >
                Evidence ({c.report.evidence.length})
              </Text>
              {c.report.evidence.map((ev) => (
                <EvidenceItem key={ev.id} evidence={ev} />
              ))}
            </View>
          )}

          {/* Internal Notes Section */}
          <View style={{ marginBottom: spacing.md }}>
            <Text
              style={[
                typography.title.small,
                { color: scheme.onSurface, marginBottom: spacing.sm },
              ]}
            >
              Internal Notes
            </Text>

            {(c.notes || []).length > 0 ? (
              <>
                {(c.notes || []).map((note) => (
                  <View
                    key={note.id}
                    style={{
                      backgroundColor: note.is_internal ? "#FEF9C3" : scheme.surfaceVariant,
                      borderRadius: br.md,
                      padding: spacing.sm,
                      marginBottom: spacing.xs,
                      borderLeftWidth: 3,
                      borderLeftColor: note.is_internal ? "#EAB308" : scheme.outlineVariant,
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text
                        style={[
                          typography.label.small,
                          { color: note.is_internal ? "#854D0E" : scheme.error, fontWeight: "700" },
                        ]}
                      >
                        {note.is_internal ? "INTERNAL" : "NOTE"}
                      </Text>
                      <Text style={[typography.label.small, { color: scheme.onSurfaceVariant }]}>
                        {note.created_at
                          ? new Date(note.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          : ""}
                      </Text>
                    </View>
                    <Text style={[typography.body.medium, { color: scheme.onSurface }]}>
                      {note.note_text}
                    </Text>
                    {note.author?.full_name && (
                      <Text style={[typography.label.small, { color: scheme.onSurfaceVariant, marginTop: 4 }]}>
                        — {note.author.full_name}
                      </Text>
                    )}
                  </View>
                ))}
              </>
            ) : (
              <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant, fontStyle: "italic" }]}>
                No notes yet
              </Text>
            )}

            {/* Add Note Composer */}
            <View
              style={{
                marginTop: spacing.sm,
                backgroundColor: scheme.surfaceVariant,
                borderRadius: br.md,
                padding: spacing.sm,
              }}
            >
              <TextInput
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Add a note..."
                placeholderTextColor={scheme.onSurfaceVariant}
                multiline
                style={[
                  typography.body.medium,
                  {
                    color: scheme.onSurface,
                    minHeight: 60,
                    maxHeight: 120,
                    textAlignVertical: "top",
                  },
                ]}
                accessibilityLabel="Note text"
              />
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: spacing.sm,
                }}
              >
                <Pressable
                  onPress={() => setNoteInternal(!noteInternal)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Ionicons
                    name={noteInternal ? "lock-closed" : "lock-open"}
                    size={14}
                    color={noteInternal ? "#EAB308" : scheme.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      typography.label.small,
                      { color: noteInternal ? "#854D0E" : scheme.onSurfaceVariant },
                    ]}
                  >
                    {noteInternal ? "Internal only" : "Not internal"}
                  </Text>
                </Pressable>
                <Button
                  title="Add Note"
                  onPress={handleAddNote}
                  size="sm"
                  disabled={!noteText.trim() || noteMutation.isPending}
                  loading={noteMutation.isPending}
                />
              </View>
            </View>
          </View>

          <Divider style={{ marginVertical: spacing.sm }} />

          {/* Information Requests */}
          <View style={{ marginBottom: spacing.md }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: spacing.sm,
              }}
            >
              <Text style={[typography.title.small, { color: scheme.onSurface }]}>
                Information Requests
              </Text>
              <Pressable
                onPress={() => setInfoRequestOpen(!infoRequestOpen)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Ionicons name="add-circle" size={18} color={scheme.primary} />
                <Text style={[typography.label.large, { color: scheme.primary }]}>New Request</Text>
              </Pressable>
            </View>

            {(c.information_requests || []).length > 0 ? (
              (c.information_requests || []).map((req) => (
                <InfoRequestItem key={req.id} request={req} />
              ))
            ) : (
              <Text
                style={[
                  typography.body.medium,
                  { color: scheme.onSurfaceVariant, fontStyle: "italic", marginBottom: spacing.sm },
                ]}
              >
                No information requests yet
              </Text>
            )}

            {infoRequestOpen && (
              <View
                style={{
                  marginTop: spacing.sm,
                  backgroundColor: scheme.surfaceVariant,
                  borderRadius: br.md,
                  padding: spacing.sm,
                }}
              >
                <TextInput
                  value={infoRequestText}
                  onChangeText={setInfoRequestText}
                  placeholder="What information do you need from the reporter?"
                  placeholderTextColor={scheme.onSurfaceVariant}
                  multiline
                  style={[
                    typography.body.medium,
                    {
                      color: scheme.onSurface,
                      minHeight: 60,
                      maxHeight: 120,
                      textAlignVertical: "top",
                    },
                  ]}
                  accessibilityLabel="Information request question"
                />
                <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: spacing.sm }}>
                  <Button
                    title="Cancel"
                    variant="text"
                    onPress={() => {
                      setInfoRequestOpen(false);
                      setInfoRequestText("");
                    }}
                    size="sm"
                  />
                  <Button
                    title="Send Request"
                    onPress={handleRequestInfo}
                    size="sm"
                    disabled={!infoRequestText.trim() || infoRequestMutation.isPending}
                    loading={infoRequestMutation.isPending}
                    style={{ marginLeft: spacing.sm }}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Chat Messages Entry */}
          <Pressable
            onPress={() => router.push(`/(officer)/cases/${id}/messages`)}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: scheme.secondaryContainer,
                borderRadius: br.xl,
                padding: 18,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Ionicons name="chatbubble-ellipses" size={24} color={scheme.onSecondaryContainer} />
            <View style={{ marginLeft: spacing.md, flex: 1 }}>
              <Text style={[typography.title.small, { color: scheme.onSecondaryContainer }]}>
                Case Messages
              </Text>
              <Text
                style={[
                  typography.body.small,
                  { color: scheme.onSecondaryContainer, opacity: 0.8 },
                ]}
              >
                Communicate securely with the reporter
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={scheme.onSecondaryContainer} />
          </Pressable>
        </View>
      </ScrollView>

      {/* Transition Note Modal */}
      <Modal transparent animationType="fade" visible={transitionModalOpen} onRequestClose={() => setTransitionModalOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 32 }}
          onPress={() => setTransitionModalOpen(false)}
        >
          <Pressable
            style={{
              backgroundColor: scheme.surface,
              borderRadius: br.xl,
              padding: spacing.lg,
            }}
            onPress={() => {}}
          >
            <Text style={[typography.title.medium, { color: scheme.onSurface }]}>
              {selectedTransition?.label || "Transition"}
            </Text>
            {selectedTransition?.note_label && (
              <Text
                style={[
                  typography.body.medium,
                  { color: scheme.onSurfaceVariant, marginTop: spacing.sm },
                ]}
              >
                {selectedTransition.note_label}
              </Text>
            )}
            <TextInput
              value={transitionNote}
              onChangeText={setTransitionNote}
              placeholder={selectedTransition?.note_label || "Add a note (optional)..."}
              placeholderTextColor={scheme.onSurfaceVariant}
              multiline
              style={[
                typography.body.medium,
                {
                  color: scheme.onSurface,
                  backgroundColor: scheme.surfaceVariant,
                  borderRadius: br.md,
                  padding: spacing.sm,
                  marginTop: spacing.md,
                  minHeight: 80,
                  textAlignVertical: "top",
                },
              ]}
              accessibilityLabel="Transition note"
            />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, marginTop: spacing.md }}>
              <Button
                title="Cancel"
                variant="text"
                onPress={() => setTransitionModalOpen(false)}
              />
              <Button
                title="Confirm"
                variant="filled"
                onPress={confirmTransitionWithNote}
                loading={transitionMutation.isPending}
                disabled={transitionMutation.isPending}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Priority Picker Modal */}
      {priorityPickerOpen && (
        <PriorityPicker
          current={c.priority}
          onSelect={handlePrioritySelect}
          onClose={() => setPriorityPickerOpen(false)}
        />
      )}

      {/* Snackbar */}
      <Snackbar
        visible={!!snackbar}
        message={snackbar?.message || ""}
        type={snackbar?.type || "info"}
        onDismiss={() => setSnackbar(null)}
        duration={3000}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 40 },
  back: { marginBottom: 16, alignSelf: "flex-start" },
});
