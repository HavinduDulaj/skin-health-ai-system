import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ReactNode, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";

import PrimaryButton from "../components/PrimaryButton";
import { RootStackParamList } from "../types/types";

type Props = NativeStackScreenProps<RootStackParamList, "Report">;

function Chip({ label, tone = "blue" }: { label: string; tone?: "blue" | "green" | "red" }) {
  const colors = {
    blue: ["#EAF3FF", "#0F62D9"],
    green: ["#ECFDF5", "#12805C"],
    red: ["#FFECEC", "#D64545"],
  } as const;
  const [backgroundColor, color] = colors[tone];

  return (
    <View style={[styles.chip, { backgroundColor }]}>
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function ReportScreen({ route, navigation }: Props) {
  const { profile, result } = route.params;
  const [shareError, setShareError] = useState('');

  async function handleShare() {
    const recommended = result.recommended.map((item) => item.name).join(", ");
    try {
    setShareError('');
    await Share.share({
      message: `DermaSafe AI Ingredient Safety Report\nLesion: ${profile.lesion}\nSeverity: ${profile.severity}\nRecommended: ${recommended}\n${result.disclaimer}`,
    });
    } catch {
      setShareError('Sharing is unavailable in this browser or device. You can still read the complete report below.');
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      {shareError ? <Text accessibilityRole="alert" style={{ color: '#B42318', padding: 16 }}>{shareError}</Text> : null}
      <View style={styles.headerRow}>
        <Pressable style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back-outline" size={22} color="#102033" />
        </Pressable>
        <Pressable style={styles.iconButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={20} color="#0F62D9" />
        </Pressable>
      </View>

      <View style={styles.readyCard}>
        <View style={styles.readyIcon}>
          <Ionicons name="shield-checkmark-outline" size={34} color="#12805C" />
        </View>
        <Text style={styles.title}>Final Safety Report</Text>
        <Text style={styles.subtitle}>Generated from the trained ingredient model and safety filters.</Text>
      </View>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{result.recommended.length}</Text>
          <Text style={styles.summaryLabel}>Recommended</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, styles.redText]}>{result.avoid.length}</Text>
          <Text style={styles.summaryLabel}>Avoid</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, styles.greenText]}>{result.conflicts.length}</Text>
          <Text style={styles.summaryLabel}>Conflicts</Text>
        </View>
      </View>

      <Section title="Profile Summary">
        <View style={styles.profileGrid}>
          <Chip label={`Lesion: ${profile.lesion}`} />
          <Chip label={`Severity: ${profile.severity}`} />
          <Chip label={`Skin: ${profile.skinType}`} />
          <Chip label={`Environment: ${profile.environment}`} />
          <Chip label={`Sun: ${profile.sunExposure}`} />
          <Chip label={`Allergies: ${profile.allergies.length || 0}`} tone={profile.allergies.length ? "red" : "green"} />
        </View>
      </Section>

      <Section title="Recommended Ingredients">
        {result.recommended.length === 0 ? <Text>No ingredients met the recommendation criteria for this profile.</Text> : null}
        {result.recommended.slice(0, 5).map((item) => (
          <View key={item.name} style={styles.resultRow}>
            <View style={styles.rowIcon}>
              <Ionicons name="flask-outline" size={18} color="#12805C" />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowText}>{item.percentage}</Text>
            </View>
            <Text style={styles.confidence}>{item.confidence}%</Text>
          </View>
        ))}
      </Section>

      <Section title="Avoid Ingredients">
        {result.avoid.slice(0, 5).map((item) => (
          <View key={`${item.name}-${item.reason}`} style={styles.avoidRow}>
            <Ionicons name="close-circle-outline" size={18} color="#D64545" />
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <Text style={styles.rowText}>{item.reason}</Text>
            </View>
          </View>
        ))}
      </Section>

      <Section title="Conflict Prevention">
        <View style={styles.conflictSummary}>
          <View style={styles.conflictMetric}>
            <Text style={styles.greenText}>{result.conflicts.length === 0 ? "Safe" : result.conflicts.length}</Text>
            <Text style={styles.summaryLabel}>Current combinations</Text>
          </View>
          <View style={styles.conflictMetric}>
            <Text style={styles.redText}>{result.avoid.filter((item) => item.reason.toLowerCase().includes("conflict")).length}</Text>
            <Text style={styles.summaryLabel}>Blocked conflicts</Text>
          </View>
        </View>
      </Section>

      <View style={styles.disclaimerCard}>
        <Ionicons name="information-circle-outline" size={20} color="#0F62D9" />
        <Text style={styles.disclaimer}>{result.disclaimer || "This is general skincare guidance and not a medical diagnosis."}</Text>
      </View>

      <PrimaryButton title="Done" icon="checkmark-circle-outline" onPress={() => navigation.navigate("Recommendation", { profile })} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F6FAFC" },
  content: { padding: 18, paddingBottom: 34, width: '100%', maxWidth: 960, alignSelf: 'center' },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE8F0",
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  readyCard: {
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderRadius: 8,
    borderWidth: 1,
    padding: 22,
  },
  readyIcon: {
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    borderRadius: 8,
    height: 64,
    justifyContent: "center",
    marginBottom: 12,
    width: 64,
  },
  title: { color: "#102033", fontSize: 24, fontWeight: "900", textAlign: "center" },
  subtitle: { color: "#526376", fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: "center" },
  summaryGrid: { flexDirection: "row", gap: 10, marginTop: 12 },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE8F0",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  summaryValue: { color: "#0F62D9", fontSize: 24, fontWeight: "900" },
  summaryLabel: { color: "#526376", fontSize: 11, fontWeight: "900", lineHeight: 15, marginTop: 2 },
  section: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE8F0",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  sectionTitle: { color: "#102033", fontSize: 16, fontWeight: "900", marginBottom: 10 },
  profileGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6 },
  chipText: { fontSize: 11, fontWeight: "900" },
  resultRow: {
    alignItems: "center",
    borderBottomColor: "#E7EEF9",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingVertical: 10,
  },
  avoidRow: {
    alignItems: "flex-start",
    borderBottomColor: "#FEE2E2",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingVertical: 10,
  },
  rowIcon: {
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  rowCopy: { flex: 1 },
  rowTitle: { color: "#102033", fontSize: 14, fontWeight: "900" },
  rowText: { color: "#526376", fontSize: 12, lineHeight: 17, marginTop: 3 },
  confidence: { color: "#12805C", fontSize: 14, fontWeight: "900" },
  conflictSummary: { flexDirection: "row", gap: 10 },
  conflictMetric: {
    backgroundColor: "#F8FBFF",
    borderColor: "#DDE8F0",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  greenText: { color: "#12805C", fontSize: 22, fontWeight: "900" },
  redText: { color: "#D64545", fontSize: 22, fontWeight: "900" },
  disclaimerCard: {
    alignItems: "flex-start",
    backgroundColor: "#EAF3FF",
    borderColor: "#BFD5FF",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    padding: 14,
  },
  disclaimer: { color: "#102033", flex: 1, fontSize: 12, fontWeight: "700", lineHeight: 18 },
});
