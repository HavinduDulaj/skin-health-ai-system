import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import PrimaryButton from "../components/PrimaryButton";
import { AvoidItem, RootStackParamList } from "../types/types";

type Props = NativeStackScreenProps<RootStackParamList, "Avoid">;

function AvoidCard({ item, index }: { item: AvoidItem; index: number }) {
  const lowerReason = item.reason.toLowerCase();
  const isAllergy = lowerReason.includes("allergy");
  const tag = isAllergy ? "Allergy detected" : lowerReason.includes("low") ? "Low suitability" : "Safety block";

  return (
    <View style={styles.avoidCard}>
      <View style={styles.avoidIcon}>
        <Ionicons name="close-circle-outline" size={22} color="#D64545" />
      </View>
      <View style={styles.avoidCopy}>
        <Text style={styles.avoidName}>
          {index + 1}. {item.name}
        </Text>
        <Text style={styles.avoidReason}>{item.reason}</Text>
      </View>
      <View style={styles.tag}>
        <Text style={styles.tagText}>{tag}</Text>
      </View>
    </View>
  );
}

export default function AvoidScreen({ route, navigation }: Props) {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back-outline" size={22} color="#102033" />
        </Pressable>
        <View style={styles.headerIcon}>
          <Ionicons name="warning-outline" size={20} color="#D64545" />
        </View>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.kicker}>Safety layer</Text>
        <Text style={styles.title}>Avoid Ingredients</Text>
        <Text style={styles.subtitle}>
          These ingredients match the allergies declared in your profile. This list does not cover every possible sensitivity or contraindication.
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{route.params.avoid.length}</Text>
          <Text style={styles.summaryLabel}>Blocked ingredients</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>On</Text>
          <Text style={styles.summaryLabel}>Safety filters</Text>
        </View>
      </View>

      {route.params.avoid.map((item, index) => (
        <AvoidCard key={`${item.name}-${index}`} item={item} index={index} />
      ))}
      {route.params.avoid.length === 0 ? <Text style={styles.noteText}>No exact ingredient-allergy matches were found in this profile.</Text> : null}

      <View style={styles.note}>
        <Ionicons name="information-circle-outline" size={20} color="#0F62D9" />
        <Text style={styles.noteText}>Patch test new products and avoid blocked ingredients for this profile.</Text>
      </View>

      <PrimaryButton title="Back to Recommendations" icon="arrow-back-outline" onPress={() => navigation.goBack()} />
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
  headerIcon: {
    alignItems: "center",
    backgroundColor: "#FFECEC",
    borderColor: "#FCA5A5",
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE8F0",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  kicker: { color: "#D64545", fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  title: { color: "#102033", fontSize: 24, fontWeight: "900", marginTop: 4 },
  subtitle: { color: "#526376", fontSize: 13, lineHeight: 19, marginTop: 6 },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE8F0",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  summaryValue: { color: "#D64545", fontSize: 24, fontWeight: "900" },
  summaryLabel: { color: "#526376", fontSize: 11, fontWeight: "900", marginTop: 2 },
  avoidCard: {
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderColor: "#FCA5A5",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
    padding: 13,
  },
  avoidIcon: {
    alignItems: "center",
    backgroundColor: "#FFECEC",
    borderRadius: 8,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  avoidCopy: { flex: 1 },
  avoidName: { color: "#102033", fontSize: 15, fontWeight: "900" },
  avoidReason: { color: "#526376", fontSize: 13, lineHeight: 19, marginTop: 4 },
  tag: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  tagText: { color: "#9A3412", fontSize: 10, fontWeight: "900" },
  note: {
    alignItems: "center",
    backgroundColor: "#EAF3FF",
    borderColor: "#BFD5FF",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    padding: 14,
  },
  noteText: { color: "#102033", flex: 1, fontSize: 13, fontWeight: "700", lineHeight: 19 },
});
