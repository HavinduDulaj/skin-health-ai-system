import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, Eyebrow, GhostButton, PrimaryButton, Screen, Title } from "../components/ui";
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
  const architecture = (data?.architecture || []) as Array<{ title: string; summary: string }>;
  const pipeline = (method.pipeline || []) as string[];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Eyebrow>Method · R26-IT-058</Eyebrow>
        <Title>Built to be honest when the photographs are not separable.</Title>

        <Text style={styles.essay}>
          {method.problem ||
            "A previous model sat near 57–60% test accuracy, mostly mixing Medium with Low and High. Cleaning can remove duplicates, blur, and train/test leakage. It cannot invent a visual boundary that is not in the pictures."}
        </Text>

        {pipeline.length ? (
          <View style={styles.steps}>
            {pipeline.map((step, i) => (
              <View key={step} style={styles.stepRow}>
                <Text style={styles.n}>{String(i + 1).padStart(2, "0")}</Text>
                <Text style={styles.step}>{step}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {method.model ? <Text style={styles.essay}>{method.model}</Text> : null}

        {contributions.map((item, i) => (
          <Card key={item.title}>
            <Text style={styles.n}>{String(i + 1).padStart(2, "0")}</Text>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.body}>{item.summary}</Text>
          </Card>
        ))}

        {architecture.length ? (
          <Text style={styles.archHead}>Proposal architecture</Text>
        ) : null}
        {architecture.map((item, i) => (
          <Card key={item.title}>
            <Text style={styles.n}>{String(i + 1).padStart(2, "0")}</Text>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.body}>{item.summary}</Text>
          </Card>
        ))}

        <Text style={styles.essay}>
          This product is a screening aid for four lesion families — acne, burns,
          rash, and warts — and three risk grades. It is not a melanoma detector,
          not an emergency service, and not medical advice.
        </Text>

        <PrimaryButton label="Use it anyway, carefully" onPress={() => router.push("/enter")} />
        <GhostButton label="Laboratory figures" onPress={() => router.push("/lab")} />
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
  steps: { gap: 10 },
  stepRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  n: { fontFamily: fonts.serif, color: colors.sage, fontSize: 14, width: 26 },
  step: { flex: 1, color: colors.muted, fontFamily: fonts.sans, lineHeight: 22, fontSize: 15 },
  cardTitle: { color: colors.ink, fontFamily: fonts.serifSemi, fontSize: 17 },
  body: { color: colors.muted, fontFamily: fonts.sans, lineHeight: 22, fontSize: 14 },
  archHead: { fontFamily: fonts.serif, color: colors.ink, fontSize: 22, letterSpacing: -0.4, marginTop: 6 },
});
