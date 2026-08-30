import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, PrimaryButton, Screen, Title } from "../components/ui";
import { fetchResearch } from "../lib/api";
import { colors, fonts, spacing } from "../lib/theme";

export default function MethodScreen() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    fetchResearch()
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

  const method = data?.method || {};
  const contributions = (data?.contributions || []) as Array<{ title: string; summary: string }>;
  const pipeline = (method.pipeline || []) as string[];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Title>How Derma-Safe works</Title>
        <Text style={styles.essay}>
          {method.problem ||
            "We grade acne, burns, rash, and warts as Low, Medium, or High risk from a phone photo. When the answer is unclear, we say so instead of guessing."}
        </Text>

        {pipeline.length ? (
          <View style={styles.steps}>
            {pipeline.slice(0, 5).map((step, i) => (
              <View key={step} style={styles.stepRow}>
                <Text style={styles.n}>{i + 1}</Text>
                <Text style={styles.step}>{step}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {contributions.slice(0, 4).map((item) => (
          <Card key={item.title}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.body}>{item.summary}</Text>
          </Card>
        ))}

        <Text style={styles.essay}>
          This is a screening aid — not a diagnosis, melanoma detector, or emergency
          service.
        </Text>

        <PrimaryButton label="Start screening" onPress={() => router.push("/enter")} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: 48 },
  essay: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 25,
  },
  steps: { gap: 12 },
  stepRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  n: {
    fontFamily: fonts.serifSemi,
    color: colors.sage,
    fontSize: 16,
    width: 22,
  },
  step: { flex: 1, color: colors.muted, fontFamily: fonts.sans, lineHeight: 22, fontSize: 15 },
  cardTitle: { color: colors.ink, fontFamily: fonts.serifSemi, fontSize: 17 },
  body: { color: colors.muted, fontFamily: fonts.sans, lineHeight: 22, fontSize: 14 },
});
