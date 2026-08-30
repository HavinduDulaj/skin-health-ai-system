import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Body, Card, Eyebrow, Fine, Screen, StatCell, Title } from "../components/ui";
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
        <Eyebrow>Laboratory</Eyebrow>
        <Title>Logs not found.</Title>
        <Body>Start the Python API to read the audit figures.</Body>
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
        <Eyebrow>Laboratory · rebuilt set</Eyebrow>
        <Title>The set behind the score.</Title>
        <Body>
          These figures come from the audit pipeline — synthetic copies held out,
          leakage check required to pass before a grade is trusted.
        </Body>

        <View style={styles.stats}>
          <StatCell value={fmt(ds.final_images)} label="Images in V4" />
          <StatCell value={fmt(ds.removed)} label="Held out or removed" />
          <StatCell value={leak} label="Leakage check" />
          <StatCell value={pct(card.v5_test_accuracy)} label="V5 test accuracy" />
        </View>

        <Card>
          <Text style={styles.cardTitle}>Cleaning</Text>
          <Text style={styles.body}>
            Near-duplicates flagged: {fmt(ds.near_duplicates)}. Low quality:{" "}
            {fmt(ds.low_quality)}. Ambiguous labels: {fmt(ds.ambiguous)}. Review
            queue: {fmt(ds.review_queue)}. Synthetic copies were excluded from the
            rebuilt set.
          </Text>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Model card</Text>
          <Text style={styles.body}>
            {card.architecture || "EfficientNet screening head"}. Val{" "}
            {pct(card.v5_validation_accuracy)} · test {pct(card.v5_test_accuracy)} ·
            macro F1 {pct(card.v5_test_macro_f1)}. V4 baseline{" "}
            {pct(card.v4_test_accuracy_baseline)}.
          </Text>
          {card.limitation ? <Text style={styles.body}>{card.limitation}</Text> : null}
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Selective policy</Text>
          <Text style={styles.body}>
            Abstain below confidence {policy.confidence_min ?? "—"} or margin{" "}
            {policy.margin_min ?? "—"}. Reject the frame below quality{" "}
            {policy.quality_min ?? "—"}.
          </Text>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Split</Text>
          <Text style={styles.body}>
            Train {fmt(card.training_images)} · val {fmt(card.validation_images)} ·
            test {fmt(card.test_images)}. Synthetic training images recorded
            separately: {fmt(card.synthetic_training_images)}.
          </Text>
        </Card>

        <Fine>Class balance is reported, not manufactured. Medium remains the weak class.</Fine>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: 48 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cardTitle: { color: colors.ink, fontFamily: fonts.serifSemi, fontSize: 16 },
  body: { color: colors.muted, fontFamily: fonts.sans, lineHeight: 22, fontSize: 14 },
});
