import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import {
  Body,
  CaptureRing,
  Card,
  Eyebrow,
  Fine,
  GhostButton,
  GradeTriad,
  PipelineStrip,
  PrimaryButton,
  Screen,
} from "../components/ui";
import { useApp } from "../context/AppContext";
import { fetchIngredientRecommendations, pct } from "../lib/api";
import { DECISION_LABEL } from "../lib/config";
import type { IngredientRecommendation } from "../lib/types";
import { colors, fonts, gradeColor, spacing } from "../lib/theme";

function titleFor(decision: string, risk?: string): string {
  if (decision === "quality_reject") return "Photograph not suitable";
  if (decision === "abstain") return "No single grade";
  if (decision === "unavailable") return "Model not loaded";
  return risk ? `${risk} risk` : "Unavailable";
}

export default function ResultScreen() {
  const { lastResult, lastPhotoUri } = useApp();
  const [showCam, setShowCam] = useState(true);
  const [ingredients, setIngredients] = useState<IngredientRecommendation | null>(null);

  useEffect(() => {
    if (!lastResult) router.replace("/assess");
  }, [lastResult]);

  useEffect(() => {
    if (!lastResult || lastResult.decision !== "grade" || !lastResult.risk) return;
    const condition = lastResult.condition?.used || lastResult.lesion || "rash";
    fetchIngredientRecommendations(condition, lastResult.risk)
      .then(setIngredients)
      .catch(() => setIngredients(null));
  }, [lastResult]);

  if (!lastResult) return null;

  const data = lastResult;
  const overlay = data.explainability?.overlay_jpeg;
  const issued = data.decision === "grade" ? data.risk : null;
  const cond = data.condition?.used || data.lesion;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.kickerRow}>
          <Eyebrow>{DECISION_LABEL[data.decision] || data.decision}</Eyebrow>
          <Text style={styles.modelTag}>
            {data.model.loaded ? data.model.kind || "V5" : "quality only"}
          </Text>
        </View>

        <Text style={[styles.headline, { color: gradeColor(issued) }]}>
          {titleFor(data.decision, data.risk)}
        </Text>
        <Body>{data.guidance?.summary || data.disclaimer}</Body>

        {cond ? (
          <Text style={styles.condition}>
            {data.condition?.source === "model"
              ? `Identified as ${cond}.`
              : `Lesion context: ${cond}.`}{" "}
            {data.condition?.note || ""}
          </Text>
        ) : null}

        {data.guidance?.alert ? (
          <View style={styles.alert}>
            <Text style={styles.alertText}>{data.guidance.alert}</Text>
          </View>
        ) : null}

        {lastPhotoUri ? (
          <View style={styles.plate}>
            <Image source={{ uri: lastPhotoUri }} style={styles.photo} />
            {overlay && data.explainability?.available && showCam ? (
              <Image source={{ uri: overlay }} style={styles.overlay} />
            ) : null}
            <CaptureRing />
            <Text style={styles.plateCap}>Plate · submitted frame</Text>
          </View>
        ) : null}

        {overlay && data.explainability?.available ? (
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Grad-CAM overlay</Text>
            <Switch
              value={showCam}
              onValueChange={setShowCam}
              trackColor={{ true: colors.sage, false: colors.wash }}
              thumbColor={colors.paper2}
            />
          </View>
        ) : null}
        {data.explainability?.note ? <Fine>{data.explainability.note}</Fine> : null}

        {data.model.loaded && data.decision !== "quality_reject" && data.decision !== "unavailable" ? (
          <GradeTriad probabilities={data.probabilities} leading={issued} />
        ) : data.decision === "quality_reject" ? (
          <Card>
            <Text style={styles.cardTitle}>Risk head not run</Text>
            <Text style={styles.cardBody}>
              The quality gate rejected this frame first, as specified in the method.
            </Text>
          </Card>
        ) : null}

        <Fine>
          Confidence {pct(data.confidence)} · margin {pct(data.margin)}
          {data.entropy != null ? ` · entropy ${data.entropy.toFixed(2)}` : ""}
        </Fine>

        {data.pipeline?.length ? (
          <View style={styles.block}>
            <Text style={styles.section}>Pipeline trace</Text>
            <PipelineStrip steps={data.pipeline} />
          </View>
        ) : null}

        <Card>
          <Text style={styles.cardTitle}>Photograph quality</Text>
          <Text style={styles.cardBody}>
            Score {data.quality.score.toFixed(2)} · {data.quality.width}×{data.quality.height} ·
            brightness {Math.round(data.quality.brightness || 0)}
          </Text>
          <Text style={styles.cardBody}>
            {(data.quality.flags || []).join(" · ") || "No quality flags"}
          </Text>
        </Card>

        {data.indicators ? (
          <Card>
            <Text style={styles.cardTitle}>Severity indicators</Text>
            <Text style={styles.cardBody}>
              Texture {data.indicators.texture_energy} · colour {data.indicators.color_variation} ·
              irregularity {data.indicators.structural_irregularity} · extent{" "}
              {data.indicators.estimated_extent}
            </Text>
            {(data.indicators.notes || []).map((note) => (
              <Text key={note} style={styles.cardBody}>
                {note}
              </Text>
            ))}
          </Card>
        ) : null}

        {data.guidance?.steps?.length ? (
          <Card>
            <Text style={styles.cardTitle}>Next steps</Text>
            {data.guidance.steps.map((step, i) => (
              <Text key={step} style={styles.step}>
                {String(i + 1).padStart(2, "0")}  {step}
              </Text>
            ))}
          </Card>
        ) : null}

        {data.lesion_effect?.note ? (
          <Card>
            <Text style={styles.cardTitle}>Lesion-context ablation</Text>
            <Text style={styles.cardBody}>{data.lesion_effect.note}</Text>
          </Card>
        ) : null}

        {ingredients ? (
          <Card>
            <Text style={styles.cardTitle}>Ingredient notes</Text>
            <Text style={styles.cardBody}>{ingredients.note}</Text>
            {ingredients.ingredients.map((item) => (
              <View key={item.name} style={styles.ingredient}>
                <Text style={styles.ingredientName}>{item.name}</Text>
                <Text style={styles.cardBody}>{item.benefit}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        <Fine>{data.disclaimer}</Fine>

        <PrimaryButton label="How to read the grade" onPress={() => router.push("/guidance")} />
        <GhostButton label="Advisory report" onPress={() => router.push("/report")} />
        <GhostButton label="New capture" onPress={() => router.replace("/assess")} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: 48 },
  kickerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modelTag: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  headline: {
    fontFamily: fonts.serif,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.7,
  },
  condition: { fontFamily: fonts.sans, color: colors.muted, fontSize: 14, lineHeight: 21 },
  alert: {
    borderWidth: 1,
    borderColor: "rgba(155, 64, 48, 0.35)",
    backgroundColor: "rgba(155, 64, 48, 0.08)",
    padding: 12,
  },
  alertText: { color: colors.high, fontFamily: fonts.sansMed, lineHeight: 21 },
  plate: {
    height: 300,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.lineStrong,
    position: "relative",
    backgroundColor: colors.wash,
  },
  photo: { width: "100%", height: "100%" },
  overlay: { ...StyleSheet.absoluteFill, opacity: 0.72 },
  plateCap: {
    position: "absolute",
    left: 10,
    bottom: 8,
    color: colors.paper2,
    fontFamily: fonts.serifItalic,
    fontSize: 13,
    textShadowColor: "rgba(28,24,20,0.5)",
    textShadowRadius: 6,
  },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  toggleLabel: { color: colors.ink, fontFamily: fonts.sansSemi, fontSize: 14 },
  block: { gap: 8 },
  section: {
    color: colors.sage,
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  cardTitle: { color: colors.ink, fontFamily: fonts.serifSemi, fontSize: 16 },
  cardBody: { color: colors.muted, fontFamily: fonts.sans, lineHeight: 21, fontSize: 14 },
  step: { color: colors.muted, fontFamily: fonts.sans, lineHeight: 22, fontSize: 14 },
  ingredient: { gap: 2, marginTop: 4 },
  ingredientName: { color: colors.sage, fontFamily: fonts.sansSemi },
});
