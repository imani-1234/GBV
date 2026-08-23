import { useCallback } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { reportsApi } from "../../src/api/reports";
import { casesApi } from "../../src/api/cases";
import { useAuthStore } from "../../src/stores/authStore";
import { mayFetchReporterCases } from "../../src/utils/reporterAccess";
import { reporterHeroTitle } from "../../src/utils/reporterScreenCopy";
import type { Report } from "../../src/types";

function labelForStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function shortDate(value?: string) {
  if (!value) return "Recently";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ReporterHome() {
  const router = useRouter();
  const isAnonymous = useAuthStore((state) => state.isAnonymous);
  const loadCases = mayFetchReporterCases(isAnonymous);
  const { data: reportsData, isLoading: reportsLoading, refetch: refetchReports } = useQuery({
    queryKey: ["reporter-reports"],
    queryFn: () => reportsApi.list(),
  });
  const { data: casesData, isLoading: casesLoading, refetch: refetchCases } = useQuery({
    queryKey: ["reporter-cases"],
    queryFn: () => casesApi.list(),
    enabled: loadCases,
  });

  const reports = reportsData?.results || [];
  const cases = casesData?.results || [];
  const activeReports = reports.filter((report) => !["resolved", "closed"].includes(report.status.toLowerCase()));
  const completedReports = reports.filter((report) => ["resolved", "closed"].includes(report.status.toLowerCase()));
  const openCases = cases.filter((item) => !["RESOLVED", "CLOSED"].includes(item.status));
  const loading = reportsLoading || (loadCases && casesLoading);

  const refresh = useCallback(() => {
    refetchReports();
    if (loadCases) refetchCases();
  }, [loadCases, refetchCases, refetchReports]);

  return (
    <View style={styles.safeArea}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <View pointerEvents="none" style={styles.lilacArc}><View style={styles.lilacArcInner} /></View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#A95BEA" />}
      >
        <View style={styles.introRow}>
          <View style={styles.introText}>
            <Text style={styles.eyebrow}>{isAnonymous ? "PRIVATE REPORTING SPACE" : "SAUTI YAKO"}</Text>
            <Text style={styles.title}>{reporterHeroTitle(isAnonymous)}</Text>
          </View>
          <View style={styles.profileMark}><Ionicons name={isAnonymous ? "eye-off-outline" : "person-outline"} size={21} color="#7E36B7" /></View>
        </View>

        <Pressable onPress={() => router.push("/(reporter)/reports/new")} style={({ pressed }) => [styles.primaryCard, pressed && styles.pressed]}>
          <View style={styles.primaryIcon}><Ionicons name="create-outline" size={23} color="#FFFFFF" /></View>
          <View style={styles.primaryCopy}><Text style={styles.primaryTitle}>Create report</Text><Text style={styles.primaryText}>Share only what feels safe for you.</Text></View>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </Pressable>

        <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Overview</Text><Pressable onPress={() => router.push("/(reporter)/reports")}><Text style={styles.sectionLink}>View reports</Text></Pressable></View>
        <View style={styles.statsRow}>
          <View style={styles.statCard}><Text style={styles.statNumber}>{reports.length}</Text><Text style={styles.statLabel}>Reports</Text></View>
          <View style={styles.statCard}><Text style={styles.statNumber}>{loadCases ? openCases.length : activeReports.length}</Text><Text style={styles.statLabel}>{loadCases ? "In progress" : "Active"}</Text></View>
          <View style={styles.statCard}><Text style={styles.statNumber}>{loadCases ? cases.filter((item) => ["RESOLVED", "CLOSED"].includes(item.status)).length : completedReports.length}</Text><Text style={styles.statLabel}>Closed</Text></View>
        </View>

        <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>{isAnonymous ? "Your reports" : "Recent updates"}</Text></View>
        {loading ? <View style={styles.loadingCard}><ActivityIndicator color="#A95BEA" /><Text style={styles.loadingText}>Loading your private space…</Text></View> : reports.length === 0 ? (
          <View style={styles.emptyCard}><Ionicons name="document-text-outline" size={29} color="#813BBC" /><Text style={styles.emptyTitle}>No reports yet</Text><Text style={styles.emptyText}>When you are ready, your first report will appear here.</Text></View>
        ) : reports.slice(0, 3).map((report: Report) => (
          <Pressable key={report.id} onPress={() => router.push(`/reports/${report.id}`)} style={({ pressed }) => [styles.reportCard, pressed && styles.pressed]}>
            <View style={styles.reportIcon}><Ionicons name="document-text-outline" size={20} color="#813BBC" /></View>
            <View style={styles.reportCopy}><Text style={styles.reportTitle} numberOfLines={1}>{report.category?.name || "Incident report"}</Text><Text style={styles.reportDate}>{shortDate(report.created_at)}</Text></View>
            <View style={styles.statusPill}><Text style={styles.statusText}>{labelForStatus(report.status)}</Text></View>
          </Pressable>
        ))}

        <Pressable onPress={() => router.push("/(auth)/resources")} style={styles.helpCard}><Ionicons name="heart-outline" size={21} color="#8B475F" /><View style={styles.helpCopy}><Text style={styles.helpTitle}>Need immediate help?</Text><Text style={styles.helpText}>Private support is available at any time.</Text></View><Ionicons name="chevron-forward" size={19} color="#8B475F" /></Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FEFDFE", overflow: "hidden" },
  lilacArc: { position: "absolute", width: 620, height: 500, top: -280, left: -190, backgroundColor: "#E1C1FC", borderRadius: 310, opacity: 0.92 },
  lilacArcInner: { position: "absolute", width: 540, height: 400, left: 85, top: 108, backgroundColor: "#F7EBFF", borderRadius: 270, opacity: 0.76 },
  scroll: { paddingHorizontal: 27, paddingTop: 58, paddingBottom: 30 },
  introRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 30 },
  introText: { flex: 1 },
  eyebrow: { color: "#7E36B7", fontSize: 11.5, letterSpacing: 1.9, fontWeight: "800", marginBottom: 12 },
  title: { color: "#080709", fontSize: 35, lineHeight: 39, fontWeight: "700", letterSpacing: -1.4 },
  profileMark: { width: 45, height: 45, borderRadius: 23, backgroundColor: "#F1E2FD", alignItems: "center", justifyContent: "center", marginTop: 5 },
  primaryCard: { flexDirection: "row", alignItems: "center", padding: 18, borderRadius: 27, backgroundColor: "#A95BEA", shadowColor: "#A75CDF", shadowOpacity: 0.22, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  primaryIcon: { width: 43, height: 43, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.19)", alignItems: "center", justifyContent: "center", marginRight: 13 },
  primaryCopy: { flex: 1 },
  primaryTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  primaryText: { color: "rgba(255,255,255,0.84)", fontSize: 12.5, marginTop: 3 },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 29, marginBottom: 12 },
  sectionTitle: { color: "#211E23", fontSize: 16.5, fontWeight: "800" },
  sectionLink: { color: "#7E36B7", fontSize: 12.5, fontWeight: "800" },
  statsRow: { flexDirection: "row", gap: 9 },
  statCard: { flex: 1, minHeight: 83, borderRadius: 20, borderWidth: 1.1, borderColor: "#E0D9E2", backgroundColor: "rgba(255,255,255,0.72)", paddingHorizontal: 13, paddingVertical: 13 },
  statNumber: { color: "#7E36B7", fontSize: 25, lineHeight: 29, fontWeight: "800" },
  statLabel: { color: "#817B84", fontSize: 11.5, fontWeight: "600", marginTop: 4 },
  loadingCard: { flexDirection: "row", alignItems: "center", gap: 9, padding: 19, borderRadius: 21, borderWidth: 1, borderColor: "#E2DCE4" },
  loadingText: { color: "#817B84", fontSize: 13 },
  emptyCard: { alignItems: "center", padding: 30, borderRadius: 23, borderWidth: 1.1, borderColor: "#DDD5E0", backgroundColor: "rgba(255,255,255,0.68)" },
  emptyTitle: { color: "#29242C", fontSize: 16, fontWeight: "800", marginTop: 10 },
  emptyText: { color: "#807A82", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 5 },
  reportCard: { flexDirection: "row", alignItems: "center", minHeight: 74, borderWidth: 1.1, borderColor: "#DDD5E0", backgroundColor: "rgba(255,255,255,0.72)", borderRadius: 21, paddingHorizontal: 13, marginBottom: 9 },
  reportIcon: { width: 39, height: 39, borderRadius: 20, backgroundColor: "#F1E2FD", alignItems: "center", justifyContent: "center", marginRight: 11 },
  reportCopy: { flex: 1, paddingRight: 8 },
  reportTitle: { color: "#302C33", fontSize: 14, fontWeight: "800" },
  reportDate: { color: "#87808A", fontSize: 11.5, marginTop: 3 },
  statusPill: { maxWidth: 100, borderRadius: 12, backgroundColor: "#F1E2FD", paddingHorizontal: 9, paddingVertical: 5 },
  statusText: { color: "#7234AA", fontSize: 9.5, lineHeight: 12, fontWeight: "800", textAlign: "center" },
  helpCard: { flexDirection: "row", alignItems: "center", padding: 15, borderRadius: 22, borderColor: "#EBD6DE", borderWidth: 1, backgroundColor: "#FFF8FA", marginTop: 29 },
  helpCopy: { flex: 1, marginLeft: 10 },
  helpTitle: { color: "#8B475F", fontSize: 13.5, fontWeight: "800" },
  helpText: { color: "#9A6C7B", fontSize: 11.5, marginTop: 3 },
});
