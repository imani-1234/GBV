import { useCallback, useMemo } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { casesApi } from "../../src/api/cases";
import type { Case } from "../../src/types";

const priorityStyle: Record<string, { color: string; soft: string; label: string }> = {
  critical: { color: "#A43E5C", soft: "#FFF0F4", label: "Critical" },
  high: { color: "#A76A11", soft: "#FFF7E7", label: "High" },
  medium: { color: "#7C3CB0", soft: "#F4E8FF", label: "Medium" },
  low: { color: "#2C755A", soft: "#ECF8F0", label: "Low" },
};

function statusLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function OfficerMetric({ icon, value, label, tone = "purple", onPress }: { icon: keyof typeof Ionicons.glyphMap; value: number; label: string; tone?: "purple" | "rose" | "amber" | "blue"; onPress?: () => void }) {
  const colors = {
    purple: ["#813BBC", "#F1E2FD"],
    rose: ["#B14C68", "#FFF0F4"],
    amber: ["#AD7010", "#FFF7E8"],
    blue: ["#3979D5", "#EDF3FF"],
  } as const;
  const [color, soft] = colors[tone];
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.metric, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={`${label}: ${value}`}><View style={[styles.metricIcon, { backgroundColor: soft }]}><Ionicons name={icon} size={19} color={color} /></View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></Pressable>;
}

function PriorityOverview({ byPriority }: { byPriority: Record<string, number> }) {
  return <View style={styles.priorityCard}><Text style={styles.cardEyebrow}>CASE PRIORITY</Text><Text style={styles.cardTitle}>Where care is needed</Text>{["critical", "high", "medium", "low"].map((priority) => { const item = priorityStyle[priority]; const count = byPriority[priority] ?? 0; return <View style={styles.priorityRow} key={priority}><View style={[styles.priorityDot, { backgroundColor: item.color }]} /><Text style={styles.priorityLabel}>{item.label}</Text><View style={[styles.priorityCount, { backgroundColor: item.soft }]}><Text style={[styles.priorityCountText, { color: item.color }]}>{count}</Text></View></View>; })}</View>;
}

function AttentionList({ cases, onPress }: { cases: Case[]; onPress: (caseItem: Case) => void }) {
  if (!cases.length) return null;
  return <View style={styles.attentionCard}><View style={styles.cardHeader}><View><Text style={styles.cardEyebrow}>FOLLOW-UP</Text><Text style={styles.cardTitle}>Needs your attention</Text></View><View style={styles.attentionBadge}><Text style={styles.attentionBadgeText}>{cases.length}</Text></View></View>{cases.slice(0, 3).map((caseItem) => { const priority = priorityStyle[caseItem.priority] ?? priorityStyle.medium; return <Pressable key={caseItem.id} onPress={() => onPress(caseItem)} style={({ pressed }) => [styles.caseRow, pressed && styles.pressed]}><View style={[styles.caseSignal, { backgroundColor: priority.color }]} /><View style={styles.caseCopy}><Text style={styles.caseNumber} numberOfLines={1}>{caseItem.report?.case_number ? `#${caseItem.report.case_number}` : "Private case"}</Text><Text style={styles.caseMeta} numberOfLines={1}>{caseItem.report?.category?.name || "Incident report"} · {statusLabel(caseItem.status)}</Text></View><View style={[styles.casePriority, { backgroundColor: priority.soft }]}><Text style={[styles.casePriorityText, { color: priority.color }]}>{priority.label}</Text></View><Ionicons name="chevron-forward" size={17} color="#998FA0" /></Pressable>; })}</View>;
}

