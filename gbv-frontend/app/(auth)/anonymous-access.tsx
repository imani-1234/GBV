import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AxiosError } from "axios";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { authApi } from "../../src/api/auth";
import { useAuthStore } from "../../src/stores/authStore";
import type { AuthTokens, User } from "../../src/types";

type Tab = "register" | "login";
const LILAC = "#A95BEA";

function Field({
  placeholder,
  value,
  onChangeText,
  secure,
  autoCapitalize = "none",
}: {
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  secure?: boolean;
  autoCapitalize?: "none" | "characters";
}) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.inputShell}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8D8A91"
        secureTextEntry={secure && !visible}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={styles.textInput}
      />
      {secure ? <Pressable onPress={() => setVisible((current) => !current)} hitSlop={10}><Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={18} color="#8D8A91" /></Pressable> : null}
    </View>
  );
}

export default function AnonymousAccessScreen() {
  const router = useRouter();
  const anonymousRegister = useAuthStore((state) => state.anonymousRegister as (tokens: AuthTokens, user: User, code: string) => Promise<void>);
  const [activeTab, setActiveTab] = useState<Tab>("register");
  const [createPassword, setCreatePassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [reporterCode, setReporterCode] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const anonymousUser = (code: string): User => ({
    id: "",
    email: "",
    full_name: "",
    role: "REPORTER",
    is_active: true,
    requires_totp: false,
    actor_type: "anonymous",
    reporter_code: code,
  } as User);

  const describeError = (caught: unknown, fallback: string) => {
    if (caught instanceof AxiosError) {
      const data = caught.response?.data;
      if (typeof data?.detail === "string") return data.detail;
      if (Array.isArray(data?.password)) return data.password[0];
      if (!caught.response) return "Network error. Please check your connection.";
    }
    return fallback;
  };

  const createAnonymousAccount = async () => {
    setError(null);
    if (createPassword.length < 8) {
      setError("Use a private password with at least 8 characters.");
      return;
    }
    if (createPassword !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const response = await authApi.anonymousRegister({ password: createPassword });
      const tokens = await authApi.anonymousLogin({ reporter_code: response.reporter_code, password: createPassword });
      await anonymousRegister(tokens, anonymousUser(response.reporter_code), response.reporter_code);
      setGeneratedCode(response.reporter_code);
    } catch (caught) {
      setError(describeError(caught, "We could not create your anonymous account. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const loginAnonymousAccount = async () => {
    setError(null);
    if (!reporterCode.trim() || !loginPassword) {
      setError("Enter your Reporter Code and private password.");
      return;
    }
    setLoading(true);
    try {
      const normalizedCode = reporterCode.trim().toUpperCase();
      const tokens = await authApi.anonymousLogin({ reporter_code: normalizedCode, password: loginPassword });
      await anonymousRegister(tokens, anonymousUser(normalizedCode), normalizedCode);
      router.replace("/(reporter)");
    } catch (caught) {
      setError(describeError(caught, "Invalid Reporter Code or password. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (!generatedCode) return;
    await Clipboard.setStringAsync(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const selectTab = (tab: Tab) => {
    setActiveTab(tab);
    setError(null);
    setGeneratedCode(null);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <View pointerEvents="none" style={styles.lilacArc}><View style={styles.lilacArcInner} /></View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}><Ionicons name="chevron-back" size={31} color="#141115" /></Pressable>
          <View style={styles.content}>
            <Text style={styles.title}>{generatedCode ? "Your Reporter{\n}Code" : "Anonymous{\n}reporting"}</Text>
            {!generatedCode ? <Text style={styles.subtitle}>No name, no email, no personal details.</Text> : <Text style={styles.subtitle}>Save this code somewhere only you can access.</Text>}

            {!generatedCode ? (
              <>
                <View style={styles.tabs}>
                  <Pressable onPress={() => selectTab("register")} style={[styles.tab, activeTab === "register" && styles.tabActive]}><Text style={[styles.tabText, activeTab === "register" && styles.tabTextActive]}>Create account</Text></Pressable>
                  <Pressable onPress={() => selectTab("login")} style={[styles.tab, activeTab === "login" && styles.tabActive]}><Text style={[styles.tabText, activeTab === "login" && styles.tabTextActive]}>Sign in</Text></Pressable>
                </View>

                {activeTab === "register" ? (
                  <>
                    <Text style={styles.intro}>Create a private password. Together with your Reporter Code, it is the only way back to your reports.</Text>
                    <Field placeholder="Private password" value={createPassword} onChangeText={setCreatePassword} secure />
                    <Field placeholder="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secure />
                  </>
                ) : (
                  <>
                    <Text style={styles.intro}>Use the private Reporter Code and password you created earlier.</Text>
                    <Field placeholder="Reporter Code" value={reporterCode} onChangeText={setReporterCode} autoCapitalize="characters" />
                    <Field placeholder="Private password" value={loginPassword} onChangeText={setLoginPassword} secure />
                  </>
                )}
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <Pressable onPress={activeTab === "register" ? createAnonymousAccount : loginAnonymousAccount} disabled={loading} style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed, loading && styles.buttonDisabled]}>
                  {loading ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.primaryButtonText}>{activeTab === "register" ? "Create code" : "Sign in"}</Text><Ionicons name="arrow-forward" size={22} color="#FFFFFF" /></>}
                </Pressable>
                <View style={styles.note}><Ionicons name="lock-closed-outline" size={16} color="#8B475F" /><Text style={styles.noteText}>Your identity is never requested or stored.</Text></View>
              </>
            ) : (
              <>
                <View style={styles.codeCard}><Text style={styles.code}>{generatedCode}</Text><Text style={styles.codeLabel}>This code will not be shown again.</Text></View>
                <Pressable onPress={copyCode} style={({ pressed }) => [styles.copyButton, pressed && styles.buttonPressed]}><Ionicons name={copied ? "checkmark" : "copy-outline"} size={19} color="#7E36B7" /><Text style={styles.copyText}>{copied ? "Copied" : "Copy code"}</Text></Pressable>
                <Pressable onPress={() => router.replace("/(reporter)")} style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}><Text style={styles.primaryButtonText}>Continue</Text><Ionicons name="arrow-forward" size={22} color="#FFFFFF" /></Pressable>
              </>
            )}
            <View style={styles.identityRow}><Text style={styles.identityText}>Prefer to use your identity? </Text><Pressable onPress={() => router.push("/(auth)/register")}><Text style={styles.identityLink}>create account</Text></Pressable></View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "#FEFDFE", overflow: "hidden" },
  scroll: { flexGrow: 1, minHeight: "100%" },
  lilacArc: { position: "absolute", width: 620, height: 500, top: -205, left: -35, backgroundColor: "#E1C1FC", borderRadius: 310, opacity: 0.92 },
  lilacArcInner: { position: "absolute", width: 550, height: 410, left: -75, top: 88, backgroundColor: "#F7EBFF", borderRadius: 275, opacity: 0.76 },
  backButton: { position: "absolute", top: 15, left: 35, zIndex: 2, padding: 4 },
  content: { paddingHorizontal: 42, paddingTop: 264, paddingBottom: 38 },
  title: { color: "#070707", fontSize: 37, lineHeight: 41, fontWeight: "700", letterSpacing: -1.45 },
  subtitle: { color: "#767178", fontSize: 15.5, lineHeight: 22, marginTop: 15 },
  tabs: { flexDirection: "row", marginTop: 31, marginBottom: 24, borderWidth: 1.2, borderColor: "#C0BBC2", borderRadius: 27, padding: 3 },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 23, minHeight: 45 },
  tabActive: { backgroundColor: "#EEE0FB" },
  tabText: { color: "#817B84", fontSize: 12.5, fontWeight: "700" },
  tabTextActive: { color: "#7132AA" },
  intro: { color: "#78727B", fontSize: 13.5, lineHeight: 20, marginBottom: 20 },
  inputShell: { minHeight: 60, borderWidth: 1.4, borderColor: "#B6B1B6", borderRadius: 31, flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginBottom: 16, backgroundColor: "rgba(255,255,255,0.58)" },
  textInput: { flex: 1, paddingVertical: 0, color: "#252228", fontSize: 16, minHeight: 56 },
  errorText: { color: "#B3261E", fontSize: 12.5, lineHeight: 18, marginTop: -5, marginBottom: 9 },
  primaryButton: { minWidth: 154, height: 61, borderRadius: 31, backgroundColor: LILAC, alignSelf: "flex-end", marginTop: 30, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 22, shadowColor: "#A75CDF", shadowOpacity: 0.22, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16.5, fontWeight: "700" },
  buttonPressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  buttonDisabled: { opacity: 0.72 },
  note: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", marginTop: 26, paddingVertical: 10, paddingHorizontal: 13, borderRadius: 20, backgroundColor: "#FFF8FA", borderColor: "#EBD6DE", borderWidth: 1 },
  noteText: { color: "#8B475F", fontSize: 12, fontWeight: "600" },
  codeCard: { borderWidth: 1.5, borderColor: "#AF7CD9", borderRadius: 25, backgroundColor: "#FBF7FF", alignItems: "center", paddingVertical: 30, marginTop: 38 },
  code: { color: "#7636AE", fontSize: 30, fontFamily: "monospace", fontWeight: "800", letterSpacing: 5 },
  codeLabel: { color: "#807887", fontSize: 12.5, marginTop: 14 },
  copyButton: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, marginTop: 15, paddingVertical: 9, paddingHorizontal: 13, borderRadius: 21, backgroundColor: "#F1E2FD" },
  copyText: { color: "#7E36B7", fontSize: 13.5, fontWeight: "700" },
  identityRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 34, justifyContent: "center" },
  identityText: { color: "#817B84", fontSize: 13.5 },
  identityLink: { color: "#7E36B7", fontSize: 13.5, fontWeight: "700" },
});
