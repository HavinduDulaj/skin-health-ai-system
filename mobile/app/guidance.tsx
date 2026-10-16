import { ScrollView, StyleSheet, Text } from "react-native";
import { Body, Card, Eyebrow, Screen, Title } from "../components/ui";
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
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: 48 },
  cardTitle: { color: colors.ink, fontFamily: fonts.serifSemi, fontSize: 17 },
  cardBody: { color: colors.muted, fontFamily: fonts.sans, lineHeight: 22, fontSize: 14 },
});
