import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

const resources = [
  { name: "National GBV Helpline", phone: "0800-GBV-HELP", description: "24/7 confidential support", icon: "call" },
  { name: "Emergency Services", phone: "911", description: "For immediate danger", icon: "warning" },
  { name: "Counselling & Support", phone: "0800-SAFE-TALK", description: "Free confidential counselling", icon: "heart" },
  { name: "Legal Aid Hotline", phone: "0800-LEGAL-AID", description: "Free legal advice", icon: "shield-checkmark" },
  { name: "Campus Support Office", phone: "CAMPUS-EXT-101", description: "On-campus support", icon: "school" },
];

export default function ResourcesScreen() {
  const router = useRouter();
  const callResource = (phone: string) => Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, "")}`);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar style="dark" />
      <View pointerEvents="none" style={styles.lilacArc}><View style={styles.lilacArcInner} /></View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
          <Ionicons name="chevron-back" size={31} color="#141115" />
        </Pressable>
        <View style={styles.content}>
          <Text style={styles.eyebrow}>SAUTI YAKO</Text>
          <Text style={styles.title}>Immediate{`\n`}help</Text>
          <Text style={styles.subtitle}>You are not alone. Choose a support option whenever you feel ready.</Text>
          <Text style={styles.helper}>Tap a service to call</Text>

          <View style={styles.resourceList}>
            {resources.map((resource) => (
              <Pressable key={resource.name} onPress={() => callResource(resource.phone)} style={({ pressed }) => [styles.resourceCard, pressed && styles.cardPressed]}>
                <View style={styles.iconCircle}><Ionicons name={resource.icon as never} size={19} color="#813BBC" /></View>
                <View style={styles.resourceBody}>
                  <Text style={styles.resourceName}>{resource.name}</Text>
                  <Text style={styles.resourceDescription}>{resource.description}</Text>
                </View>
                <View style={styles.phoneBlock}>
                  <Text style={styles.phone}>{resource.phone}</Text>
                  <Ionicons name="call-outline" size={17} color="#813BBC" />
                </View>
              </Pressable>
            ))}
          </View>
          <View style={styles.confidentialNote}>
            <Ionicons name="lock-closed-outline" size={16} color="#8B475F" />
            <Text style={styles.noteText}>Your call is private and confidential.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FEFDFE", overflow: "hidden" },
  scroll: { flexGrow: 1, minHeight: "100%", paddingBottom: 35 },
  lilacArc: { position: "absolute", width: 620, height: 500, top: -205, left: -35, backgroundColor: "#E1C1FC", borderRadius: 310, opacity: 0.92 },
  lilacArcInner: { position: "absolute", width: 550, height: 410, left: -75, top: 88, backgroundColor: "#F7EBFF", borderRadius: 275, opacity: 0.76 },
  backButton: { position: "absolute", top: 15, left: 35, zIndex: 2, padding: 4 },
  content: { paddingHorizontal: 36, paddingTop: 206 },
  eyebrow: { color: "#7E36B7", fontSize: 12, lineHeight: 18, fontWeight: "800", letterSpacing: 2.1, marginBottom: 16 },
  title: { color: "#070707", fontSize: 39, lineHeight: 43, fontWeight: "700", letterSpacing: -1.45 },
  subtitle: { color: "#767178", fontSize: 15.5, lineHeight: 23, marginTop: 16, maxWidth: 300 },
  helper: { color: "#813BBC", fontSize: 12.5, fontWeight: "700", marginTop: 28, marginBottom: 12 },
  resourceList: { gap: 10 },
  resourceCard: { minHeight: 74, flexDirection: "row", alignItems: "center", borderWidth: 1.2, borderColor: "#C2BCC4", borderRadius: 21, backgroundColor: "rgba(255,255,255,0.76)", paddingHorizontal: 14, paddingVertical: 11 },
  cardPressed: { transform: [{ scale: 0.985 }], opacity: 0.88 },
  iconCircle: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "#F1E2FD", marginRight: 11 },
  resourceBody: { flex: 1 },
  resourceName: { color: "#242026", fontSize: 14.5, fontWeight: "700", lineHeight: 18 },
  resourceDescription: { color: "#817B84", fontSize: 11.5, lineHeight: 16, marginTop: 2 },
  phoneBlock: { alignItems: "flex-end", gap: 2, marginLeft: 8 },
  phone: { color: "#813BBC", fontSize: 10.5, fontWeight: "800", maxWidth: 104, textAlign: "right" },
  confidentialNote: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 8, marginTop: 23, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 22, backgroundColor: "#FFF8FA", borderColor: "#EBD6DE", borderWidth: 1 },
  noteText: { color: "#8B475F", fontSize: 12.5, fontWeight: "600" },
});
