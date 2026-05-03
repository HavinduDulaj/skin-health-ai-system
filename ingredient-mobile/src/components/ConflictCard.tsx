import { StyleSheet, Text, View } from "react-native";

interface ConflictCardProps {
  conflict: string;
}

export default function ConflictCard({ conflict }: ConflictCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconsRow}>
        <View style={[styles.roundIcon, styles.blueIcon]} />
        <Text style={styles.cross}>X</Text>
        <View style={[styles.roundIcon, styles.purpleIcon]} />
      </View>
      <Text style={styles.title}>Possible Conflict</Text>
      <Text style={styles.message}>{conflict}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFDF7",
    borderColor: "#FCD07A",
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    shadowColor: "#92400E",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  iconsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 12,
  },
  roundIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  blueIcon: {
    backgroundColor: "#0F66FF",
  },
  purpleIcon: {
    backgroundColor: "#7C3AED",
  },
  cross: {
    color: "#FF1010",
    fontSize: 28,
    fontWeight: "900",
  },
  title: {
    color: "#070B25",
    fontSize: 16,
    fontWeight: "900",
  },
  message: {
    color: "#111827",
    marginTop: 6,
    lineHeight: 20,
  },
});
