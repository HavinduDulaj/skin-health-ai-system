import { router } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";
import {
  Body,
  Card,
  Eyebrow,
  Fine,
  PrimaryButton,
  Screen,
  Title,
} from "../components/ui";
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
    copy: "May need observation. If it persists or worsens, seek professional dermatological guidance. Medium is also the weakest visual boundary in this dataset.",
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
          names. This dashboard is the guidance layer from the proposal.
        </Body>

        {GRADES.map((item) => (
          <Card key={item.title}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardBody}>{item.copy}</Text>
          </Card>
        ))}

        <Card>
          <Text style={styles.cardTitle}>This session</Text>
          {lastResult ? (
            <>
              <Text style={styles.sessionTitle}>
                {lastResult.condition?.used || lastResult.lesion || "Skin area"}
                {" · "}
                {lastResult.decision === "grade"
                  ? `${lastResult.risk} risk`
                  : DECISION_LABEL[lastResult.decision] || lastResult.decision}
              </Text>
              <Text style={styles.cardBody}>
                {lastResult.guidance?.alert || lastResult.guidance?.summary || ""}
                {lastResult.confidence != null
                  ? ` Confidence ${pct(lastResult.confidence)}.`
                  : ""}
              </Text>
            </>
          ) : (
            <>
              <Fine>
                Run an assessment to see your latest condition, grade, and caution
                here.
              </Fine>
              <PrimaryButton
                label="Upload a photograph"
                onPress={() => router.push("/assess")}
              />
            </>
          )}
        </Card>

        {lastResult?.disclaimer ? <Fine>{lastResult.disclaimer}</Fine> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: 48 },
  sessionTitle: {
    fontFamily: fonts.serifSemi,
    color: colors.ink,
    fontSize: 18,
    textTransform: "capitalize",
  },
  cardTitle: { color: colors.ink, fontFamily: fonts.serifSemi, fontSize: 17 },
  cardBody: { color: colors.muted, fontFamily: fonts.sans, lineHeight: 22, fontSize: 14 },
});
