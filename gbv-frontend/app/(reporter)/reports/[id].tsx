import { View, Text, Pressable, ScrollView, StyleSheet, Image } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { Button, Card, Chip, Divider, Skeleton, StatusTimeline } from "../../../src/components/ui";
import { reportsApi } from "../../../src/api/reports";
import { casesApi } from "../../../src/api/cases";
import type { Case, CaseStatus, Evidence } from "../../../src/types";

const TIMELINE_STEPS = [
  { status: "submitted", label: "Report Submitted" },
  { status: "PENDING_REVIEW", label: "Pending Review" },
  { status: "ASSIGNED", label: "Assigned to Officer" },
  { status: "UNDER_REVIEW", label: "Under Review" },
  { status: "AWAITING_REPORTER_RESPONSE", label: "Awaiting Your Response" },
  { status: "UNDER_INVESTIGATION", label: "Under Investigation" },
  { status: "RESOLVED", label: "Resolved" },
  { status: "CLOSED", label: "Closed" },
];

function getFileTypeIcon(fileType?: string | null): keyof typeof Ionicons.glyphMap {
  const normalized = typeof fileType === "string" ? fileType.toLowerCase() : "";
  if (normalized.startsWith("image")) return "image-outline";
  if (normalized.startsWith("video")) return "videocam-outline";
  if (normalized.startsWith("audio")) return "mic-outline";
  if (normalized.includes("pdf")) return "document-outline";
  return "document-outline";
}

export default function ReportDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { scheme, spacing, borderRadius, typography } = useTheme();

  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ["report", id],
    queryFn: () => reportsApi.get(id!),
    enabled: !!id,
  });

  const { data: caseData, isLoading: caseLoading } = useQuery({
    queryKey: ["case-by-report", id],
    queryFn: () => casesApi.list({ report_id: id! }).then((r) => r.results[0] ?? null),
    enabled: !!id,
  });

  const isLoading = reportLoading || caseLoading;

  if (isLoading || !report) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: scheme.background }]} edges={["top"]}>
        <View style={{ padding: 24 }}>
          <Skeleton width="60%" height={28} borderRadius={borderRadius.sm} />
          <Skeleton width="100%" height={120} borderRadius={borderRadius.xl} style={{ marginTop: 16 }} />
          <Skeleton width="100%" height={200} borderRadius={borderRadius.lg} style={{ marginTop: 16 }} />
        </View>
      </SafeAreaView>
    );
  }

  const c = caseData;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: scheme.background }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={scheme.onBackground} />
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.headline.small, { color: scheme.onBackground }]}>
              {report.category?.name || "Incident Report"}
            </Text>
            {report.case_number && (
              <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant }]}>
                Case #{report.case_number}
              </Text>
            )}
          </View>
          <Chip label={String(report.status || "unknown").replace(/_/g, " ")} variant="filter" selected onPress={() => {}} />
        </View>

        {c && (
          <Card variant="filled" padding="md" style={{ marginBottom: spacing.md }}>
            <Text style={[typography.title.small, { color: scheme.onSurface, marginBottom: spacing.md }]}>Case Progress</Text>
            <StatusTimeline
              steps={TIMELINE_STEPS.map((s) => ({
                ...s,
                date: c.status === s.status ? new Date(c.updated_at || c.created_at).toLocaleDateString() : undefined,
              }))}
              currentStatus={c.status}
            />
          </Card>
        )}

        <Card variant="outlined" padding="md" style={{ marginBottom: spacing.md }}>
          <Text style={[typography.title.small, { color: scheme.onSurface, marginBottom: spacing.sm }]}>Incident Details</Text>
          <View style={{ gap: 12 }}>
            <View>
              <Text style={[typography.label.medium, { color: scheme.onSurfaceVariant }]}>Description</Text>
              <Text style={[typography.body.medium, { color: scheme.onSurface, marginTop: 2 }]}>{report.description || "No description provided"}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.label.medium, { color: scheme.onSurfaceVariant }]}>Date</Text>
                <Text style={[typography.body.medium, { color: scheme.onSurface, marginTop: 2 }]}>{new Date(report.incident_date).toLocaleDateString()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.label.medium, { color: scheme.onSurfaceVariant }]}>Location</Text>
                <Text style={[typography.body.medium, { color: scheme.onSurface, marginTop: 2 }]}>{report.location_text || report.campus || "Not specified"}</Text>
              </View>
            </View>
          </View>
        </Card>

        {report.evidence && report.evidence.length > 0 && (
          <Card variant="outlined" padding="md" style={{ marginBottom: spacing.md }}>
            <Text style={[typography.title.small, { color: scheme.onSurface, marginBottom: spacing.sm }]}>Evidence ({report.evidence.length})</Text>
            <View style={{ gap: 8 }}>
              {report.evidence.map((ev: Evidence) => (
                <View key={ev.id} style={[styles.evidenceItem, { backgroundColor: scheme.surfaceVariant, borderRadius: borderRadius.md }]}>
                  <Ionicons name={getFileTypeIcon(ev.file_type)} size={20} color={scheme.onSurfaceVariant} />
                  <Text style={[typography.body.medium, { color: scheme.onSurface, marginLeft: 8, flex: 1 }]} numberOfLines={1}>
                    {typeof ev.file === "string" ? ev.file.split("/").pop() || "Attachment" : "Attachment"}
                  </Text>
                  <Text style={[typography.label.small, { color: scheme.onSurfaceVariant }]}>
                    {new Date(ev.created_at).toLocaleDateString()}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        <Divider />

        <Pressable
          onPress={() => router.push(`/messages?caseId=${c?.id || id}`)}
          style={[styles.messagesEntry, { backgroundColor: scheme.primaryContainer, borderRadius: borderRadius.xl }]}
        >
          <Ionicons name="chatbubble-ellipses" size={24} color={scheme.onPrimaryContainer} />
          <View style={{ marginLeft: spacing.md, flex: 1 }}>
            <Text style={[typography.title.small, { color: scheme.onPrimaryContainer }]}>Case Messages</Text>
            <Text style={[typography.body.small, { color: scheme.onPrimaryContainer, opacity: 0.8 }]}>
              Communicate securely with your assigned officer
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={scheme.onPrimaryContainer} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 40 },
  back: { marginBottom: 16, alignSelf: "flex-start" },
  evidenceItem: { flexDirection: "row", alignItems: "center", padding: 12 },
  messagesEntry: { flexDirection: "row", alignItems: "center", padding: 18, marginTop: 8 },
});
