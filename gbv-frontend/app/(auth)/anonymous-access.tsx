import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AxiosError } from "axios";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme/ThemeProvider";
import { Button, TextField } from "../../src/components/ui";
import { authApi } from "../../src/api/auth";
import { useAuthStore } from "../../src/stores/authStore";
import type { User, AuthTokens } from "../../src/types";

type Tab = "register" | "login";

export default function AnonymousAccessScreen() {
  const router = useRouter();
  const { scheme, spacing, borderRadius, typography } = useTheme();
  const login = useAuthStore((s) => s.login as (tokens: AuthTokens, user: User) => Promise<void>);
  const anonymousRegisterAction = useAuthStore((s) => s.anonymousRegister as (tokens: AuthTokens, user: User, code: string) => Promise<void>);
  const setTokens = useAuthStore((s) => s.setTokens);

  const [activeTab, setActiveTab] = useState<Tab>("register");
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Register state
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  // Login state
  const [reporterCode, setReporterCode] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);

  const handleRegister = async () => {
    setApiError(null);
    setIsSubmitting(true);
    try {
      const response = await authApi.anonymousRegister();
      setGeneratedCode(response.reporter_code);

      // If the backend returns tokens + user, auto-login
      if (response.access && response.refresh && response.user) {
        const tokens: AuthTokens = { access: response.access, refresh: response.refresh };
        await anonymousRegisterAction(tokens, response.user, response.reporter_code);
        router.replace("/(reporter)");
      }
    } catch (err) {
      if (err instanceof AxiosError && !err.response) {
        setApiError("Network error. Please check your connection.");
      } else {
        setApiError("Failed to create anonymous account. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = async () => {
    if (generatedCode) {
      await Clipboard.setStringAsync(generatedCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 3000);
    }
  };

  const handleLogin = async () => {
    setLoginError(null);
    if (!reporterCode.trim() || !password.trim()) {
      setLoginError("Please enter your Reporter ID and password.");
      return;
    }
    setIsLoginSubmitting(true);
    try {
      const tokens = await authApi.anonymousLogin({
        reporter_code: reporterCode.trim(),
        password,
      });
      await setTokens(tokens);
      let anonUser: User;
      try {
        anonUser = await authApi.getProfile();
      } catch {
        anonUser = {
          id: "",
          email: "",
          full_name: "",
          role: "REPORTER",
          is_active: true,
          requires_totp: false,
          actor_type: "anonymous",
        };
      }
      await login(tokens, anonUser);
      router.replace("/(reporter)");
    } catch (err) {
      if (err instanceof AxiosError && !err.response) {
        setLoginError("Network error. Please check your connection.");
      } else {
        setLoginError("Invalid Reporter ID or password. Please try again.");
      }
    } finally {
      setIsLoginSubmitting(false);
    }
  };

  const resetFlow = () => {
    setGeneratedCode(null);
    setCodeCopied(false);
    setApiError(null);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: scheme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={scheme.onBackground} />
        </Pressable>

        <Text style={[typography.headline.small, { color: scheme.onBackground, marginBottom: spacing.xs }]}>
          Anonymous Reporting
        </Text>
        <Text style={[typography.body.large, { color: scheme.onSurfaceVariant, marginBottom: spacing.lg }]}>
          No name, no email, no personal information — ever.
        </Text>

        {/* Tab Switcher */}
        <View style={[styles.tabs, { backgroundColor: scheme.surfaceVariant, borderRadius: borderRadius.md }]}>
          <Pressable
            style={[styles.tab, activeTab === "register" && { backgroundColor: scheme.surface, boxShadow: "0px 1px 3px rgba(0,0,0,0.1)", elevation: 2, borderRadius: borderRadius.md }]}
            onPress={() => { setActiveTab("register"); resetFlow(); }}
          >
            <Text style={[typography.label.large, { color: activeTab === "register" ? scheme.onSurface : scheme.onSurfaceVariant }]}>
              First time here
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === "login" && { backgroundColor: scheme.surface, boxShadow: "0px 1px 3px rgba(0,0,0,0.1)", elevation: 2, borderRadius: borderRadius.md }]}
            onPress={() => { setActiveTab("login"); setLoginError(null); }}
          >
            <Text style={[typography.label.large, { color: activeTab === "login" ? scheme.onSurface : scheme.onSurfaceVariant }]}>
              I have a Reporter ID
            </Text>
          </Pressable>
        </View>

        {activeTab === "register" && (
          <View>
            {!generatedCode ? (
              <>
                <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant, marginBottom: spacing.lg, lineHeight: 22 }]}>
                  You will receive a unique Reporter Code that lets you securely access your reports 
                  and receive follow-up messages — without ever sharing your name, email, or any 
                  personal information.
                </Text>

                {apiError && (
                  <View style={[styles.apiError, { backgroundColor: scheme.errorContainer, borderRadius: borderRadius.md }]}>
                    <Ionicons name="alert-circle" size={18} color={scheme.onErrorContainer} style={{ marginRight: 8 }} />
                    <Text style={[typography.body.small, { color: scheme.onErrorContainer, flex: 1 }]}>{apiError}</Text>
                  </View>
                )}

                <Button title="Generate My Reporter Code" variant="filled" size="lg" onPress={handleRegister} loading={isSubmitting} style={{ width: "100%", marginTop: spacing.sm }} />

                <View style={[styles.warningBox, { backgroundColor: scheme.tertiaryContainer, borderRadius: borderRadius.md, marginTop: spacing.lg }]}>
                  <Ionicons name="information-circle" size={20} color={scheme.onTertiaryContainer} />
                  <Text style={[typography.body.small, { color: scheme.onTertiaryContainer, marginLeft: 8, flex: 1 }]}>
                    Your Reporter Code is the only way to access your reports. If you lose it, 
                    we cannot recover it — and all your data will be permanently inaccessible.
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={[styles.successBanner, { backgroundColor: scheme.primaryContainer, borderRadius: borderRadius.lg }]}>
                  <Ionicons name="checkmark-circle" size={32} color={scheme.primary} />
                  <Text style={[typography.title.medium, { color: scheme.onPrimaryContainer, marginTop: spacing.sm, textAlign: "center" }]}>
                    Your Reporter Code
                  </Text>
                </View>

                {/* The BIG reporter code display */}
                <View style={[styles.codeContainer, { backgroundColor: scheme.surfaceVariant, borderRadius: borderRadius.xl, borderColor: scheme.primary, borderWidth: 2 }]}>
                  <Text style={[typography.display.small, { color: scheme.primary, textAlign: "center", letterSpacing: 4, fontFamily: "monospace" }]}>
                    {generatedCode}
                  </Text>
                </View>

                <View style={[styles.warningBox, { backgroundColor: scheme.errorContainer, borderRadius: borderRadius.md }]}>
                  <Ionicons name="warning" size={20} color={scheme.onErrorContainer} />
                  <Text style={[typography.body.small, { color: scheme.onErrorContainer, marginLeft: 8, flex: 1, fontWeight: "600" }]}>
                    This code will never be shown again. There is no way to recover it. 
                    Write it down or save it somewhere safe now.
                  </Text>
                </View>

                <Button
                  title={codeCopied ? "Copied!" : "Copy to Clipboard"}
                  variant="tonal"
                  size="lg"
                  onPress={handleCopyCode}
                  style={{ width: "100%", marginBottom: spacing.sm }}
                  icon={<Ionicons name={codeCopied ? "checkmark" : "copy-outline"} size={20} color={codeCopied ? scheme.onPrimaryContainer : scheme.primary} />}
                />

                <Button title="Continue to Report" variant="filled" size="lg" onPress={() => router.replace("/(reporter)")} style={{ width: "100%" }} />
              </>
            )}
          </View>
        )}

        {activeTab === "login" && (
          <View>
            <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant, marginBottom: spacing.lg }]}>
              Use your Reporter ID and password to access your reports and messages.
            </Text>

            {loginError && (
              <View style={[styles.apiError, { backgroundColor: scheme.errorContainer, borderRadius: borderRadius.md }]}>
                <Ionicons name="alert-circle" size={18} color={scheme.onErrorContainer} style={{ marginRight: 8 }} />
                <Text style={[typography.body.small, { color: scheme.onErrorContainer, flex: 1 }]}>{loginError}</Text>
              </View>
            )}

            <TextField
              label="Reporter ID"
              value={reporterCode}
              onChangeText={setReporterCode}
              containerStyle={{ marginBottom: spacing.sm }}
              autoCapitalize="characters"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              containerStyle={{ marginBottom: spacing.md }}
            />

            <Button title="Sign In Anonymously" variant="filled" size="lg" onPress={handleLogin} loading={isLoginSubmitting} style={{ width: "100%", marginBottom: spacing.md }} />
          </View>
        )}

        <View style={styles.footer}>
          <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant }]}>Prefer to use your name and email? </Text>
          <Pressable onPress={() => router.push("/(auth)/register")}>
            <Text style={[typography.body.medium, { color: scheme.primary, fontWeight: "600" }]}>Register here</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 40 },
  back: { marginBottom: 16, alignSelf: "flex-start" },
  tabs: { flexDirection: "row", padding: 4, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  apiError: { flexDirection: "row", alignItems: "center", padding: 12, marginBottom: 16 },
  successBanner: { alignItems: "center", padding: 20, marginBottom: 24 },
  codeContainer: { paddingVertical: 28, paddingHorizontal: 16, alignItems: "center", marginBottom: 16 },
  warningBox: { flexDirection: "row", alignItems: "center", padding: 14, marginBottom: 16 },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 24, flexWrap: "wrap" },
});
