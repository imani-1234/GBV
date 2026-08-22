import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../src/theme/ThemeProvider";
import { BrandLockup } from "../src/components/branding/BrandLockup";
import { useAuthStore } from "../src/stores/authStore";
import { authApi } from "../src/api/auth";
import type { User } from "../src/types";

const STORAGE_KEY_REFRESH = "auth_refresh_token";

type AuthGateState = "loading" | "authenticated" | "unauthenticated" | "deactivated" | "session_expired";

export default function AuthGate() {
  const [gateState, setGateState] = useState<AuthGateState>("loading");
  const [gateMessage, setGateMessage] = useState<string>("");
  const login = useAuthStore((s) => s.login);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const { scheme, typography } = useTheme();

  useEffect(() => {
    let cancelled = false;

    async function resolveAuth() {
      // Step 1: Hydrate from persisted store
      await hydrate();
      const storeUser = useAuthStore.getState().user;
      const storeAuthenticated = useAuthStore.getState().isAuthenticated;

      if (!storeAuthenticated || !storeUser) {
        if (!cancelled) setGateState("unauthenticated");
        return;
      }

      // Step 2: Re-verify with backend — silent refresh + getProfile
      try {
        const refreshToken = await SecureStore.getItemAsync(STORAGE_KEY_REFRESH);
        if (refreshToken) {
          const tokens = await authApi.refreshToken(refreshToken);
          // Fresh tokens obtained — now verify profile
          try {
            const profile = await authApi.getProfile();
            if (!profile.is_active) {
              if (!cancelled) {
                setGateMessage("Your account has been deactivated. Please contact an administrator.");
                setGateState("deactivated");
              }
              await clearAuth();
              return;
            }
            // Role changed? Update the store with the backend's view
            await login(tokens, profile);
          } catch {
            // Profile fetch failed — use cached user but update tokens
            await useAuthStore.getState().setTokens(tokens);
          }
        }
        if (!cancelled) setGateState("authenticated");
      } catch {
        // Refresh failed — session expired
        if (!cancelled) {
          setGateMessage("Your session has expired. Please sign in again.");
          setGateState("session_expired");
        }
        await clearAuth();
      }
    }

    resolveAuth();
    return () => { cancelled = true; };
  }, []);

  if (gateState === "loading") {
    return (
      <View style={[styles.container, { backgroundColor: scheme.background }]}>
        <View style={styles.branding}>
          <BrandLockup variant="vertical" width={160} height={240} />
          <Text style={[typography.body.medium, styles.tagline, { color: scheme.onSurfaceVariant }]}>Preparing your secure space…</Text>
        </View>
        <ActivityIndicator size="small" color={scheme.primary} style={{ marginTop: 28 }} />
      </View>
    );
  }

  if (gateState === "deactivated" || gateState === "session_expired") {
    return (
      <View style={[styles.container, { backgroundColor: scheme.background }]}>
        <View style={styles.errorContainer}>
          <View style={[styles.errorIcon, { backgroundColor: scheme.errorContainer }]}>
            <Ionicons
              name={gateState === "deactivated" ? "shield-outline" : "time-outline"}
              size={28}
              color={scheme.error}
            />
          </View>
          <Text style={[typography.title.large, styles.errorTitle, { color: scheme.onBackground }]}>
            {gateState === "deactivated" ? "Account Deactivated" : "Session Expired"}
          </Text>
          <Text style={[typography.body.medium, styles.errorMessage, { color: scheme.onSurfaceVariant }]}>{gateMessage}</Text>
        </View>
        <Redirect href="/(auth)" />
      </View>
    );
  }

  if (gateState === "unauthenticated" || !isAuthenticated || !user) {
    return <Redirect href="/(auth)" />;
  }

  switch (user.role) {
    case "ADMIN":
      return <Redirect href="/(admin)" />;
    case "OFFICER":
      return <Redirect href="/(officer)" />;
    case "REPORTER":
    default:
      return <Redirect href="/(reporter)" />;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  branding: { alignItems: "center" },
  tagline: { marginTop: 4 },
  errorContainer: { alignItems: "center", paddingHorizontal: 32 },
  errorIcon: { width: 64, height: 64, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  errorTitle: { marginTop: 18, marginBottom: 8, textAlign: "center" },
  errorMessage: { textAlign: "center", lineHeight: 21 },
});
