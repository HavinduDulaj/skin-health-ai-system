import { ScrollView, StyleSheet, Text } from "react-native";
import { Body, Card, Eyebrow, Fine, Screen, Title } from "../components/ui";
import { useApp } from "../context/AppContext";
import { pct } from "../lib/api";
import { DECISION_LABEL } from "../lib/config";
import { colors, fonts, spacing } from "../lib/theme";

const GRADES = [
  {
    title: "Low risk",
    copy: "Minor or common appearance. Monitor with ordinary skincare. Photograph again in a few days. See a clinician if it spreads or becomes painful.",
  },
  {
    title: "Medium risk",
    copy: "May need observation. If it persists or worsens, seek dermatological guidance. Medium is also the weakest visual boundary in this dataset — treat a Medium grade with that in mind.",
  },
  {
    title: "High risk",
    copy: "Stronger abnormality indicators. Consult a dermatologist. This is not an emergency diagnosis and not a substitute for urgent care if symptoms escalate.",
  },
  {
    title: "When the model abstains",
    copy: "If confidence is low or the top-two grades are close, no winner is forced. Retake the photograph or see a clinician rather than guessing.",
  },
];

export default function GuidanceScreen() {
  const { lastResult } = useApp();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Eyebrow>Risk awareness</Eyebrow>
        <Title>How to read the grade.</Title>
        <Body>
          Low, Medium, and High are screening categories. They are not disease
          names. This is the guidance layer from the proposal.
        </Body>

        {lastResult ? (
          <Card>
            <Text style={styles.sessionKicker}>This session</Text>
            <Text style={styles.sessionTitle}>
              {lastResult.condition?.used || lastResult.lesion || "unidentified"}
              {" · "}
              {lastResult.decision === "grade"
                ? `${lastResult.risk} risk`
                : DECISION_LABEL[lastResult.decision] || lastResult.decision}
            </Text>
            <Text style={styles.cardBody}>
              {lastResult.guidance?.alert || lastResult.guidance?.summary || ""} Confidence{" "}
              {pct(lastResult.confidence)}.
            </Text>
          </Card>
        ) : (
          <Fine>Run a capture to pin this session’s grade here.</Fine>
        )}

        {GRADES.map((item, i) => (
          <Card key={item.title}>
            <Text style={styles.n}>{String(i + 1).padStart(2, "0")}</Text>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardBody}>{item.copy}</Text>
          </Card>
        ))}

        {lastResult?.guidance?.steps?.length ? (
          <Card>
            <Text style={styles.cardTitle}>Recommended steps</Text>
            {lastResult.guidance.steps.map((step, i) => (
              <Text key={step} style={styles.step}>
                {String(i + 1).padStart(2, "0")}  {step}
              </Text>
            ))}
          </Card>
        ) : null}

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
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  sessionTitle: { fontFamily: fonts.serifSemi, color: colors.ink, fontSize: 18, textTransform: "capitalize" },
  n: { fontFamily: fonts.serif, color: colors.sage, fontSize: 13 },
  cardTitle: { color: colors.ink, fontFamily: fonts.serifSemi, fontSize: 17 },
  cardBody: { color: colors.muted, fontFamily: fonts.sans, lineHeight: 22, fontSize: 14 },
  step: { color: colors.muted, fontFamily: fonts.sans, lineHeight: 22 },
});
