import { useEffect, useState } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AxiosError } from "axios";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { authApi } from "../../src/api/auth";
import { useAuthStore } from "../../src/stores/authStore";

const REMEMBER_EMAIL_KEY = "gbv_remember_email";
const LILAC = "#A95BEA";
const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
type LoginFormData = z.infer<typeof loginSchema>;

function SocialRow() {
  return (
    <View style={styles.socialRow} accessibilityLabel="Social sign-in options coming soon">
      <Ionicons name="logo-apple" size={28} color="#090909" />
      <Ionicons name="logo-facebook" size={29} color="#2774D6" />
      <Ionicons name="logo-google" size={27} color="#4285F4" />
      <Ionicons name="logo-twitter" size={29} color="#2A91DC" />
    </View>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { control, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    AsyncStorage.getItem(REMEMBER_EMAIL_KEY).then((email) => {
      if (email) setValue("email", email);
    });
  }, [setValue]);

  const onSubmit = async (data: LoginFormData) => {
    setApiError(null);
    try {
      const tokens = await authApi.login({ email: data.email, password: data.password });
      await useAuthStore.getState().setTokens(tokens);
      const user = await authApi.getProfile(tokens.access);
      await login(tokens, user);
      await AsyncStorage.setItem(REMEMBER_EMAIL_KEY, data.email);
      const destination = user.role === "ADMIN" ? "/(admin)" : user.role === "OFFICER" ? "/(officer)" : "/(reporter)";
      router.replace(destination);
    } catch (error) {
      if (error instanceof AxiosError) {
        const detail = error.response?.data?.detail || error.response?.data?.error;
        setApiError(detail || (error.response ? "Invalid email or password. Please try again." : "Network error. Please check your connection."));
      } else {
        setApiError("An unexpected error occurred.");
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
          <View style={styles.loginContent}>
            <Text style={styles.title}>Login</Text>
            <View style={styles.captionRow}>
              <Text style={styles.caption}>Don’t have an account? </Text>
              <Pressable onPress={() => router.replace("/(auth)/register")} hitSlop={8}>
                <Text style={styles.captionLink}>sign up</Text>
              </Pressable>
            </View>

            {apiError ? <Text style={styles.errorText}>{apiError}</Text> : null}

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <View style={styles.inputShell}>
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Email or phone"
                      placeholderTextColor="#8D8A91"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.textInput}
                      accessibilityLabel="Email address"
                    />
                  </View>
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
                    <Ionicons name="lock-closed-outline" size={19} color="#8D8A91" style={styles.lockIcon} />
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="Password"
                      placeholderTextColor="#8D8A91"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      style={[styles.textInput, styles.passwordInput]}
                      accessibilityLabel="Password"
                    />
                    <Pressable onPress={() => router.push("/(auth)/forgot-password")} hitSlop={8}>
                      <Text style={styles.forgotText}>FORGOT</Text>
                    </Pressable>
                    <Pressable onPress={() => setShowPassword((visible) => !visible)} hitSlop={8} style={styles.eyeButton}>
                      <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={17} color="#8D8A91" />
                    </Pressable>
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
              {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.buttonText}>Login</Text><Ionicons name="log-in-outline" size={24} color="#FFFFFF" /></>}
            </Pressable>
          </View>
          <SocialRow />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "#FEFDFE", overflow: "hidden" },
  scroll: { flexGrow: 1, minHeight: "100%" },
  lilacArc: { position: "absolute", width: 620, height: 500, top: -205, left: -215, backgroundColor: "#E1C1FC", borderRadius: 310, opacity: 0.92 },
  lilacArcInner: { position: "absolute", width: 550, height: 410, left: 75, top: 88, backgroundColor: "#F7EBFF", borderRadius: 275, opacity: 0.76 },
  loginContent: { paddingHorizontal: 48, paddingTop: 322 },
  title: { color: "#070707", fontSize: 38, lineHeight: 45, fontWeight: "700", letterSpacing: -1.25 },
  captionRow: { flexDirection: "row", alignItems: "center", marginTop: 14, marginBottom: 55 },
  caption: { color: "#767178", fontSize: 16, lineHeight: 21, fontWeight: "400" },
  captionLink: { color: "#8038BF", fontSize: 16, lineHeight: 21, fontWeight: "700" },
  errorText: { color: "#B3261E", fontSize: 13, marginBottom: 10, lineHeight: 18 },
  inputShell: { minHeight: 61, borderWidth: 1.4, borderColor: "#B6B1B6", borderRadius: 32, flexDirection: "row", alignItems: "center", paddingHorizontal: 21, marginBottom: 20, backgroundColor: "rgba(255,255,255,0.58)" },
  textInput: { flex: 1, paddingVertical: 0, color: "#252228", fontSize: 16, minHeight: 58 },
  passwordInput: { marginLeft: 13 },
  lockIcon: { marginLeft: -2 },
  forgotText: { color: "#813BBC", fontSize: 12, fontWeight: "800", letterSpacing: 0.15 },
  eyeButton: { marginLeft: 8 },
  fieldError: { color: "#B3261E", fontSize: 12, marginTop: -14, marginBottom: 14, marginLeft: 15 },
  primaryButton: { minWidth: 151, height: 61, borderRadius: 31, backgroundColor: LILAC, alignSelf: "flex-end", marginTop: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 21, shadowColor: "#A75CDF", shadowOpacity: 0.22, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  buttonPressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  buttonDisabled: { opacity: 0.72 },
  buttonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  socialRow: { marginTop: "auto", paddingTop: 85, paddingBottom: 30, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 30 },
});
