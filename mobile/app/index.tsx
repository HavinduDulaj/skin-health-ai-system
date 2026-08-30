import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  Body,
  Card,
  Eyebrow,
  GhostButton,
  Mark,
  PrimaryButton,
  Rule,
  Screen,
  StatusLamp,
  Title,
} from "../components/ui";
import { useApp } from "../context/AppContext";
import { fetchLab } from "../lib/api";
import { API_URL, PROJECT_CODE } from "../lib/config";
import { colors, fonts, spacing } from "../lib/theme";

const NOTES = [
  {
    n: "01",
    title: "The model may abstain",
    copy: "When the top-two grades are close, the API returns a distribution — not a forced winner. That is the research, not a defect.",
  },
  {
    n: "02",
    title: "Quality first, then risk",
    copy: "A weak photograph is rejected before the risk head runs. The quality gate is part of the method.",
  },
  {
    n: "03",
    title: "Grad-CAM on the grade",
    copy: "Warmer regions raised the leading Low / Medium / High score. The heatmap explains the risk head. It is not a diagnosis.",
  },
];

export default function HomeScreen() {
  const { health, apiOnline } = useApp();
  const [images, setImages] = useState<string>("—");
  const [leak, setLeak] = useState("unchecked");

  useEffect(() => {
    fetchLab()
      .then((data) => {
        const ds = (data.dataset || {}) as { final_images?: number };
        const ig = (data.integrity || {}) as { leakage?: string };
        if (ds.final_images) setImages(ds.final_images.toLocaleString("en-US"));
        if (String(ig.leakage || "").includes("PASSED")) setLeak("passed");
      })
      .catch(() => undefined);
  }, []);

  const lamp = apiOnline
    ? health?.model_loaded
      ? `${health.model_kind || "head"} loaded · ${health.version}`
      : `API ${health?.version ?? ""} · quality screening only`
    : `Python API offline at ${API_URL}`;

  return (
    <Screen style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.markRow}>
          <Mark size={18} />
          <Eyebrow>
            {PROJECT_CODE} · member 2
          </Eyebrow>
        </View>

        <Title>
          Risk-level screening{"\n"}
          <Text style={styles.italic}>without a diagnosis.</Text>
        </Title>

        <Body>
          Photograph a lesion. The system identifies acne, burns, rash, or warts,
          grades Low, Medium, or High, and may abstain or reject a poor frame.
        </Body>

        <View style={styles.actions}>
          <PrimaryButton label="Begin a session" onPress={() => router.push("/enter")} />
          <View style={styles.rowBtns}>
            <View style={styles.half}>
              <GhostButton label="Method" onPress={() => router.push("/method")} />
            </View>
            <View style={styles.half}>
              <GhostButton label="Screening log" onPress={() => router.push("/history")} />
            </View>
          </View>
        </View>

        <Rule />

        <StatusLamp on={apiOnline} label={lamp} />
        <Text style={styles.meta}>
          {images} images in the rebuilt set · leakage check {leak}
        </Text>

        {NOTES.map((item) => (
          <Card key={item.n}>
            <Text style={styles.noteN}>{item.n}</Text>
            <Text style={styles.noteTitle}>{item.title}</Text>
            <Text style={styles.noteCopy}>{item.copy}</Text>
          </Card>
        ))}

        <Text style={styles.ceiling}>
          V5 test accuracy is about 60%. Medium remains weakly separable in
          consumer photographs. That ceiling is part of the result.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { paddingTop: spacing.sm },
  scroll: { gap: spacing.md, paddingBottom: 48 },
  markRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  italic: {
    fontFamily: fonts.serifItalic,
    color: colors.sage,
  },
  actions: { gap: spacing.sm, marginTop: 4 },
  rowBtns: { flexDirection: "row", gap: spacing.sm },
  half: { flex: 1 },
  meta: { color: colors.muted, fontFamily: fonts.sans, fontSize: 13, lineHeight: 18 },
  noteN: { fontFamily: fonts.serif, color: colors.sage, fontSize: 13 },
  noteTitle: { fontFamily: fonts.serifSemi, color: colors.ink, fontSize: 17 },
  noteCopy: { fontFamily: fonts.sans, color: colors.muted, lineHeight: 21, fontSize: 14 },
  ceiling: {
    fontFamily: fonts.serifItalic,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
  },
});
