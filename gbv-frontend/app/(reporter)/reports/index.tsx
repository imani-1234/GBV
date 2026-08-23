import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { reportsApi } from "../../../src/api/reports";
import type { Report } from "../../../src/types";

const filters = ["all", "draft", "submitted", "under_review", "resolved", "closed"] as const;
const display = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function MyReportsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-reports", filter],
    queryFn: () => reportsApi.list(filter === "all" ? undefined : { status: filter }),
  });
  const reports = data?.results || [];

  return (
    <View style={styles.safeArea}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <View pointerEvents="none" style={styles.lilacArc}><View style={styles.lilacArcInner} /></View>
      <View style={styles.header}>
        <View><Text style={styles.eyebrow}>PRIVATE RECORD</Text><Text style={styles.title}>Your reports</Text></View>
        <Pressable onPress={() => router.push("/(reporter)/reports/new")} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}><Ionicons name="add" size={25} color="#FFFFFF" /></Pressable>
      </View>
      <FlashList
        data={reports}
        keyExtractor={(item: Report) => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#A95BEA" />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<View><View style={styles.filterWrap}>{filters.map((item) => <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}><Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{display(item)}</Text></Pressable>)}</View>{isLoading ? <View style={styles.loading}><ActivityIndicator color="#A95BEA" /><Text style={styles.loadingText}>Loading your reports…</Text></View> : null}</View>}
        renderItem={({ item }: { item: Report }) => <Pressable onPress={() => router.push(`/reports/${item.id}`)} style={({ pressed }) => [styles.reportCard, pressed && styles.pressed]}><View style={styles.reportIcon}><Ionicons name="document-text-outline" size={20} color="#813BBC" /></View><View style={styles.reportCopy}><Text style={styles.reportTitle} numberOfLines={1}>{item.category?.name || "Incident report"}</Text><Text style={styles.reportDate}>{new Date(item.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</Text></View><View style={styles.statusPill}><Text style={styles.status}>{display(item.status)}</Text></View><Ionicons name="chevron-forward" size={18} color="#9A909E" /></Pressable>}
        ListEmptyComponent={!isLoading ? <View style={styles.empty}><Ionicons name="document-text-outline" size={32} color="#813BBC" /><Text style={styles.emptyTitle}>No reports here</Text><Text style={styles.emptyText}>Create a private report when you are ready.</Text><Pressable onPress={() => router.push("/(reporter)/reports/new")} style={styles.emptyAction}><Text style={styles.emptyActionText}>Create report</Text></Pressable></View> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FEFDFE", overflow: "hidden" },
  lilacArc: { position: "absolute", width: 620, height: 420, top: -290, left: -30, backgroundColor: "#E1C1FC", borderRadius: 310, opacity: 0.92 },
  lilacArcInner: { position: "absolute", width: 540, height: 350, top: 112, left: -83, backgroundColor: "#F7EBFF", borderRadius: 270, opacity: 0.76 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 28, paddingTop: 58, paddingBottom: 21 },
  eyebrow: { color: "#7E36B7", fontSize: 11, letterSpacing: 1.8, fontWeight: "800", marginBottom: 7 },
  title: { color: "#09080A", fontSize: 32, lineHeight: 36, fontWeight: "700", letterSpacing: -1.2 },
  addButton: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#A95BEA", alignItems: "center", justifyContent: "center", shadowColor: "#A75CDF", shadowOpacity: 0.22, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.88 },
  listContent: { paddingHorizontal: 28, paddingBottom: 26 },
  filterWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 18 },
  filter: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: "#D8D0DA", backgroundColor: "rgba(255,255,255,0.66)" },
  filterActive: { borderColor: "#A95BEA", backgroundColor: "#F1E2FD" },
  filterText: { color: "#837C86", fontSize: 11.5, fontWeight: "700" },
  filterTextActive: { color: "#7132AA" },
  loading: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 18 },
  loadingText: { color: "#817B84", fontSize: 13 },
  reportCard: { flexDirection: "row", alignItems: "center", minHeight: 79, borderRadius: 22, borderWidth: 1.1, borderColor: "#DDD5E0", backgroundColor: "rgba(255,255,255,0.72)", paddingHorizontal: 13, marginBottom: 9 },
  reportIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#F1E2FD", marginRight: 11 },
  reportCopy: { flex: 1, paddingRight: 8 },
  reportTitle: { color: "#302C33", fontSize: 14.5, fontWeight: "800" },
  reportDate: { color: "#87808A", fontSize: 11.5, marginTop: 4 },
  statusPill: { maxWidth: 92, borderRadius: 12, backgroundColor: "#F1E2FD", paddingHorizontal: 8, paddingVertical: 5, marginRight: 6 },
  status: { color: "#7234AA", fontSize: 9.5, lineHeight: 12, fontWeight: "800", textAlign: "center" },
  empty: { alignItems: "center", padding: 34, borderRadius: 23, borderWidth: 1.1, borderColor: "#DDD5E0", backgroundColor: "rgba(255,255,255,0.68)", marginTop: 16 },
  emptyTitle: { color: "#29242C", fontSize: 16, fontWeight: "800", marginTop: 10 },
  emptyText: { color: "#807A82", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 5 },
  emptyAction: { marginTop: 18, backgroundColor: "#A95BEA", borderRadius: 22, paddingVertical: 10, paddingHorizontal: 17 },
  emptyActionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
});
