import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { Stack } from "expo-router/stack";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TabBar, type TabDefinition } from "../../src/components/navigation";

type AdminNavKey = "index" | "analytics" | "reports" | "user-management" | "case-oversight" | "audit-logs" | "categories" | "settings" | "more";

type NavItem = { key: Exclude<AdminNavKey, "more">; label: string; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap; route: string; description: string };

const NAV_ITEMS: NavItem[] = [
  { key: "index", label: "Dashboard", icon: "grid-outline", activeIcon: "grid", route: "/(admin)", description: "System overview" },
  { key: "analytics", label: "Analytics", icon: "bar-chart-outline", activeIcon: "bar-chart", route: "/(admin)/analytics", description: "Trends and insight" },
  { key: "reports", label: "Reports", icon: "document-text-outline", activeIcon: "document-text", route: "/(admin)/reports", description: "All system reports" },
  { key: "user-management", label: "Users", icon: "people-outline", activeIcon: "people", route: "/(admin)/user-management", description: "Authorised staff" },
  { key: "case-oversight", label: "Cases", icon: "folder-open-outline", activeIcon: "folder-open", route: "/(admin)/case-oversight", description: "Case ownership and priority" },
  { key: "audit-logs", label: "Audit activity", icon: "document-text-outline", activeIcon: "document-text", route: "/(admin)/audit-logs", description: "Protected system trail" },
  { key: "categories", label: "Categories", icon: "pricetags-outline", activeIcon: "pricetags", route: "/(admin)/categories", description: "Incident classification" },
  { key: "settings", label: "Settings", icon: "settings-outline", activeIcon: "settings", route: "/(admin)/settings", description: "Workspace configuration" },
];

const primaryKeys: AdminNavKey[] = ["index", "reports", "case-oversight", "user-management"];

function getActiveKey(pathname: string): Exclude<AdminNavKey, "more"> {
  for (const item of NAV_ITEMS) {
    if (item.key === "index" && (pathname === "/(admin)" || pathname === "/")) return "index";
    if (item.key !== "index" && pathname.includes(item.key)) return item.key;
  }
  return "index";
}

function GovernanceRow({ item, onNavigate }: { item: NavItem; onNavigate: (item: NavItem) => void }) {
  return <Pressable onPress={() => onNavigate(item)} style={({ pressed }) => [styles.governanceRow, pressed && styles.pressed]}><View style={styles.governanceIcon}><Ionicons name={item.icon} size={20} color="#813BBC" /></View><View style={styles.governanceCopy}><Text style={styles.governanceTitle}>{item.label}</Text><Text style={styles.governanceText}>{item.description}</Text></View><Ionicons name="chevron-forward" size={18} color="#918793" /></Pressable>;
}

export default function AdminLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [governanceOpen, setGovernanceOpen] = useState(false);
  const activeKey = getActiveKey(pathname);
  const activeTab = primaryKeys.includes(activeKey) ? activeKey : "more";
  const tabs = useMemo<TabDefinition[]>(() => [
    ...primaryKeys.map((key) => {
      const item = NAV_ITEMS.find((entry) => entry.key === key)!;
      return { key: item.key, label: item.label, icon: item.icon, activeIcon: item.activeIcon };
    }),
    { key: "more", label: "More", icon: "grid-outline", activeIcon: "grid" },
  ], []);
  const governanceItems = NAV_ITEMS.filter((item) => !primaryKeys.includes(item.key));
  const navigate = (item: NavItem) => { setGovernanceOpen(false); router.replace(item.route as never); };
  const handleTabPress = (key: string) => {
    if (key === "more") { setGovernanceOpen(true); return; }
    const item = NAV_ITEMS.find((entry) => entry.key === key);
    if (item) navigate(item);
  };

  return <View style={styles.container}><StatusBar style="dark" /><Stack screenOptions={({ route }) => ({ headerShown: false, contentStyle: route.name === "index" ? undefined : { paddingTop: insets.top + 10, backgroundColor: "#FEFDFE" } })}><Stack.Screen name="index" /><Stack.Screen name="analytics" /><Stack.Screen name="reports" /><Stack.Screen name="user-management" /><Stack.Screen name="case-oversight" /><Stack.Screen name="audit-logs" /><Stack.Screen name="categories" /><Stack.Screen name="settings" /></Stack><TabBar tabs={tabs} activeTab={activeTab} onTabPress={handleTabPress} tone="auth" /><Modal visible={governanceOpen} transparent animationType="slide" onRequestClose={() => setGovernanceOpen(false)}><Pressable style={styles.backdrop} onPress={() => setGovernanceOpen(false)}><Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]} onPress={() => undefined}><View style={styles.sheetHandle} /><View style={styles.sheetHead}><View><Text style={styles.sheetEyebrow}>ADMINISTRATION</Text><Text style={styles.sheetTitle}>Governance tools</Text><Text style={styles.sheetText}>Private controls for the Sauti Yako safeguarding workspace.</Text></View><Pressable onPress={() => setGovernanceOpen(false)} style={styles.closeButton} accessibilityLabel="Close governance navigation"><Ionicons name="close" size={21} color="#813BBC" /></Pressable></View><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.governanceList}>{governanceItems.map((item) => <GovernanceRow key={item.key} item={item} onNavigate={navigate} />)}</ScrollView></Pressable></Pressable></Modal></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FEFDFE" },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "transparent" },
  sheet: { maxHeight: "82%", borderTopLeftRadius: 31, borderTopRightRadius: 31, backgroundColor: "#FEFDFE", paddingHorizontal: 22, paddingTop: 10 },
  sheetHandle: { alignSelf: "center", width: 42, height: 4, borderRadius: 4, backgroundColor: "#D4C8DA", marginBottom: 18 },
  sheetHead: { flexDirection: "row", alignItems: "flex-start", gap: 13, marginBottom: 19 },
  sheetEyebrow: { color: "#7E36B7", fontSize: 10, fontWeight: "800", letterSpacing: 1.5, marginBottom: 5 },
  sheetTitle: { color: "#171119", fontSize: 26, fontWeight: "700", letterSpacing: -0.9 },
  sheetText: { maxWidth: 260, color: "#766E78", fontSize: 12, lineHeight: 18, marginTop: 6 },
  closeButton: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "#F1E2FD", marginLeft: "auto" },
  governanceList: { borderRadius: 23, borderWidth: 1.1, borderColor: "#E2DAE5", backgroundColor: "rgba(255,255,255,0.86)", overflow: "hidden" },
  governanceRow: { minHeight: 73, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: "#EEE7F0" },
  governanceIcon: { width: 39, height: 39, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#F1E2FD" },
  governanceCopy: { flex: 1, minWidth: 0 },
  governanceTitle: { color: "#332B37", fontSize: 13.5, fontWeight: "800" },
  governanceText: { color: "#817784", fontSize: 10.5, marginTop: 3 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
});