export default function OfficerDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: stats, isLoading, isRefetching, refetch } = useQuery({ queryKey: ["officer-stats"], queryFn: () => casesApi.officerStats() });
  const statusCounts = useMemo(() => Object.entries(stats?.by_status ?? {}).sort(([, first], [, second]) => second - first).slice(0, 3), [stats?.by_status]);
  const openCase = useCallback((caseItem: Case) => router.push(`/(officer)/cases/${caseItem.id}`), [router]);

  return <View style={styles.screen}><StatusBar style="dark" /><View pointerEvents="none" style={styles.lilacArc}><View style={styles.lilacArcInner} /></View><ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 30, paddingBottom: insets.bottom + 104 }]} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#A95BEA" />}>{isLoading ? <View style={styles.loading}><ActivityIndicator color="#A95BEA" size="large" /><Text style={styles.loadingText}>Opening your casework…</Text></View> : <><View style={styles.topline}><View><Text style={styles.eyebrow}>PRIVATE CASEWORK</Text><Text style={styles.title}>{"Careful\ncasework."}</Text><Text style={styles.subtitle}>Your assigned safeguarding cases, kept clear and private.</Text></View><Pressable onPress={() => router.push("/(officer)/settings")} style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]} accessibilityLabel="Open officer settings"><Ionicons name="settings-outline" size={23} color="#813BBC" /></Pressable></View><View style={styles.metricGrid}><OfficerMetric icon="folder-open-outline" value={stats?.total_assigned ?? 0} label="Assigned cases" onPress={() => router.push("/(officer)/cases/index")} /><OfficerMetric icon="flame-outline" value={(stats?.by_priority?.critical ?? 0) + (stats?.by_priority?.high ?? 0)} label="High priority" tone="rose" onPress={() => router.push("/(officer)/cases/index?priority=critical")} /><OfficerMetric icon="chatbubble-ellipses-outline" value={stats?.by_status?.AWAITING_REPORTER_RESPONSE ?? 0} label="Needs response" tone="amber" /><OfficerMetric icon="search-outline" value={stats?.by_status?.UNDER_REVIEW ?? 0} label="Under review" tone="blue" /></View><PriorityOverview byPriority={stats?.by_priority ?? {}} /><AttentionList cases={stats?.needs_attention ?? []} onPress={openCase} />{statusCounts.length > 0 && <View style={styles.statusCard}><Text style={styles.cardEyebrow}>WORKFLOW</Text><Text style={styles.cardTitle}>Current case stages</Text>{statusCounts.map(([status, count]) => <View style={styles.statusRow} key={status}><Text style={styles.statusName}>{statusLabel(status)}</Text><Text style={styles.statusValue}>{count}</Text></View>)}</View>}<Pressable onPress={() => router.push("/(officer)/cases/index")} style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}><View style={styles.primaryIcon}><Ionicons name="list-outline" size={21} color="#FFFFFF" /></View><View style={styles.primaryCopy}><Text style={styles.primaryTitle}>Open case queue</Text><Text style={styles.primaryText}>Review your assigned safeguarding work.</Text></View><Ionicons name="arrow-forward" size={20} color="#FFFFFF" /></Pressable></>}</ScrollView></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FEFDFE", overflow: "hidden" },
  lilacArc: { position: "absolute", width: 660, height: 510, top: -315, left: -205, borderRadius: 330, backgroundColor: "#E1C1FC", opacity: 0.92 },
  lilacArcInner: { position: "absolute", width: 560, height: 410, top: 112, left: 87, borderRadius: 280, backgroundColor: "#F7EBFF", opacity: 0.78 },
  scroll: { paddingHorizontal: 27 },
  loading: { minHeight: 420, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: "#817B84", fontSize: 13 },
  topline: { flexDirection: "row", alignItems: "flex-start", gap: 16, marginBottom: 27 },
  eyebrow: { color: "#7E36B7", fontSize: 11, fontWeight: "800", letterSpacing: 1.8, marginBottom: 10 },
  title: { flexShrink: 1, color: "#09080A", fontSize: 35, lineHeight: 39, fontWeight: "700", letterSpacing: -1.45 },
  subtitle: { maxWidth: 265, color: "#767178", fontSize: 13.5, lineHeight: 20, marginTop: 10 },
  settingsButton: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "#F1E2FD", marginTop: 3 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 17 },
  metric: { flexGrow: 1, flexBasis: "45%", minHeight: 122, borderRadius: 22, borderWidth: 1.1, borderColor: "#E2DAE5", backgroundColor: "rgba(255,255,255,0.8)", padding: 14 },
  metricIcon: { width: 35, height: 35, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  metricValue: { color: "#19141B", fontSize: 28, lineHeight: 31, fontWeight: "800", marginTop: 12 },
  metricLabel: { color: "#746E77", fontSize: 11.5, marginTop: 3 },
  priorityCard: { borderRadius: 24, backgroundColor: "#F1EAF4", padding: 19, marginBottom: 13 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 5 },
  cardEyebrow: { color: "#7E36B7", fontSize: 10, fontWeight: "800", letterSpacing: 1.35, marginBottom: 5 },
  cardTitle: { color: "#251E28", fontSize: 17, fontWeight: "800", letterSpacing: -0.3, marginBottom: 11 },
  priorityRow: { flexDirection: "row", alignItems: "center", minHeight: 35 },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  priorityLabel: { flex: 1, color: "#514A55", fontSize: 13.5 },
  priorityCount: { minWidth: 29, minHeight: 25, borderRadius: 13, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  priorityCountText: { fontSize: 12, fontWeight: "800" },
  attentionCard: { borderRadius: 24, borderWidth: 1.1, borderColor: "#E2DAE5", backgroundColor: "rgba(255,255,255,0.8)", padding: 17, marginBottom: 13 },
  attentionBadge: { minWidth: 29, height: 29, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#F1E2FD" },
  attentionBadgeText: { color: "#7839B0", fontSize: 12, fontWeight: "800" },
  caseRow: { flexDirection: "row", alignItems: "center", minHeight: 62, borderTopWidth: 1, borderTopColor: "#EEE7F0", gap: 9 },
  caseSignal: { width: 4, height: 31, borderRadius: 4 },
  caseCopy: { flex: 1, minWidth: 0 },
  caseNumber: { color: "#302B33", fontSize: 12.5, fontWeight: "800" },
  caseMeta: { color: "#827987", fontSize: 10.5, marginTop: 3 },
  casePriority: { borderRadius: 11, paddingHorizontal: 7, paddingVertical: 5 },
  casePriorityText: { fontSize: 9.5, fontWeight: "800" },
  statusCard: { borderRadius: 23, borderWidth: 1.1, borderColor: "#E2DAE5", backgroundColor: "rgba(255,255,255,0.8)", padding: 18, marginBottom: 15 },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 9, borderTopWidth: 1, borderTopColor: "#EEE7F0" },
  statusName: { color: "#5D5660", fontSize: 12.5 },
  statusValue: { color: "#7839B0", fontSize: 14, fontWeight: "800" },
  primaryAction: { minHeight: 78, flexDirection: "row", alignItems: "center", borderRadius: 27, backgroundColor: "#A95BEA", padding: 16, marginTop: 2, shadowColor: "#A75CDF", shadowOpacity: 0.24, shadowRadius: 11, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  primaryIcon: { width: 43, height: 43, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.19)", marginRight: 12 },
  primaryCopy: { flex: 1 },
  primaryTitle: { color: "#FFFFFF", fontSize: 16.5, fontWeight: "800" },
  primaryText: { color: "rgba(255,255,255,0.84)", fontSize: 11.5, marginTop: 3 },
  pressed: { opacity: 0.86, transform: [{ scale: 0.985 }] },
});
