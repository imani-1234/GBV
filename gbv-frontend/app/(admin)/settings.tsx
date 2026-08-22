import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme/ThemeProvider";
import { Button, Divider } from "../../src/components/ui";
import { useAuthStore } from "../../src/stores/authStore";
import { authApi } from "../../src/api/auth";

const STORAGE_KEY_REFRESH = "auth_refresh_token";

export default function AdminSettingsScreen() {
  const router = useRouter();
  const { scheme, spacing, borderRadius, typography } = useTheme();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const refreshToken = await SecureStore.getItemAsync(STORAGE_KEY_REFRESH);
      if (refreshToken) {
        await authApi.logout(refreshToken).catch(() => {});
      }
    } catch {}
    await clearAuth();
    router.replace("/(auth)");
  };

  const confirmLogout = () => {
    if (Platform.OS === "web") {
      handleLogout();
    } else {
      Alert.alert("Logout", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: handleLogout },
      ]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: scheme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[typography.headline.small, { color: scheme.onBackground, marginBottom: spacing.lg }]}>Settings</Text>

        {user && (
          <View style={[styles.profileCard, { backgroundColor: scheme.surface, borderRadius: borderRadius.xl, borderColor: scheme.outlineVariant }]}>
            <View style={[styles.avatar, { backgroundColor: scheme.tertiaryContainer }]}>
              <Text style={[typography.title.large, { color: scheme.tertiary }]}>
                {user.full_name?.charAt(0)?.toUpperCase() || "A"}
              </Text>
            </View>
            <View style={{ marginLeft: spacing.md, flex: 1 }}>
              <Text style={[typography.title.medium, { color: scheme.onSurface }]}>{user.full_name || "Admin"}</Text>
              <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant }]}>{user.email}</Text>
            </View>
          </View>
        )}

        <Divider />

        <Pressable style={styles.menuItem} onPress={() => {}}>
          <Ionicons name="shield-outline" size={22} color={scheme.onSurface} />
          <Text style={[typography.body.large, { color: scheme.onSurface, flex: 1, marginLeft: spacing.md }]}>System Security</Text>
          <Ionicons name="chevron-forward" size={18} color={scheme.onSurfaceVariant} />
        </Pressable>

        <Pressable style={styles.menuItem} onPress={() => {}}>
          <Ionicons name="notifications-outline" size={22} color={scheme.onSurface} />
          <Text style={[typography.body.large, { color: scheme.onSurface, flex: 1, marginLeft: spacing.md }]}>Notification Preferences</Text>
          <Ionicons name="chevron-forward" size={18} color={scheme.onSurfaceVariant} />
        </Pressable>

        <Pressable style={styles.menuItem} onPress={() => {}}>
          <Ionicons name="information-circle-outline" size={22} color={scheme.onSurface} />
          <Text style={[typography.body.large, { color: scheme.onSurface, flex: 1, marginLeft: spacing.md }]}>About</Text>
          <Text style={[typography.body.small, { color: scheme.onSurfaceVariant }]}>v1.0.0</Text>
        </Pressable>

        <Divider />

        <Button title="Sign Out" variant="outlined" size="lg" onPress={confirmLogout} loading={loggingOut} style={{ width: "100%", marginTop: spacing.md }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 40 },
  profileCard: { flexDirection: "row", alignItems: "center", padding: 16, borderWidth: 1, marginBottom: 8 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 16 },
});
