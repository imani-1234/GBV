import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../../src/stores/authStore";

export default function NotificationsScreen() {
  const router = useRouter();
  const isAnonymous = useAuthStore((state) => state.isAnonymous);
  return <SafeAreaView style={styles.safeArea} edges={["top"]}><StatusBar style="dark" /><View pointerEvents="none" style={styles.lilacArc}><View style={styles.lilacArcInner} /></View><View style={styles.content}><View style={styles.iconCircle}><Ionicons name="notifications-outline" size={30} color="#813BBC" /></View><Text style={styles.eyebrow}>ALERTS</Text><Text style={styles.title}>{isAnonymous ? "Private updates{`\n`}stay here." : "Nothing new{`\n`}right now."}</Text><Text style={styles.body}>{isAnonymous ? "When a private update is ready, it will appear in your report status." : "When the support team shares an update, you will see it here."}</Text><Pressable onPress={() => router.push("/(reporter)/reports")} style={styles.button}><Text style={styles.buttonText}>View reports</Text><Ionicons name="arrow-forward" size={21} color="#FFFFFF" /></Pressable></View></SafeAreaView>;
}

const styles = StyleSheet.create({ safeArea: { flex: 1, backgroundColor: "#FEFDFE", overflow: "hidden" }, lilacArc: { position: "absolute", width: 620, height: 560, top: -300, left: -30, backgroundColor: "#E1C1FC", borderRadius: 310, opacity: 0.92 }, lilacArcInner: { position: "absolute", width: 540, height: 450, left: -83, top: 108, backgroundColor: "#F7EBFF", borderRadius: 270, opacity: 0.76 }, content: { flex: 1, justifyContent: "center", paddingHorizontal: 48, paddingBottom: 10 }, iconCircle: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center", backgroundColor: "#F1E2FD", marginBottom: 28 }, eyebrow: { color: "#7E36B7", fontSize: 11, letterSpacing: 1.8, fontWeight: "800", marginBottom: 10 }, title: { color: "#09080A", fontSize: 36, lineHeight: 40, fontWeight: "700", letterSpacing: -1.4 }, body: { color: "#767178", fontSize: 15.5, lineHeight: 23, marginTop: 17 }, button: { height: 61, borderRadius: 31, backgroundColor: "#A95BEA", marginTop: 45, alignSelf: "flex-start", paddingHorizontal: 21, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 }, buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" } });
