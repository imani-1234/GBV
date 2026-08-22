import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SafeAreaView } from "react-native-safe-area-context";
import { AxiosError } from "axios";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme/ThemeProvider";
import { Button, TextField } from "../../src/components/ui";
import { authApi } from "../../src/api/auth";
import { useAuthStore } from "../../src/stores/authStore";
import type { User } from "../../src/types";

const registerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().optional(),
  department: z.string().optional(),
  password: z.string().min(1, "Password is required"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const router = useRouter();
  const { scheme, spacing, borderRadius, typography } = useTheme();
  const login = useAuthStore((s) => s.login);
  const [apiError, setApiError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors, isValid, isSubmitting } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    defaultValues: { fullName: "", email: "", phone: "", department: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setApiError(null);
    try {
      await authApi.register({
        full_name: data.fullName,
        email: data.email,
        password: data.password,
        phone_number: data.phone || undefined,
      });
      const tokens = await authApi.login({ email: data.email, password: data.password });
      await useAuthStore.getState().setTokens(tokens);
      const user = await authApi.getProfile(tokens.access);
      await login(tokens, user);
      router.replace("/(reporter)");
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const detail = err.response.data.detail || err.response.data.error;
        if (detail) setApiError(detail);
        else setApiError("Registration failed. Please try again.");
      } else {
        setApiError("Network error. Please check your connection.");
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
          Create Account
        </Text>
        <Text style={[typography.body.large, { color: scheme.onSurfaceVariant, marginBottom: spacing.lg }]}>
          Join with your identity for proffessional support.
        </Text>

        {apiError && (
          <View style={[styles.apiError, { backgroundColor: scheme.errorContainer, borderRadius: borderRadius.md }]}>
            <Text style={[typography.body.small, { color: scheme.onErrorContainer }]}>{apiError}</Text>
          </View>
        )}

        <Controller control={control} name="fullName" render={({ field: { onChange, onBlur, value } }) => (
          <TextField label="Full Name" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.fullName?.message} containerStyle={{ marginBottom: spacing.sm }} />
        )} />

        <Controller control={control} name="email" render={({ field: { onChange, onBlur, value } }) => (
          <TextField label="Email" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.email?.message} keyboardType="email-address" autoCapitalize="none" containerStyle={{ marginBottom: spacing.sm }} />
        )} />

        <Controller control={control} name="phone" render={({ field: { onChange, onBlur, value } }) => (
          <TextField label="Phone (optional)" value={value || ""} onChangeText={onChange} onBlur={onBlur} error={errors.phone?.message} keyboardType="phone-pad" containerStyle={{ marginBottom: spacing.sm }} />
        )} />

        <Controller control={control} name="department" render={({ field: { onChange, onBlur, value } }) => (
          <TextField label="Department / Faculty (optional)" value={value || ""} onChangeText={onChange} onBlur={onBlur} error={errors.department?.message} containerStyle={{ marginBottom: spacing.sm }} />
        )} />

        <Controller control={control} name="password" render={({ field: { onChange, onBlur, value } }) => (
          <TextField label="Password" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.password?.message} secureTextEntry containerStyle={{ marginBottom: spacing.sm }} />
        )} />

        <Controller control={control} name="confirmPassword" render={({ field: { onChange, onBlur, value } }) => (
          <TextField label="Confirm Password" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.confirmPassword?.message} secureTextEntry containerStyle={{ marginBottom: spacing.lg }} />
        )} />

        <Button title="Create Account" variant="filled" size="lg" onPress={handleSubmit(onSubmit)} disabled={!isValid} loading={isSubmitting} style={{ width: "100%", marginBottom: spacing.md }} />

        <View style={styles.footer}>
          <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant }]}>Already have an account? </Text>
          <Pressable onPress={() => router.push("/(auth)/login")}>
            <Text style={[typography.body.medium, { color: scheme.primary, fontWeight: "600" }]}>Sign in</Text>
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
  apiError: { padding: 12, marginBottom: 16 },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 8 },
});
