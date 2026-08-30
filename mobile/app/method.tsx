import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  ArchRow,
  Card,
  Eyebrow,
  PrimaryButton,
  Screen,
  Title,
} from "../components/ui";
import { fetchResearch } from "../lib/api";
import { colors, fonts, spacing } from "../lib/theme";

const FALLBACK_PIPELINE = [
  "Validate files, find exact and near-duplicates, score quality.",
  "Flag inconsistent labels inside each lesion type. No auto-relabel.",
  "Rebuild a stratified 70 / 15 / 15 split. Near-duplicate groups stay together.",
  "Train EfficientNetV2-B0 with a lesion one-hot. Test is read once.",
  "Serve grades through a versioned API that may abstain, reject the frame, and show Grad-CAM.",
];

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
  const pipeline = ((method.pipeline || FALLBACK_PIPELINE) as string[]).slice(0, 6);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Eyebrow>Method</Eyebrow>
        <Title>Built to be honest when the photographs are not separable.</Title>
        <Text style={styles.essay}>
          {method.problem ||
            "A previous model sat near 57–60% test accuracy, mostly mixing Medium with Low and High. Cleaning can remove duplicates, blur, and train/test leakage. It cannot invent a visual boundary that is not in the pictures."}
        </Text>

        <View style={styles.steps}>
          {pipeline.map((step, i) => (
            <View key={step} style={styles.stepRow}>
              <Text style={styles.n}>{i + 1}.</Text>
              <Text style={styles.step}>{step}</Text>
            </View>
          ))}
        </View>

        {method.model ? <Text style={styles.essay}>{method.model}</Text> : null}

        {architecture.length ? (
          <>
            <Text style={styles.archHeading}>Proposal architecture (this component)</Text>
            {architecture.map((item, i) => (
              <ArchRow
                key={item.title}
                index={i + 1}
                title={item.title}
                summary={item.summary}
              />
            ))}
          </>
        ) : null}

        {contributions.slice(0, 4).map((item) => (
          <Card key={item.title}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.body}>{item.summary}</Text>
          </Card>
        ))}

        <Text style={styles.essay}>
          This product is a screening aid for four lesion families — acne, burns,
          rash, and warts — and three risk grades. It is not a melanoma detector,
          not an emergency service, and not medical advice.
        </Text>

        <PrimaryButton
          label="Use it anyway, carefully"
          onPress={() => router.push("/assess")}
        />
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
  n: {
    fontFamily: fonts.serif,
    color: colors.sage,
    fontSize: 16,
    width: 22,
  },
  step: { flex: 1, color: colors.muted, fontFamily: fonts.sans, lineHeight: 22, fontSize: 15 },
  archHeading: {
    fontFamily: fonts.serif,
    color: colors.ink,
    fontSize: 20,
    marginTop: 4,
  },
  cardTitle: { color: colors.ink, fontFamily: fonts.serifSemi, fontSize: 17 },
  body: { color: colors.muted, fontFamily: fonts.sans, lineHeight: 22, fontSize: 14 },
});
