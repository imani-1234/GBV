import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

export default function ReportingModeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <View pointerEvents="none" style={styles.lilacArc}><View style={styles.lilacArcInner} /></View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
          <Ionicons name="chevron-back" size={31} color="#141115" />
        </Pressable>
        <View style={styles.content}>
          <Text style={styles.title}>How would you{`\n`}like to report?</Text>
          <Text style={styles.subtitle}>Choose the option that feels safest for you.</Text>

          <Pressable onPress={() => router.push("/(auth)/register")} style={({ pressed }) => [styles.choiceCard, pressed && styles.cardPressed]}>
            <View style={styles.iconCircle}><Ionicons name="person-outline" size={24} color="#813BBC" /></View>
            <View style={styles.choiceBody}>
              <Text style={styles.choiceTitle}>With my identity</Text>
              <Text style={styles.choiceText}>Share your name and contact details so our support team can follow up.</Text>
            </View>
            <Ionicons name="chevron-forward" size={21} color="#813BBC" />
          </Pressable>

          <Pressable onPress={() => router.push("/(auth)/anonymous-access")} style={({ pressed }) => [styles.choiceCard, pressed && styles.cardPressed]}>
            <View style={styles.iconCircle}><Ionicons name="eye-off-outline" size={24} color="#813BBC" /></View>
            <View style={styles.choiceBody}>
              <Text style={styles.choiceTitle}>Anonymously</Text>
              <Text style={styles.choiceText}>No name, email, or personal details. You will receive a private Reporter Code.</Text>
            </View>
            <Ionicons name="chevron-forward" size={21} color="#813BBC" />
          </Pressable>

          <View style={styles.assurance}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#8B475F" />
            <Text style={styles.assuranceText}>Both options are private and handled with care.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FEFDFE", overflow: "hidden" },
  scroll: { flexGrow: 1, minHeight: "100%" },
  lilacArc: { position: "absolute", width: 620, height: 500, top: -205, left: -35, backgroundColor: "#E1C1FC", borderRadius: 310, opacity: 0.92 },
  lilacArcInner: { position: "absolute", width: 550, height: 410, left: -75, top: 88, backgroundColor: "#F7EBFF", borderRadius: 275, opacity: 0.76 },
  backButton: { position: "absolute", top: 15, left: 35, zIndex: 2, padding: 4 },
  content: { paddingHorizontal: 36, paddingTop: 274, paddingBottom: 42 },
  title: { color: "#070707", fontSize: 35, lineHeight: 40, fontWeight: "700", letterSpacing: -1.35 },
  subtitle: { color: "#767178", fontSize: 15.5, lineHeight: 22, marginTop: 15, marginBottom: 34 },
  choiceCard: { minHeight: 136, flexDirection: "row", alignItems: "center", borderWidth: 1.4, borderColor: "#B9B2BC", borderRadius: 25, backgroundColor: "rgba(255,255,255,0.72)", padding: 17, marginBottom: 15, shadowColor: "#A75CDF", shadowOpacity: 0.04, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  cardPressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },
  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "#F1E2FD", marginRight: 13, alignSelf: "flex-start" },
  choiceBody: { flex: 1, paddingRight: 7 },
  choiceTitle: { color: "#232026", fontSize: 17, fontWeight: "700", lineHeight: 22 },
  choiceText: { color: "#7D7780", fontSize: 13, lineHeight: 19, marginTop: 5 },
  assurance: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 22, backgroundColor: "#FFF8FA", borderWidth: 1, borderColor: "#EBD6DE" },
  assuranceText: { flex: 1, color: "#8B475F", fontSize: 12.5, lineHeight: 17, fontWeight: "600" },
});
