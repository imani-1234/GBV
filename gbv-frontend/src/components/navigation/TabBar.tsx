import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeProvider";

export interface TabDefinition {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon?: keyof typeof Ionicons.glyphMap;
  badge?: number;
}

interface TabBarProps {
  tabs: TabDefinition[];
  activeTab: string;
  onTabPress: (key: string) => void;
}

export function TabBar({ tabs, activeTab, onTabPress }: TabBarProps) {
  const { scheme, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "ios" ? insets.bottom : Math.max(insets.bottom, 4);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: scheme.surface,
          borderTopColor: scheme.outlineVariant,
          paddingBottom: bottomPad,
        },
      ]}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const color = isActive ? scheme.navActiveTint : scheme.navInactiveTint;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onTabPress(tab.key)}
            style={styles.tab}
          >
            <View style={styles.iconWrap}>
              <Ionicons
                name={isActive && tab.activeIcon ? tab.activeIcon : tab.icon}
                size={24}
                color={color}
              />
              {tab.badge != null && tab.badge > 0 && (
                <View style={[styles.badge, { backgroundColor: scheme.error }]}>
                  <Text style={[typography.label.small, { color: scheme.onError, fontSize: 10, lineHeight: 14 }]}>
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                typography.label.small,
                { color, fontSize: 11, marginTop: 2 },
                isActive && { fontWeight: "700" },
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 6,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  iconWrap: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
});
