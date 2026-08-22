import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/theme/ThemeProvider";
import { Button, TextField } from "../../src/components/ui";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { scheme, spacing, borderRadius, typography } = useTheme();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (email.trim()) setSent(true);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: scheme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={scheme.onBackground} />
        </Pressable>

        {!sent ? (
          <>
            <View style={styles.headerIcon}>
              <Ionicons name="lock-open-outline" size={40} color={scheme.primary} />
            </View>
            <Text style={[typography.headline.small, { color: scheme.onBackground, marginBottom: spacing.xs }]}>
              Reset password
            </Text>
            <Text style={[typography.body.large, { color: scheme.onSurfaceVariant, marginBottom: spacing.lg }]}>
              Enter your email address and we will send you a link to reset your password.
            </Text>
            <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" containerStyle={{ marginBottom: spacing.lg }} />
            <Button title="Send Reset Link" variant="filled" size="lg" onPress={handleSend} disabled={!email.trim()} style={{ width: "100%" }} />
          </>
        ) : (
          <View style={styles.sentContainer}>
            <View style={[styles.sentIcon, { backgroundColor: scheme.primaryContainer }]}>
              <Ionicons name="checkmark-circle" size={48} color={scheme.primary} />
            </View>
            <Text style={[typography.title.large, { color: scheme.onBackground, textAlign: "center", marginTop: spacing.md }]}>
              Check your email
            </Text>
            <Text style={[typography.body.large, { color: scheme.onSurfaceVariant, textAlign: "center", marginTop: spacing.xs, marginBottom: spacing.lg }]}>
              If an account exists for {email}, you will receive a password reset link shortly.
            </Text>
            <Button title="Back to Sign In" variant="tonal" size="lg" onPress={() => router.push("/(auth)/login")} style={{ width: "100%" }} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 40 },
  back: { marginBottom: 16, alignSelf: "flex-start" },
  headerIcon: { marginBottom: 16 },
  sentContainer: { alignItems: "center", paddingTop: 40 },
  sentIcon: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
});
