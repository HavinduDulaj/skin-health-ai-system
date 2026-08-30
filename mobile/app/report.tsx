import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { Body, Card, Eyebrow, Fine, Screen, Title } from "../components/ui";
import { useApp } from "../context/AppContext";
import { pct } from "../lib/api";
import { DECISION_LABEL, PROJECT_CODE } from "../lib/config";
import { colors, fonts, spacing } from "../lib/theme";

export default function ReportScreen() {
  const { lastResult, lastPhotoUri, session } = useApp();

  if (!lastResult) {
    return (
      <Screen>
        <Eyebrow>Advisory report</Eyebrow>
        <Title>No report yet.</Title>
        <Body>Complete a capture to generate the structured output from the proposal.</Body>
      </Screen>
    );
  }

  const cond = lastResult.condition?.used || lastResult.lesion || "—";
  const grade =
    lastResult.decision === "grade"
      ? `${lastResult.risk} risk`
      : DECISION_LABEL[lastResult.decision] || lastResult.decision;

  const rows: Array<[string, string]> = [
    ["Subject", session?.name || "Anonymous"],
    ["Detected condition", cond],
    ["Risk level", lastResult.decision === "grade" ? lastResult.risk || "—" : "Not issued"],
    ["Confidence", pct(lastResult.confidence)],
    ["Decision", DECISION_LABEL[lastResult.decision] || lastResult.decision],
    ["Caution", lastResult.guidance?.alert || "None"],
    ["Advisory", lastResult.guidance?.headline || "—"],
  ];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Eyebrow>{PROJECT_CODE} · advisory report</Eyebrow>
        <Title>
          {cond} · {grade}
        </Title>
        <Body>{lastResult.guidance?.summary || ""}</Body>

        {lastPhotoUri ? (
          <Image source={{ uri: lastPhotoUri }} style={styles.photo} resizeMode="cover" />
        ) : null}

        <Card>
          {rows.map(([label, value], i) => (
            <View key={label} style={[styles.row, i === rows.length - 1 && styles.rowLast]}>
              <Text style={styles.rowLabel}>{label}</Text>
              <Text style={styles.rowValue}>{value}</Text>
            </View>
          ))}
        </Card>

        {(lastResult.risk_module || []).length > 0 ? (
          <Card>
            <Text style={styles.cardTitle}>Risk module trace</Text>
            {lastResult.risk_module!.map((step, i) => (
              <View key={step.title} style={styles.mod}>
                <Text style={styles.n}>{String(i + 1).padStart(2, "0")}</Text>
                <View style={styles.modBody}>
                  <Text style={styles.modTitle}>
                    {step.title} · {step.status}
                  </Text>
                  {step.detail ? <Text style={styles.cardBody}>{step.detail}</Text> : null}
                </View>
              </View>
            ))}
          </Card>
        ) : null}

        <Fine>
          {lastResult.disclaimer}
          {"\n"}
          {PROJECT_CODE} · screening only · not a medical record.
        </Fine>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: 48 },
  photo: { width: "100%", height: 220, backgroundColor: colors.wash, borderWidth: 1, borderColor: colors.line },
  cardTitle: { color: colors.ink, fontFamily: fonts.serifSemi, fontSize: 16, marginBottom: 4 },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  rowLast: { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 },
  rowLabel: { width: 118, color: colors.muted, fontFamily: fonts.sans, fontSize: 13 },
  rowValue: { flex: 1, color: colors.ink, fontFamily: fonts.sansMed, fontSize: 14 },
  cardBody: { color: colors.muted, fontFamily: fonts.sans, lineHeight: 21, fontSize: 14 },
  mod: { flexDirection: "row", gap: 10 },
  n: { fontFamily: fonts.serif, color: colors.sage, fontSize: 13, width: 22 },
  modBody: { flex: 1, gap: 2 },
  modTitle: { fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 14 },
});
