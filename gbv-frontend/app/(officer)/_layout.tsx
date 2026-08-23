import { View, StyleSheet } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import { useBreakpoint, isWide } from "../../src/hooks/useBreakpoint";
import { TabBar, SideRail } from "../../src/components/navigation";
import type { TabDefinition } from "../../src/components/navigation/TabBar";

const tabs: TabDefinition[] = [
  { key: "index", label: "Dashboard", icon: "grid-outline", activeIcon: "grid" },
  { key: "cases", label: "Case Queue", icon: "folder-outline", activeIcon: "folder" },
  { key: "messages", label: "Messages", icon: "chatbubble-ellipses-outline", activeIcon: "chatbubble-ellipses" },
  { key: "notifications", label: "Alerts", icon: "notifications-outline", activeIcon: "notifications" },
  { key: "settings", label: "Settings", icon: "settings-outline", activeIcon: "settings" },
];

function getActiveTab(pathname: string): string {
  if (pathname.startsWith("/(officer)/cases") || pathname.startsWith("/cases")) return "cases";
  if (pathname.startsWith("/(officer)/messages") || pathname.startsWith("/messages")) return "messages";
  if (pathname.startsWith("/(officer)/notifications") || pathname.startsWith("/notifications")) return "notifications";
  if (pathname.startsWith("/(officer)/settings") || pathname.startsWith("/settings")) return "settings";
  return "index";
}

export default function OfficerLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const bp = useBreakpoint();
  const wide = isWide(bp);
  const activeTab = getActiveTab(pathname);

  const handleTabPress = (key: string) => {
    router.replace(`/(officer)/${key === "index" ? "" : key}` as never);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.row}>
        {wide && <SideRail tabs={tabs} activeTab={activeTab} onTabPress={handleTabPress} />}
        <View style={styles.content}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="cases/index" />
            <Stack.Screen name="cases/[id]" />
            <Stack.Screen name="cases/[id]/messages" />
            <Stack.Screen name="messages" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="settings" />
          </Stack>
        </View>
      </View>
      {!wide && <TabBar tabs={tabs} activeTab={activeTab} onTabPress={handleTabPress} tone="auth" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FEFDFE" },
  row: { flex: 1, flexDirection: "row" },
  content: { flex: 1 },
});
