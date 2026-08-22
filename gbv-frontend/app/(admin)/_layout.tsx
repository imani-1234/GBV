import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { Stack } from "expo-router/stack";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme/ThemeProvider";
import { BrandLockup } from "../../src/components/branding/BrandLockup";
import { useBreakpoint, isWide } from "../../src/hooks/useBreakpoint";

interface NavItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon?: keyof typeof Ionicons.glyphMap;
  route: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: "index", label: "Dashboard", icon: "grid-outline", activeIcon: "grid", route: "/(admin)" },
  { key: "analytics", label: "Analytics", icon: "bar-chart-outline", activeIcon: "bar-chart", route: "/(admin)/analytics" },
  { key: "reports", label: "All Reports", icon: "document-text-outline", activeIcon: "document-text", route: "/(admin)/reports" },
  { key: "user-management", label: "User Management", icon: "people-outline", activeIcon: "people", route: "/(admin)/user-management" },
  { key: "case-oversight", label: "Case Oversight", icon: "folder-open-outline", activeIcon: "folder-open", route: "/(admin)/case-oversight" },
  { key: "audit-logs", label: "Audit Logs", icon: "document-text-outline", activeIcon: "document-text", route: "/(admin)/audit-logs" },
  { key: "categories", label: "Categories", icon: "pricetags-outline", activeIcon: "pricetags", route: "/(admin)/categories" },
  { key: "settings", label: "Settings", icon: "settings-outline", activeIcon: "settings", route: "/(admin)/settings" },
];

function getActiveKey(pathname: string): string {
  for (const item of NAV_ITEMS) {
    if (item.key === "index" && (pathname === "/(admin)" || pathname === "/")) return "index";
    if (item.key !== "index" && pathname.includes(item.key)) return item.key;
  }
  return "index";
}

const SIDEBAR_WIDTH = 260;

export default function AdminLayout() {
  const { scheme, spacing, borderRadius, typography } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const bp = useBreakpoint();
  const wide = isWide(bp);
  const [drawerOpen, setDrawerOpen] = useState(wide);
  const activeKey = getActiveKey(pathname);

  const handleNav = (item: NavItem) => {
    router.replace(item.route);
    if (!wide) setDrawerOpen(false);
  };

  const sidebar = (
    <View
      style={[
        styles.sidebar,
        {
          width: SIDEBAR_WIDTH,
          backgroundColor: scheme.surface,
          borderRightColor: scheme.outlineVariant,
          paddingTop: insets.top + spacing.md,
        },
      ]}
    >
      <View style={[styles.brand, { paddingHorizontal: spacing.md, marginBottom: spacing.lg }]}>
        <BrandLockup variant="icon" width={40} height={40} />
        <View style={{ marginLeft: spacing.sm }}>
          <Text style={[typography.title.small, styles.brandName, { color: scheme.onSurface }]}>Sauti Yako</Text>
          <Text style={[typography.label.small, { color: scheme.onSurfaceVariant, marginTop: 1 }]}>ADMIN CONSOLE</Text>
        </View>
      </View>

      {!wide && (
        <Pressable onPress={() => setDrawerOpen(false)} style={[styles.closeBtn, { paddingHorizontal: spacing.md, marginBottom: spacing.sm }]}>
          <Ionicons name="close" size={24} color={scheme.onSurfaceVariant} />
        </Pressable>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeKey === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => handleNav(item)}
              style={[
                styles.navItem,
                {
                  marginHorizontal: spacing.sm,
                  borderRadius: borderRadius.md,
                  paddingVertical: spacing.sm + 2,
                  paddingHorizontal: spacing.md,
                },
                isActive && {
                  backgroundColor: scheme.tertiaryContainer + "40",
                  borderLeftWidth: 3,
                  borderLeftColor: scheme.tertiary,
                },
              ]}
            >
              <Ionicons
                name={isActive && item.activeIcon ? item.activeIcon : item.icon}
                size={22}
                color={isActive ? scheme.tertiary : scheme.onSurfaceVariant}
              />
              <Text
                style={[
                  typography.label.large,
                  {
                    color: isActive ? scheme.tertiary : scheme.onSurfaceVariant,
                    marginLeft: spacing.md,
                    fontWeight: isActive ? "700" : "400",
                  },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: scheme.background }]} edges={[]}>
      {wide && sidebar}

      {!wide && drawerOpen && (
        <Pressable style={styles.overlay} onPress={() => setDrawerOpen(false)} />
      )}
      {!wide && drawerOpen && sidebar}

      <View style={styles.content}>
        {!wide && (
          <View
            style={[
              styles.topBar,
              {
                backgroundColor: scheme.surface,
                borderBottomColor: scheme.outlineVariant,
                paddingTop: insets.top,
              },
            ]}
          >
            <Pressable onPress={() => setDrawerOpen(true)} style={{ padding: spacing.sm }}>
              <Ionicons name="menu" size={24} color={scheme.onSurface} />
            </Pressable>
            <View>
              <Text style={[typography.title.small, styles.mobileTitle, { color: scheme.onSurface }]}>Sauti Yako</Text>
              <Text style={[typography.label.small, { color: scheme.onSurfaceVariant }]}>Admin console</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
        )}

        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="analytics" />
          <Stack.Screen name="reports" />
          <Stack.Screen name="user-management" />
          <Stack.Screen name="case-oversight" />
          <Stack.Screen name="audit-logs" />
          <Stack.Screen name="categories" />
          <Stack.Screen name="settings" />
        </Stack>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row" },
  sidebar: { borderRightWidth: 1 },
  brand: { flexDirection: "row", alignItems: "center" },
  brandName: { fontWeight: "800", letterSpacing: 0.2 },
  mobileTitle: { fontWeight: "800" },
  closeBtn: { alignSelf: "flex-end" },
  navItem: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  overlay: { position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 10 },
  content: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, paddingHorizontal: 8, paddingBottom: 8 },
});
