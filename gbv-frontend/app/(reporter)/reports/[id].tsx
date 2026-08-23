import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { reportsApi } from "../../../src/api/reports";
import type { Evidence } from "../../../src/types";

const statusLabel = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function ReportDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: report, isLoading } = useQuery({ queryKey: ["report", id], queryFn: () => reportsApi.get(id!), enabled: !!id });
  if (isLoading || !report) return <SafeAreaView style={styles.safeArea}><View style={styles.loading}><ActivityIndicator color="#A95BEA" /><Text style={styles.loadingText}>Opening your report…</Text></View></SafeAreaView>;
  return <SafeAreaView style={styles.safeArea} edges={["top"]}><StatusBar style="dark" /><View pointerEvents="none" style={styles.lilacArc}><View style={styles.lilacArcInner} /></View><ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}><Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={31} color="#141115" /></Pressable><Text style={styles.eyebrow}>PRIVATE REPORT</Text><Text style={styles.title}>{report.category?.name || "Incident{`\n`}report"}</Text><View style={styles.statusLine}><View style={styles.statusPill}><Text style={styles.statusText}>{statusLabel(report.status)}</Text></View><Text style={styles.statusHelp}>We will update you through this space.</Text></View><View style={styles.detailCard}><Text style={styles.cardLabel}>WHAT HAPPENED</Text><Text style={styles.body}>{report.description || "No description provided."}</Text></View><View style={styles.detailCard}><Text style={styles.cardLabel}>WHEN & WHERE</Text><Text style={styles.body}>{new Date(report.incident_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</Text><Text style={styles.muted}>{report.location_text || report.campus || "Location not specified"}</Text></View>{report.evidence?.length ? <View style={styles.detailCard}><Text style={styles.cardLabel}>EVIDENCE</Text>{report.evidence.map((file: Evidence) => <View key={file.id} style={styles.file}><Ionicons name="document-outline" size={19} color="#813BBC" /><Text style={styles.fileName} numberOfLines={1}>{typeof file.file === "string" ? file.file.split("/").pop() || "Attachment" : "Attachment"}</Text></View>)}</View> : null}<View style={styles.privateNote}><Ionicons name="shield-checkmark-outline" size={19} color="#8B475F" /><Text style={styles.privateText}>Your identity and report details remain private.</Text></View></ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FEFDFE", overflow: "hidden" },
  lilacArc: { position: "absolute", width: 620, height: 430, top: -295, left: -30, backgroundColor: "#E1C1FC", borderRadius: 310, opacity: 0.92 },
  lilacArcInner: { position: "absolute", width: 540, height: 350, top: 115, left: -83, backgroundColor: "#F7EBFF", borderRadius: 270, opacity: 0.76 },
  scroll: { paddingHorizontal: 29, paddingTop: 11, paddingBottom: 30 },
  back: { alignSelf: "flex-start", padding: 4, marginBottom: 25 },
  eyebrow: { color: "#7E36B7", fontSize: 11, letterSpacing: 1.8, fontWeight: "800", marginBottom: 8 },
  title: { color: "#09080A", fontSize: 31, lineHeight: 36, fontWeight: "700", letterSpacing: -1.2 },
  statusLine: { flexDirection: "row", alignItems: "center", marginTop: 17, marginBottom: 24 },
  statusPill: { borderRadius: 13, backgroundColor: "#F1E2FD", paddingVertical: 6, paddingHorizontal: 11 },
  statusText: { color: "#7132AA", fontSize: 10.5, fontWeight: "800" },
  statusHelp: { color: "#837C86", fontSize: 11.5, marginLeft: 10, flex: 1 },
  detailCard: { borderRadius: 22, borderWidth: 1.1, borderColor: "#DDD5E0", backgroundColor: "rgba(255,255,255,0.72)", padding: 17, marginBottom: 10 },
  cardLabel: { color: "#7E36B7", fontSize: 10.5, letterSpacing: 1.2, fontWeight: "800", marginBottom: 9 },
  body: { color: "#302C33", fontSize: 14, lineHeight: 21 },
  muted: { color: "#817B84", fontSize: 12.5, marginTop: 5 },
  file: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 7 },
  fileName: { flex: 1, color: "#453F48", fontSize: 13 },
  privateNote: { flexDirection: "row", alignItems: "center", gap: 9, borderRadius: 21, borderWidth: 1, borderColor: "#EBD6DE", backgroundColor: "#FFF8FA", padding: 14, marginTop: 8 },
  privateText: { flex: 1, color: "#8B475F", fontSize: 12.5, fontWeight: "600" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: "#817B84", fontSize: 13 },
});
