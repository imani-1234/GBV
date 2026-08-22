import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/ThemeProvider";
import { BrandLockup } from "../branding/BrandLockup";
import type { TabDefinition } from "./TabBar";

interface SideRailProps {
  tabs: TabDefinition[];
  activeTab: string;
  onTabPress: (key: string) => void;
}

const SIDE_RAIL_WIDTH = 220;

export function SideRail({ tabs, activeTab, onTabPress }: SideRailProps) {
  const { scheme, spacing, borderRadius, typography } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          width: SIDE_RAIL_WIDTH,
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
          <Text style={[typography.label.small, { color: scheme.onSurfaceVariant, marginTop: 1 }]}>SUZA • ZANZIBAR</Text>
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const color = isActive ? scheme.navActiveTint : scheme.navInactiveTint;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onTabPress(tab.key)}
              style={[
                styles.navItem,
                {
                  marginHorizontal: spacing.sm,
                  borderRadius: borderRadius.md,
                  paddingVertical: spacing.sm + 2,
                  paddingHorizontal: spacing.md,
                },
                isActive && {
                  backgroundColor: scheme.primaryContainer + "40",
                },
              ]}
            >
              <Ionicons
                name={isActive && tabs.find((t) => t.key === tab.key)?.activeIcon || tab.icon}
                size={22}
                color={color}
              />
              <Text
                style={[
                  typography.label.large,
                  { color, marginLeft: spacing.md, flex: 1 },
                  isActive && { fontWeight: "700" },
                ]}
              >
                {tab.label}
              </Text>
              {tab.badge != null && tab.badge > 0 && (
                <View style={[styles.badge, { backgroundColor: scheme.error }]}>
                  <Text style={[typography.label.small, { color: scheme.onError, fontSize: 10 }]}>
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRightWidth: 1 },
  brand: { flexDirection: "row", alignItems: "center" },
  brandName: { fontWeight: "800", letterSpacing: 0.2 },
  navItem: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  badge: { minWidth: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
});
