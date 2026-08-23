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
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SafeAreaView } from "react-native-safe-area-context";
import { AxiosError } from "axios";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { authApi } from "../../src/api/auth";
import { useAuthStore } from "../../src/stores/authStore";

const LILAC = "#A95BEA";
const registerSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Use at least 8 characters"),
});
type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    defaultValues: { fullName: "", email: "", password: "" },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setApiError(null);
    try {
      await authApi.register({ full_name: data.fullName, email: data.email, password: data.password });
      const tokens = await authApi.login({ email: data.email, password: data.password });
      await useAuthStore.getState().setTokens(tokens);
      const user = await authApi.getProfile(tokens.access);
      await login(tokens, user);
      router.replace("/(reporter)");
    } catch (error) {
      if (error instanceof AxiosError && error.response?.data) {
        setApiError(error.response.data.detail || error.response.data.error || "Registration failed. Please try again.");
      } else {
        setApiError("Network error. Please check your connection.");
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <View pointerEvents="none" style={styles.lilacArc}>
        <View style={styles.lilacArcInner} />
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
            <Ionicons name="chevron-back" size={31} color="#141115" />
          </Pressable>
          <View style={styles.content}>
            <Text style={styles.title}>Create account</Text>
            <View style={styles.captionRow}>
              <Text style={styles.caption}>Already have an account? </Text>
              <Pressable onPress={() => router.replace("/(auth)/login")} hitSlop={8}>
                <Text style={styles.captionLink}>sign in</Text>
              </Pressable>
            </View>

            {apiError ? <Text style={styles.errorText}>{apiError}</Text> : null}

            <Controller
              control={control}
              name="fullName"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <View style={styles.inputShell}><TextInput value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Name" placeholderTextColor="#8D8A91" style={styles.textInput} accessibilityLabel="Full name" /></View>
                  {errors.fullName?.message ? <Text style={styles.fieldError}>{errors.fullName.message}</Text> : null}
                </View>
              )}
            />
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <View style={styles.inputShell}><TextInput value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Email or phone" placeholderTextColor="#8D8A91" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} style={styles.textInput} accessibilityLabel="Email address" /></View>
                  {errors.email?.message ? <Text style={styles.fieldError}>{errors.email.message}</Text> : null}
                </View>
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <View style={styles.inputShell}>
                    <TextInput value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Password" placeholderTextColor="#8D8A91" secureTextEntry={!showPassword} autoCapitalize="none" style={styles.textInput} accessibilityLabel="Password" />
                    <Pressable onPress={() => setShowPassword((visible) => !visible)} hitSlop={8}><Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color="#8D8A91" /></Pressable>
                  </View>
                  {errors.password?.message ? <Text style={styles.fieldError}>{errors.password.message}</Text> : null}
                </View>
              )}
            />

            <Pressable
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed, isSubmitting && styles.buttonDisabled]}
            >
              {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.buttonText}>Sign up</Text><Ionicons name="log-in-outline" size={24} color="#FFFFFF" /></>}
            </Pressable>
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
  content: { paddingHorizontal: 48, paddingTop: 312, paddingBottom: 48 },
  title: { color: "#070707", fontSize: 37, lineHeight: 44, fontWeight: "700", letterSpacing: -1.2 },
  captionRow: { flexDirection: "row", alignItems: "center", marginTop: 14, marginBottom: 27 },
  caption: { color: "#767178", fontSize: 16, lineHeight: 21, fontWeight: "400" },
  captionLink: { color: "#8038BF", fontSize: 16, lineHeight: 21, fontWeight: "700" },
  errorText: { color: "#B3261E", fontSize: 13, marginBottom: 10, lineHeight: 18 },
  inputShell: { minHeight: 61, borderWidth: 1.4, borderColor: "#B6B1B6", borderRadius: 32, flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginBottom: 20, backgroundColor: "rgba(255,255,255,0.58)" },
  textInput: { flex: 1, paddingVertical: 0, color: "#252228", fontSize: 16, minHeight: 58 },
  fieldError: { color: "#B3261E", fontSize: 12, marginTop: -14, marginBottom: 14, marginLeft: 15 },
  primaryButton: { minWidth: 151, height: 61, borderRadius: 31, backgroundColor: LILAC, alignSelf: "flex-end", marginTop: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 21, shadowColor: "#A75CDF", shadowOpacity: 0.22, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  buttonPressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  buttonDisabled: { opacity: 0.72 },
  buttonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
});
