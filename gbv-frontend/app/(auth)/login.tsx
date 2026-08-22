import { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Switch as RNSwitch } from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AxiosError } from "axios";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme/ThemeProvider";
import { Button, TextField } from "../../src/components/ui";
import { authApi } from "../../src/api/auth";
import { useAuthStore } from "../../src/stores/authStore";
import type { AuthTokens } from "../../src/types";

const REMEMBER_EMAIL_KEY = "gbv_remember_email";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const { scheme, spacing, typography } = useTheme();
  const login = useAuthStore((s) => s.login);
  const [apiError, setApiError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  const { control, handleSubmit, setValue, formState: { errors, isValid, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    AsyncStorage.getItem(REMEMBER_EMAIL_KEY).then((email) => {
      if (email) {
        setValue("email", email);
        setRememberMe(true);
      }
    });
  }, []);

  const onSubmit = async (data: LoginFormData) => {
    setApiError(null);
    try {
      const tokens = await authApi.login({ email: data.email, password: data.password });
      await useAuthStore.getState().setTokens(tokens);
      const user = await authApi.getProfile(tokens.access);
      await login(tokens, user);
      if (rememberMe) {
        await AsyncStorage.setItem(REMEMBER_EMAIL_KEY, data.email);
      } else {
        await AsyncStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
      const dest = user.role === "ADMIN" ? "/(admin)" : user.role === "OFFICER" ? "/(officer)" : "/(reporter)";
      router.replace(dest);
    } catch (err) {
      if (err instanceof AxiosError) {
        if (!err.response) {
          setApiError("Network error. Please check your connection.");
        } else {
          const detail = err.response.data?.detail || err.response.data?.error;
          setApiError(detail || "Invalid email or password. Please try again.");
        }
      } else {
        setApiError("An unexpected error occurred.");
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: scheme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={scheme.onBackground} />
        </Pressable>

        <Text style={[typography.headline.small, { color: scheme.onBackground, marginBottom: spacing.xs }]}>
          Welcome back
        </Text>
        <Text style={[typography.body.large, { color: scheme.onSurfaceVariant, marginBottom: spacing.lg }]}>
          Sign in to your account
        </Text>

        {apiError && (
          <View style={[styles.apiError, { backgroundColor: scheme.errorContainer }]}>
            <Ionicons name="alert-circle" size={18} color={scheme.onErrorContainer} style={{ marginRight: 8 }} />
            <Text style={[typography.body.small, { color: scheme.onErrorContainer, flex: 1 }]}>{apiError}</Text>
          </View>
        )}

        <Controller control={control} name="email" render={({ field: { onChange, onBlur, value } }) => (
          <TextField label="Email" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.email?.message} keyboardType="email-address" autoCapitalize="none" containerStyle={{ marginBottom: spacing.sm }} />
        )} />

        <Controller control={control} name="password" render={({ field: { onChange, onBlur, value } }) => (
          <TextField label="Password" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.password?.message} secureTextEntry containerStyle={{ marginBottom: spacing.sm }} />
        )} />

        <View style={styles.rememberRow}>
          <View style={styles.rememberToggle}>
            <RNSwitch
              value={rememberMe}
              onValueChange={setRememberMe}
              trackColor={{ false: scheme.surfaceVariant, true: scheme.primaryContainer }}
              thumbColor={rememberMe ? scheme.primary : scheme.outline}
            />
            <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant, marginLeft: 8 }]}>Remember me</Text>
          </View>
          <Pressable onPress={() => router.push("/(auth)/forgot-password")}>
            <Text style={[typography.body.medium, { color: scheme.primary, fontWeight: "500" }]}>Forgot password?</Text>
          </Pressable>
        </View>

        <Button title="Sign In" variant="filled" size="lg" onPress={handleSubmit(onSubmit)} disabled={!isValid} loading={isSubmitting} style={{ width: "100%", marginTop: spacing.md, marginBottom: spacing.md }} />

        <View style={styles.footer}>
          <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant }]}>Don't have an account? </Text>
          <Pressable onPress={() => router.push("/(auth)/register")}>
            <Text style={[typography.body.medium, { color: scheme.primary, fontWeight: "600" }]}>Create one</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => router.push("/(auth)/anonymous-access")} style={[styles.anonymousLink, { borderColor: scheme.outlineVariant, borderRadius: 12 }]}>
          <Ionicons name="eye-off-outline" size={20} color={scheme.onSurfaceVariant} />
          <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant, marginLeft: 8 }]}>Prefer to report anonymously?</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 40 },
  back: { marginBottom: 16, alignSelf: "flex-start" },
  apiError: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 8, marginBottom: 16 },
  rememberRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  rememberToggle: { flexDirection: "row", alignItems: "center" },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 8 },
  anonymousLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderWidth: 1.5, marginTop: 24 },
});
