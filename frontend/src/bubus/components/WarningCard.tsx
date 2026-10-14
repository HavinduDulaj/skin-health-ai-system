import { StyleSheet, Text, View } from "react-native";

import { AvoidItem } from "../types/types";

interface WarningCardProps {
  item: AvoidItem;
}

export default function WarningCard({ item }: WarningCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconCircle}>
        <View style={styles.leaf} />
      </View>
      <View style={styles.content}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.reasonLabel}>
          Reason: <Text style={styles.reason}>{item.reason}</Text>
        </Text>
        <Text style={styles.note}>Avoid this ingredient in your current routine.</Text>
      </View>
      <Text style={styles.chevron}>{">"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#991B1B",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    borderColor: "#FDA4AF",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  leaf: {
    width: 24,
    height: 34,
    borderRadius: 14,
    backgroundColor: "#79C753",
    transform: [{ rotate: "-20deg" }],
  },
  content: {
    flex: 1,
  },
  name: {
    color: "#070B25",
    fontSize: 16,
    fontWeight: "900",
  },
  reasonLabel: {
    color: "#EF1010",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 6,
  },
  reason: {
    color: "#7F1D1D",
    fontWeight: "500",
  },
  note: {
    color: "#0F172A",
    fontSize: 12,
    marginTop: 5,
  },
  chevron: {
    color: "#071033",
    fontSize: 18,
    fontWeight: "900",
  },
});
