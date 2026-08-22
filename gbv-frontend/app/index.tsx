import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
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
      <View style={styles.container}>
        <View style={styles.branding}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={40} color="#6C63FF" />
          </View>
          <Text style={styles.appName}>Imani</Text>
          <Text style={styles.tagline}>Safe reporting. Real support.</Text>
        </View>
        <ActivityIndicator size="large" color="#6C63FF" style={{ marginTop: 48 }} />
      </View>
    );
  }

  if (gateState === "deactivated" || gateState === "session_expired") {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons
            name={gateState === "deactivated" ? "shield-exclamation" : "time-outline"}
            size={48}
            color="#EF4444"
          />
          <Text style={styles.errorTitle}>
            {gateState === "deactivated" ? "Account Deactivated" : "Session Expired"}
          </Text>
          <Text style={styles.errorMessage}>{gateMessage}</Text>
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
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" },
  branding: { alignItems: "center" },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#EDECFF", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  appName: { fontSize: 28, fontWeight: "700", color: "#1C1B1F", marginBottom: 4 },
  tagline: { fontSize: 16, color: "#79767A" },
  errorContainer: { alignItems: "center", paddingHorizontal: 32 },
  errorTitle: { fontSize: 20, fontWeight: "700", color: "#1C1B1F", marginTop: 16, marginBottom: 8 },
  errorMessage: { fontSize: 14, color: "#79767A", textAlign: "center", lineHeight: 20 },
});
