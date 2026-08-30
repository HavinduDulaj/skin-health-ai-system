import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { Body, Card, Fine, Screen, Title } from "../components/ui";
import { useApp } from "../context/AppContext";
import { pct } from "../lib/api";
import { DECISION_LABEL } from "../lib/config";
import { colors, fonts, radius, spacing } from "../lib/theme";

export default function ReportScreen() {
  const { lastResult, lastPhotoUri, session } = useApp();

  if (!lastResult) {
    return (
      <Screen>
        <Title>No report yet</Title>
        <Body>Complete a screening to generate a short summary.</Body>
      </Screen>
    );
  }

  const cond = lastResult.condition?.used || lastResult.lesion || "—";
  const grade =
    lastResult.decision === "grade"
      ? `${lastResult.risk} risk`
      : DECISION_LABEL[lastResult.decision] || lastResult.decision;

  const rows: Array<[string, string]> = [
    ["Name", session?.name || "Anonymous"],
    ["Condition", cond],
    ["Risk", lastResult.decision === "grade" ? lastResult.risk || "—" : "Not issued"],
    ["Confidence", pct(lastResult.confidence)],
    ["Decision", DECISION_LABEL[lastResult.decision] || lastResult.decision],
    ["Advice", lastResult.guidance?.headline || "—"],
  ];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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

        <Fine>{lastResult.disclaimer}</Fine>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: 48 },
  photo: {
    width: "100%",
    height: 220,
    backgroundColor: colors.wash,
    borderRadius: radius.plate,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  rowLast: { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 },
  rowLabel: { width: 100, color: colors.muted, fontFamily: fonts.sans, fontSize: 13 },
  rowValue: { flex: 1, color: colors.ink, fontFamily: fonts.sansMed, fontSize: 14 },
});
