import { router } from "expo-router";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  Body,
  Eyebrow,
  Fine,
  GhostButton,
  Screen,
  Title,
} from "../components/ui";
import { useApp } from "../context/AppContext";
import { pct } from "../lib/api";
import { DECISION_LABEL } from "../lib/config";
import { colors, fonts, radius, spacing } from "../lib/theme";

export default function ReportScreen() {
  const { lastResult, lastPhotoUri, session } = useApp();

  if (!lastResult) {
    return (
      <Screen>
        <Eyebrow>Skin health advisory report</Eyebrow>
        <Title>No report yet</Title>
        <Body>
          Complete an assessment to generate the structured output from the
          proposal (condition, risk, confidence, guidance).
        </Body>
        <GhostButton label="New assessment" onPress={() => router.push("/assess")} />
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
        <Eyebrow>Skin health advisory report</Eyebrow>
        <Title>
          {cond} · {grade}
        </Title>
        <Body>{lastResult.guidance?.summary || ""}</Body>

        {lastPhotoUri ? (
          <Image source={{ uri: lastPhotoUri }} style={styles.photo} resizeMode="cover" />
        ) : null}

        <View style={styles.dl}>
          {rows.map(([label, value]) => (
            <View key={label} style={styles.row}>
              <Text style={styles.rowLabel}>{label}</Text>
              <Text style={styles.rowValue}>{value}</Text>
            </View>
          ))}
        </View>

        {lastResult.risk_module?.length
          ? lastResult.risk_module.map((item, i) => (
              <View key={item.title} style={styles.arch}>
                <Text style={styles.archN}>{String(i + 1).padStart(2, "0")}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.archTitle}>{item.title}</Text>
                  <Fine>{item.detail || item.status}</Fine>
                </View>
              </View>
            ))
          : null}

        <Fine>{lastResult.disclaimer}</Fine>
        <GhostButton label="New assessment" onPress={() => router.push("/assess")} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: 48 },
  photo: {
    width: "100%",
    maxWidth: 280,
    height: 220,
    backgroundColor: colors.wash,
    borderRadius: 14,
  },
  dl: { gap: 10 },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  rowLabel: { width: 100, color: colors.muted, fontFamily: fonts.sans, fontSize: 13 },
  rowValue: {
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.sansMed,
    fontSize: 14,
    textTransform: "capitalize",
  },
  arch: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.plate,
    backgroundColor: colors.paper2,
  },
  archN: { fontFamily: fonts.serif, fontSize: 16, color: colors.sage, width: 28 },
  archTitle: { fontFamily: fonts.sansSemi, color: colors.ink, fontSize: 15 },
});
