import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import PrimaryButton from "../components/PrimaryButton";
import { RootStackParamList } from "../types/types";

type Props = NativeStackScreenProps<RootStackParamList, "Conflict">;

function parseConflict(message: string) {
  const [pair, reason] = message.split(" because ");
  return {
    pair: pair || "Ingredient combination",
    reason: reason || "This combination may increase irritation or reduce tolerance.",
  };
}

export default function ConflictScreen({ route, navigation }: Props) {
  const conflicts = route.params.conflicts;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back-outline" size={22} color="#102033" />
        </Pressable>
        <View style={styles.headerIcon}>
          <Ionicons name="git-compare-outline" size={20} color="#E08A1E" />
        </View>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.kicker}>Conflict Prevention</Text>
        <Text style={styles.title}>Ingredient Conflicts</Text>
        <Text style={styles.subtitle}>
          Review the listed combination notices before using recommended ingredients together.
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.safeCard}>
          <Ionicons name="shield-checkmark-outline" size={22} color="#12805C" />
          <Text style={styles.safeValue}>{conflicts.length === 0 ? "None listed" : "Review"}</Text>
          <Text style={styles.summaryLabel}>Current list</Text>
        </View>
        <View style={styles.blockCard}>
          <Ionicons name="warning-outline" size={22} color="#E08A1E" />
          <Text style={styles.blockValue}>{conflicts.length}</Text>
          <Text style={styles.summaryLabel}>Conflicts</Text>
        </View>
      </View>

      {conflicts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="checkmark-circle-outline" size={24} color="#12805C" />
          <View style={styles.emptyCopy}>
            <Text style={styles.emptyTitle}>No conflicts detected</Text>
            <Text style={styles.emptyText}>The selected recommendations passed conflict prevention.</Text>
          </View>
        </View>
      ) : (
        conflicts.map((message) => {
          const conflict = parseConflict(message);
          return (
            <View key={message} style={styles.conflictCard}>
              <View style={styles.conflictHead}>
                <Ionicons name="alert-circle-outline" size={20} color="#D64545" />
                <Text style={styles.conflictTitle}>{conflict.pair}</Text>
              </View>
              <Text style={styles.conflictReason}>{conflict.reason}</Text>
              <View style={styles.blockedBadge}>
                <Text style={styles.blockedText}>Do not combine</Text>
              </View>
            </View>
          );
        })
      )}

      <PrimaryButton title="Adjust Recommendations" icon="options-outline" onPress={() => navigation.goBack()} />
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
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
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
  kicker: { color: "#E08A1E", fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  title: { color: "#102033", fontSize: 24, fontWeight: "900", marginTop: 4 },
  subtitle: { color: "#526376", fontSize: 13, lineHeight: 19, marginTop: 6 },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  safeCard: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  blockCard: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  safeValue: { color: "#12805C", fontSize: 22, fontWeight: "900", marginTop: 8 },
  blockValue: { color: "#E08A1E", fontSize: 22, fontWeight: "900", marginTop: 8 },
  summaryLabel: { color: "#526376", fontSize: 11, fontWeight: "900", marginTop: 2 },
  emptyCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#A7F3D0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    padding: 14,
  },
  emptyCopy: { flex: 1 },
  emptyTitle: { color: "#12805C", fontSize: 15, fontWeight: "900" },
  emptyText: { color: "#526376", fontSize: 13, lineHeight: 19, marginTop: 3 },
  conflictCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FCA5A5",
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginBottom: 10,
    padding: 14,
  },
  conflictHead: { alignItems: "center", flexDirection: "row", gap: 8 },
  conflictTitle: { color: "#102033", flex: 1, fontSize: 14, fontWeight: "900" },
  conflictReason: { color: "#526376", fontSize: 13, lineHeight: 19 },
  blockedBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FFECEC",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  blockedText: { color: "#D64545", fontSize: 11, fontWeight: "900" },
});
