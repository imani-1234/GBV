import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { analyticsApi } from "../../src/api/analytics";

function resolutionTime(seconds: number | null) {
  if (!seconds) return "—";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
}

function OverviewMetric({ icon, label, value, tone }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string | number; tone: "purple" | "blue" | "amber" | "mint" }) {
  const colors = { purple: ["#813BBC", "#F1E2FD"], blue: ["#3979D5", "#EDF3FF"], amber: ["#A76A11", "#FFF7E7"], mint: ["#2C755A", "#ECF8F0"] } as const;
  const [color, soft] = colors[tone];
  return <View style={styles.metric}><View style={[styles.metricIcon, { backgroundColor: soft }]}><Ionicons name={icon} size={19} color={color} /></View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function WorkspaceLink({ icon, title, text, route, tone }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string; route: string; tone: string }) {
  const router = useRouter();
  return <Pressable onPress={() => router.push(route as never)} style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}><View style={[styles.linkIcon, { backgroundColor: `${tone}18` }]}><Ionicons name={icon} size={20} color={tone} /></View><View style={styles.linkCopy}><Text style={styles.linkTitle}>{title}</Text><Text style={styles.linkText}>{text}</Text></View><Ionicons name="chevron-forward" size={18} color="#918793" /></Pressable>;
}

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const { data: summary, isLoading, refetch, isRefetching } = useQuery({ queryKey: ["admin-dashboard-summary"], queryFn: () => analyticsApi.summary(), staleTime: 120_000 });
  const links = [
    { icon: "bar-chart-outline" as const, title: "Analytics", text: "Trends, metrics, and safeguarding insight", route: "/(admin)/analytics", tone: "#813BBC" },
    { icon: "document-text-outline" as const, title: "All reports", text: "Review the complete reporting record", route: "/(admin)/reports", tone: "#3979D5" },
    { icon: "folder-open-outline" as const, title: "Case oversight", text: "Manage case status, ownership, and priority", route: "/(admin)/case-oversight", tone: "#A76A11" },
    { icon: "people-outline" as const, title: "User management", text: "Manage authorised safeguarding staff", route: "/(admin)/user-management", tone: "#2C755A" },
    { icon: "document-text-outline" as const, title: "Audit activity", text: "Review the protected system trail", route: "/(admin)/audit-logs", tone: "#B14C68" },
    { icon: "pricetags-outline" as const, title: "Categories", text: "Maintain incident classification", route: "/(admin)/categories", tone: "#813BBC" },
    { icon: "settings-outline" as const, title: "Settings", text: "Review workspace configuration", route: "/(admin)/settings", tone: "#746B77" },
  ];

  return <View style={styles.screen}><StatusBar style="dark" /><View pointerEvents="none" style={styles.lilacArc}><View style={styles.lilacArcInner} /></View><ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 30, paddingBottom: insets.bottom + 42 }]} showsVerticalScrollIndicator={false} refreshing={isRefetching} onRefresh={refetch}><View style={styles.topline}><View><Text style={styles.eyebrow}>SAUTI YAKO ADMIN</Text><Text style={styles.title}>{"System\noversight."}</Text><Text style={styles.subtitle}>A private view of safeguarding operations and accountable follow-up.</Text></View><View style={styles.adminMark}><Ionicons name="shield-checkmark-outline" size={23} color="#813BBC" /></View></View>{isLoading ? <View style={styles.loading}><ActivityIndicator size="large" color="#A95BEA" /><Text style={styles.loadingText}>Opening system overview…</Text></View> : <><View style={styles.metricGrid}><OverviewMetric icon="document-text-outline" label="Total reports" value={summary?.total_reports ?? 0} tone="purple" /><OverviewMetric icon="person-outline" label="Identified" value={summary?.identified_reports ?? 0} tone="blue" /><OverviewMetric icon="eye-off-outline" label="Anonymous" value={summary?.anonymous_reports ?? 0} tone="amber" /><OverviewMetric icon="time-outline" label="Avg resolution" value={resolutionTime(summary?.avg_resolution_time_seconds ?? null)} tone="mint" /></View><View style={styles.insightCard}><View style={styles.insightIcon}><Ionicons name="pulse-outline" size={21} color="#813BBC" /></View><View style={styles.insightCopy}><Text style={styles.insightEyebrow}>SYSTEM PULSE</Text><Text style={styles.insightTitle}>Protect each step of the response.</Text><Text style={styles.insightText}>Use the workspace below to review records, guide ownership, and maintain an accountable safeguarding trail.</Text></View></View><View style={styles.workspaceHeader}><View><Text style={styles.eyebrow}>WORKSPACE</Text><Text style={styles.workspaceTitle}>Governance tools</Text></View><Text style={styles.workspaceNote}>Private access</Text></View><View style={styles.linkCard}>{links.map((link) => <WorkspaceLink key={link.title} {...link} />)}</View></>}</ScrollView></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FEFDFE", overflow: "hidden" },
  lilacArc: { position: "absolute", width: 660, height: 510, top: -315, left: -205, borderRadius: 330, backgroundColor: "#E1C1FC", opacity: 0.92 },
  lilacArcInner: { position: "absolute", width: 560, height: 410, top: 112, left: 87, borderRadius: 280, backgroundColor: "#F7EBFF", opacity: 0.78 },
  scroll: { paddingHorizontal: 27 },
  topline: { flexDirection: "row", alignItems: "flex-start", gap: 16, marginBottom: 27 },
  eyebrow: { color: "#7E36B7", fontSize: 10.5, fontWeight: "800", letterSpacing: 1.75, marginBottom: 9 },
  title: { flexShrink: 1, color: "#09080A", fontSize: 35, lineHeight: 39, fontWeight: "700", letterSpacing: -1.45 },
  subtitle: { maxWidth: 278, color: "#767178", fontSize: 13.5, lineHeight: 20, marginTop: 10 },
  adminMark: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "#F1E2FD", marginTop: 3 },
  loading: { minHeight: 400, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: "#817B84", fontSize: 13 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 15 },
  metric: { flexGrow: 1, flexBasis: "45%", minHeight: 120, borderRadius: 22, borderWidth: 1.1, borderColor: "#E2DAE5", backgroundColor: "rgba(255,255,255,0.8)", padding: 14 },
  metricIcon: { width: 35, height: 35, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  metricValue: { color: "#19141B", fontSize: 26, lineHeight: 30, fontWeight: "800", marginTop: 12 },
  metricLabel: { color: "#746E77", fontSize: 11.5, marginTop: 3 },
  insightCard: { flexDirection: "row", gap: 12, borderRadius: 24, backgroundColor: "#F1EAF4", padding: 18, marginBottom: 24 },
  insightIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "#F7E8FF" },
  insightCopy: { flex: 1 },
  insightEyebrow: { color: "#7E36B7", fontSize: 9.5, fontWeight: "800", letterSpacing: 1.25, marginBottom: 5 },
  insightTitle: { color: "#2B2430", fontSize: 16, fontWeight: "800", letterSpacing: -0.35 },
  insightText: { color: "#746B77", fontSize: 11.5, lineHeight: 17, marginTop: 6 },
  workspaceHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 11 },
  workspaceTitle: { color: "#211B24", fontSize: 18, fontWeight: "800", letterSpacing: -0.35 },
  workspaceNote: { color: "#8A818D", fontSize: 10.5, fontWeight: "700", marginBottom: 2 },
  linkCard: { borderRadius: 24, borderWidth: 1.1, borderColor: "#E2DAE5", backgroundColor: "rgba(255,255,255,0.82)", overflow: "hidden", marginBottom: 14 },
  linkRow: { minHeight: 75, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: "#EEE7F0" },
  linkIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  linkCopy: { flex: 1, minWidth: 0 },
  linkTitle: { color: "#332B37", fontSize: 13.5, fontWeight: "800" },
  linkText: { color: "#817784", fontSize: 10.5, marginTop: 3 },
  pressed: { opacity: 0.86, transform: [{ scale: 0.985 }] },
});
