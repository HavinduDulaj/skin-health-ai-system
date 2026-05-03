import { View, Text, StyleSheet } from "react-native";

export default function ResultCard({ result }: any) {
  if (!result) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Recommendation Result</Text>

      <Text>Condition: {result.condition}</Text>
      <Text>Risk Level: {result.riskLevel}</Text>

      <View style={styles.goodBox}>
        <Text style={styles.sectionTitle}>Recommended Ingredients</Text>
        {result.recommendedIngredients.map((item: string, index: number) => (
          <Text key={index}>✅ {item}</Text>
        ))}
      </View>

      <View style={styles.badBox}>
        <Text style={styles.sectionTitle}>Ingredients to Avoid</Text>
        {result.avoidIngredients.map((item: string, index: number) => (
          <Text key={index}>❌ {item}</Text>
        ))}
      </View>

      <View style={styles.adviceBox}>
        <Text style={styles.sectionTitle}>Safety Advice</Text>
        <Text>{result.safetyAdvice}</Text>
      </View>

      <Text style={styles.disclaimer}>{result.disclaimer}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 16,
    marginTop: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
  },
  sectionTitle: {
    fontWeight: "700",
    marginBottom: 6,
  },
  goodBox: {
    backgroundColor: "#E8F8EF",
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  badBox: {
    backgroundColor: "#FDECEC",
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  adviceBox: {
    backgroundColor: "#FFF7D6",
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  disclaimer: {
    marginTop: 12,
    fontSize: 12,
    color: "#666",
  },
});