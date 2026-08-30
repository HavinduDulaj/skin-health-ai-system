import { ScrollView, StyleSheet, Text } from "react-native";
import { Body, Card, Screen, Title } from "../components/ui";
import { useApp } from "../context/AppContext";
import { pct } from "../lib/api";
import { DECISION_LABEL } from "../lib/config";
import { colors, spacing } from "../lib/theme";

export default function GuidanceScreen() {
  const { lastResult } = useApp();

  if (!lastResult) {
    return (
      <Screen>
        <Title>Guidance</Title>
        <Body>Run an assessment to see your latest condition, grade, and caution here.</Body>
      </Screen>
    );
  }

  const cond = lastResult.condition?.used || lastResult.lesion || "unidentified";
  const grade =
    lastResult.decision === "grade"
      ? `${lastResult.risk} risk`
      : DECISION_LABEL[lastResult.decision] || lastResult.decision;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Title>{cond}</Title>
        <Body>
          {grade}. {lastResult.guidance?.alert || lastResult.guidance?.summary || ""} Confidence{" "}
          {pct(lastResult.confidence)}.
        </Body>

        {lastResult.guidance?.headline ? (
          <Card>
            <Text style={styles.headline}>{lastResult.guidance.headline}</Text>
          </Card>
        ) : null}

        <Card>
          <Text style={styles.cardTitle}>Recommended steps</Text>
          {(lastResult.guidance?.steps || []).map((step: string) => (
            <Text key={step} style={styles.step}>
              • {step}
            </Text>
          ))}
        </Card>

        <Text style={styles.disclaimer}>{lastResult.disclaimer}</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md },
  headline: { color: colors.ink, fontWeight: "700", fontSize: 18 },
  cardTitle: { color: colors.ink, fontWeight: "700" },
  step: { color: colors.muted, lineHeight: 22 },
  disclaimer: { color: colors.muted, fontSize: 13, lineHeight: 20 },
});
