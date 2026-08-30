import { Image, ScrollView, StyleSheet, Text } from "react-native";
import { Body, Card, Screen, Title } from "../components/ui";
import { useApp } from "../context/AppContext";
import { pct } from "../lib/api";
import { DECISION_LABEL } from "../lib/config";
import { colors, spacing } from "../lib/theme";

export default function ReportScreen() {
  const { lastResult, lastPhotoUri } = useApp();

  if (!lastResult) {
    return (
      <Screen>
        <Title>No report yet</Title>
        <Body>Complete an assessment to generate the structured output.</Body>
      </Screen>
    );
  }

  const cond = lastResult.condition?.used || lastResult.lesion || "—";
  const grade =
    lastResult.decision === "grade"
      ? `${lastResult.risk} risk`
      : DECISION_LABEL[lastResult.decision] || lastResult.decision;

  const rows: Array<[string, string]> = [
    ["Detected condition", cond],
    ["Risk level", lastResult.decision === "grade" ? lastResult.risk || "—" : "Not issued"],
    ["Confidence", pct(lastResult.confidence)],
    ["Decision", DECISION_LABEL[lastResult.decision] || lastResult.decision],
    ["Caution", lastResult.guidance?.alert || "None"],
    ["Advisory", lastResult.guidance?.headline || "—"],
  ];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Title>{cond} · {grade}</Title>
        <Body>{lastResult.guidance?.summary || ""}</Body>

        <Card>
          {rows.map(([label, value]) => (
            <ViewRow key={label} label={label} value={value} />
          ))}
        </Card>

        {(lastResult.risk_module || []).length > 0 && (
          <Card>
            <Text style={styles.cardTitle}>Risk module trace</Text>
            {lastResult.risk_module!.map((step: { title: string; status: string; detail?: string }) => (
              <Text key={step.title} style={styles.step}>
                [{step.status}] {step.title} — {step.detail}
              </Text>
            ))}
          </Card>
        )}

        {lastPhotoUri ? (
          <Image source={{ uri: lastPhotoUri }} style={styles.photo} resizeMode="cover" />
        ) : null}

        <Text style={styles.disclaimer}>{lastResult.disclaimer}</Text>
      </ScrollView>
    </Screen>
  );
}

function ViewRow({ label, value }: { label: string; value: string }) {
  return (
    <Text style={styles.row}>
      <Text style={styles.rowLabel}>{label}: </Text>
      {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: spacing.xl },
  cardTitle: { color: colors.ink, fontWeight: "700", marginBottom: spacing.xs },
  row: { color: colors.muted, lineHeight: 24 },
  rowLabel: { color: colors.ink, fontWeight: "700" },
  step: { color: colors.muted, lineHeight: 22 },
  photo: { width: "100%", height: 220, borderRadius: 16 },
  disclaimer: { color: colors.muted, fontSize: 13, lineHeight: 20 },
});
