import { ScrollView, StyleSheet, Text } from "react-native";
import { Body, Card, Fine, Screen, Title } from "../components/ui";
import { useApp } from "../context/AppContext";
import { pct } from "../lib/api";
import { DECISION_LABEL } from "../lib/config";
import { colors, fonts, spacing } from "../lib/theme";

const GRADES = [
  {
    title: "Low risk",
    copy: "Often mild or common. Keep an eye on it with gentle care. See a clinician if it spreads or hurts.",
  },
  {
    title: "Medium risk",
    copy: "Worth watching. If it stays or worsens, book dermatology advice. Medium is also the hardest grade to judge from a phone photo.",
  },
  {
    title: "High risk",
    copy: "Stronger signs. Speak with a dermatologist. This is not emergency care — go to urgent care if symptoms escalate.",
  },
  {
    title: "When we can't decide",
    copy: "If the photo is unclear or the grades are too close, we won't force an answer. Retake the photo or see a clinician.",
  },
];

export default function GuidanceScreen() {
  const { lastResult } = useApp();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Title>How to read your result</Title>
        <Body>
          Low, Medium, and High are screening labels — not disease names.
        </Body>

        {lastResult ? (
          <Card>
            <Text style={styles.sessionKicker}>Your latest check</Text>
            <Text style={styles.sessionTitle}>
              {lastResult.condition?.used || lastResult.lesion || "Skin area"}
              {" · "}
              {lastResult.decision === "grade"
                ? `${lastResult.risk} risk`
                : DECISION_LABEL[lastResult.decision] || lastResult.decision}
            </Text>
            <Text style={styles.cardBody}>
              {lastResult.guidance?.alert || lastResult.guidance?.summary || ""}
              {lastResult.confidence != null ? ` Confidence ${pct(lastResult.confidence)}.` : ""}
            </Text>
          </Card>
        ) : (
          <Fine>Run a screening to see your result summarised here.</Fine>
        )}

        {GRADES.map((item) => (
          <Card key={item.title}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardBody}>{item.copy}</Text>
          </Card>
        ))}

        {lastResult?.disclaimer ? <Fine>{lastResult.disclaimer}</Fine> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: 48 },
  sessionKicker: {
    color: colors.sage,
    fontFamily: fonts.sansSemi,
    fontSize: 12,
  },
  sessionTitle: {
    fontFamily: fonts.serifSemi,
    color: colors.ink,
    fontSize: 18,
    textTransform: "capitalize",
  },
  cardTitle: { color: colors.ink, fontFamily: fonts.serifSemi, fontSize: 17 },
  cardBody: { color: colors.muted, fontFamily: fonts.sans, lineHeight: 22, fontSize: 14 },
});
