import { StyleSheet } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { Stack } from "expo-router/stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/ThemeProvider";
import { TabBar } from "../../src/components/navigation/TabBar";
import type { TabDefinition } from "../../src/components/navigation/TabBar";

const tabs: TabDefinition[] = [
  { key: "index", label: "Home", icon: "home-outline", activeIcon: "home" },
  { key: "reports", label: "Reports", icon: "document-text-outline", activeIcon: "document-text" },
  { key: "messages", label: "Messages", icon: "chatbubble-ellipses-outline", activeIcon: "chatbubble-ellipses" },
  { key: "notifications", label: "Alerts", icon: "notifications-outline", activeIcon: "notifications" },
  { key: "settings", label: "Settings", icon: "settings-outline", activeIcon: "settings" },
];

function getActiveTab(pathname: string): string {
  if (pathname.startsWith("/(reporter)/reports") || pathname === "/reports" || pathname.startsWith("/reports")) return "reports";
  if (pathname.startsWith("/(reporter)/messages") || pathname === "/messages" || pathname.startsWith("/messages")) return "messages";
  if (pathname.startsWith("/(reporter)/notifications") || pathname === "/notifications" || pathname.startsWith("/notifications")) return "notifications";
  if (pathname.startsWith("/(reporter)/settings") || pathname === "/settings" || pathname.startsWith("/settings")) return "settings";
  return "index";
}

export default function ReporterLayout() {
  const { scheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = getActiveTab(pathname);

  const handleTabPress = (key: string) => {
    router.replace(`/(reporter)/${key === "index" ? "" : key}`);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: scheme.background }]} edges={["top"]}>
      <Stack screenOptions={{ headerShown: false }} style={styles.content}>
        <Stack.Screen name="index" />
        <Stack.Screen name="reports/index" />
        <Stack.Screen name="reports/new" />
        <Stack.Screen name="reports/[id]" />
        <Stack.Screen name="reports/success" />
        <Stack.Screen name="messages" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="settings" />
      </Stack>
      <TabBar tabs={tabs} activeTab={activeTab} onTabPress={handleTabPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
});
