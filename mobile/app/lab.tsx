import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Body, Card, Fine, Screen, StatCell, Title } from "../components/ui";
import { fetchLab, pct } from "../lib/api";
import { colors, fonts, spacing } from "../lib/theme";

function fmt(n: unknown): string {
  if (n == null || n === "") return "—";
  if (typeof n === "number") return n.toLocaleString("en-US");
  return String(n);
}

export default function LabScreen() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    fetchLab()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.sage} />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen>
        <Title>Lab</Title>
        <Body>Start the Python API to load research figures.</Body>
      </Screen>
    );
  }

  const ds = data.dataset || {};
  const card = data.model_card || {};
  const policy = data.policy || {};
  const ig = data.integrity || {};
  const leak = String(ig.leakage || "").includes("PASSED") ? "Passed" : ig.leakage || "—";

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Title>Research figures</Title>
        <Body>Dataset cleanup and model metrics behind the screening.</Body>

        <View style={styles.stats}>
          <StatCell value={fmt(ds.final_images)} label="Cleaned images" />
          <StatCell value={pct(card.v5_test_accuracy)} label="Test accuracy" />
          <StatCell value={leak} label="Leakage check" />
          <StatCell value={fmt(ds.removed)} label="Held out" />
        </View>

        <Card>
          <Text style={styles.cardTitle}>Model</Text>
          <Text style={styles.body}>
            {card.architecture || "EfficientNet screening head"}. Val{" "}
            {pct(card.v5_validation_accuracy)} · test {pct(card.v5_test_accuracy)}.
          </Text>
          {card.limitation ? <Text style={styles.body}>{card.limitation}</Text> : null}
        </Card>

        <Card>
          <Text style={styles.cardTitle}>When we abstain</Text>
          <Text style={styles.body}>
            Below confidence {policy.confidence_min ?? "—"} or margin{" "}
            {policy.margin_min ?? "—"}. Reject photos below quality{" "}
            {policy.quality_min ?? "—"}.
          </Text>
        </Card>

        <Fine>Medium remains the hardest class to separate from phone photos.</Fine>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: 48 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cardTitle: { color: colors.ink, fontFamily: fonts.serifSemi, fontSize: 16 },
  body: { color: colors.muted, fontFamily: fonts.sans, lineHeight: 22, fontSize: 14 },
});
