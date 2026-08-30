import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text } from "react-native";
import { Card, Screen, Title } from "../components/ui";
import { fetchLab, pct } from "../lib/api";
import { colors, spacing } from "../lib/theme";

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
        <Text style={styles.muted}>Lab logs not found. Start the Python API.</Text>
      </Screen>
    );
  }

  const ds = data.dataset || {};
  const card = data.model_card || {};
  const policy = data.policy || {};
  const ig = data.integrity || {};

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Title>Dataset & model lab</Title>

        <Card>
          <Text style={styles.stat}>{fmt(ds.final_images)}</Text>
          <Text style={styles.label}>Images in V4</Text>
        </Card>
        <Card>
          <Text style={styles.stat}>{pct(card.v5_test_accuracy)}</Text>
          <Text style={styles.label}>V5 test accuracy</Text>
        </Card>
        <Card>
          <Text style={styles.stat}>
            {String(ig.leakage || "").includes("PASSED") ? "Passed" : ig.leakage || "—"}
          </Text>
          <Text style={styles.label}>Leakage check</Text>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Model card</Text>
          <Text style={styles.body}>
            {card.architecture || "EfficientNet screening head"}. Val {pct(card.v5_validation_accuracy)} ·
            test {pct(card.v5_test_accuracy)} · macro F1 {pct(card.v5_test_macro_f1)}.
          </Text>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Selective policy</Text>
          <Text style={styles.body}>
            Abstain below confidence {policy.confidence_min ?? "—"} or margin {policy.margin_min ?? "—"}.
            Reject below quality {policy.quality_min ?? "—"}.
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: spacing.xl },
  stat: { color: colors.ink, fontSize: 28, fontWeight: "700" },
  label: { color: colors.muted },
  cardTitle: { color: colors.ink, fontWeight: "700" },
  body: { color: colors.muted, lineHeight: 22 },
  muted: { color: colors.muted },
});
