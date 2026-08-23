import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

const LILAC = "#A95BEA";

export default function LandingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <View pointerEvents="none" style={styles.lilacArc}>
        <View style={styles.lilacArcInner} />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.brand}>SAUTI YAKO</Text>
          <Text style={styles.title}>Your voice{`\n`}matters.</Text>
          <Text style={styles.subtitle}>
            A safe, confidential space to share your experience and find the support you need.
          </Text>

          <Pressable
            onPress={() => router.push("/(auth)/reporting-mode")}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.primaryButtonText}>Get started</Text>
            <Ionicons name="arrow-forward" size={23} color="#FFFFFF" />
          </Pressable>

          <View style={styles.accountRow}>
            <Text style={styles.accountText}>Already have an account? </Text>
            <Pressable onPress={() => router.push("/(auth)/login")} hitSlop={8}>
              <Text style={styles.accountLink}>sign in</Text>
            </Pressable>
          </View>

          <Pressable onPress={() => router.push("/(auth)/register")} style={styles.secondaryAction}>
            <Text style={styles.secondaryText}>Create account</Text>
            <Ionicons name="arrow-forward" size={18} color="#7E36B7" />
          </Pressable>
        </View>

        <Pressable onPress={() => router.push("/(auth)/resources")} style={styles.helpLink}>
          <Ionicons name="heart-outline" size={19} color="#8B475F" />
          <Text style={styles.helpText}>I need immediate help</Text>
          <Ionicons name="chevron-forward" size={18} color="#8B475F" />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FEFDFE", overflow: "hidden" },
  scroll: { flexGrow: 1, minHeight: "100%" },
  lilacArc: { position: "absolute", width: 620, height: 500, top: -205, left: -215, backgroundColor: "#E1C1FC", borderRadius: 310, opacity: 0.92 },
  lilacArcInner: { position: "absolute", width: 550, height: 410, left: 75, top: 88, backgroundColor: "#F7EBFF", borderRadius: 275, opacity: 0.76 },
  content: { paddingHorizontal: 48, paddingTop: 248 },
  brand: { color: "#7E36B7", fontSize: 12, lineHeight: 18, fontWeight: "800", letterSpacing: 2.1, marginBottom: 22 },
  title: { color: "#070707", fontSize: 43, lineHeight: 47, fontWeight: "700", letterSpacing: -1.8 },
  subtitle: { color: "#767178", fontSize: 16, lineHeight: 24, marginTop: 20, maxWidth: 292 },
  primaryButton: { height: 61, borderRadius: 31, backgroundColor: LILAC, alignSelf: "flex-start", marginTop: 55, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 11, paddingHorizontal: 24, shadowColor: "#A75CDF", shadowOpacity: 0.22, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  buttonPressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  accountRow: { flexDirection: "row", alignItems: "center", marginTop: 38 },
  accountText: { color: "#767178", fontSize: 15.5, lineHeight: 21 },
  accountLink: { color: "#8038BF", fontSize: 15.5, lineHeight: 21, fontWeight: "700" },
  secondaryAction: { flexDirection: "row", alignSelf: "flex-start", alignItems: "center", gap: 7, marginTop: 17, paddingVertical: 7 },
  secondaryText: { color: "#7E36B7", fontSize: 16, fontWeight: "700" },
  helpLink: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: "auto", marginHorizontal: 48, marginBottom: 28, paddingVertical: 15, paddingHorizontal: 17, borderColor: "#E7D4DB", borderWidth: 1, borderRadius: 28, backgroundColor: "#FFF9FA" },
  helpText: { flex: 1, color: "#8B475F", fontSize: 14, fontWeight: "650" },
});
