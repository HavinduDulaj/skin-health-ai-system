import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import {
  Body,
  Card,
  DecisionPill,
  Eyebrow,
  Fine,
  Flag,
  GhostButton,
  GradeTriad,
  MeterBar,
  PipelineStrip,
  PrimaryButton,
  Screen,
} from "../components/ui";
import { useApp } from "../context/AppContext";
import { fetchIngredientRecommendations, pct } from "../lib/api";
import { DECISION_LABEL } from "../lib/config";
import type { IngredientRecommendation } from "../lib/types";
import { colors, fonts, gradeColor, radius, spacing } from "../lib/theme";

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
  const kicker = data.model.loaded
    ? data.model.kind === "keras_v5"
      ? "Screening result · V5"
      : "Screening result"
    : "Quality check only";

  const conditionLine = data.condition?.used
    ? `Detected condition: ${data.condition.used}${
        data.condition.source === "model" ? " (identified by the model)" : " (confirmed)"
      }. ${data.condition.note || ""}`
    : data.lesion
      ? `Lesion context: ${data.lesion}`
      : "Condition was not identified.";

  const uncertain =
    data.decision === "abstain"
      ? `Entropy ${data.entropy?.toFixed?.(2) ?? "—"}. Leading grade at ${pct(data.confidence)}, margin ${pct(data.margin)}.`
      : data.uncertain && data.risk
        ? "The two leading grades are close. Medium is the class this dataset struggles to separate."
        : data.risk
          ? `Leading grade at ${pct(data.confidence)}, margin ${pct(data.margin)}.`
          : "";

  const ind = data.indicators;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Eyebrow>{kicker}</Eyebrow>
        <DecisionPill
          label={DECISION_LABEL[data.decision] || data.decision}
          kind={data.decision}
        />
        <Text style={[styles.headline, { color: gradeColor(issued) }]}>
          {titleFor(data.decision, data.risk)}
        </Text>
        <Body>
          {data.guidance?.summary ||
            "A screening head is not on disk yet. Quality still ran."}
        </Body>

        {data.caution && data.guidance?.alert ? (
          <View style={styles.alert}>
            <Text style={styles.alertText}>{data.guidance.alert}</Text>
          </View>
        ) : null}

        <Text style={styles.condition}>{conditionLine}</Text>

        {data.pipeline?.length ? <PipelineStrip steps={data.pipeline} /> : null}

        {data.model.loaded && data.decision !== "quality_reject" && data.decision !== "unavailable" ? (
          <Card>
            <Text style={styles.cardTitle}>Grade probabilities</Text>
            <GradeTriad probabilities={data.probabilities} leading={issued} />
            {uncertain ? <Fine>{uncertain}</Fine> : null}
          </Card>
        ) : (
          <Card>
            <Text style={styles.cardTitle}>Grade probabilities</Text>
            <Fine>
              {data.decision === "quality_reject"
                ? "Risk inference was not run. The quality gate rejected this frame first."
                : "No screening head on disk yet. Quality still ran."}
            </Fine>
          </Card>
        )}

        {data.guidance?.steps?.length ? (
          <Card>
            <Text style={styles.cardTitle}>Skin health advisory</Text>
            {data.guidance.headline ? <Fine>{data.guidance.headline}</Fine> : null}
            {data.guidance.steps.map((step, i) => (
              <Text key={step} style={styles.step}>
                {i + 1}. {step}
              </Text>
            ))}
          </Card>
        ) : null}

        <Card>
          <Text style={styles.cardTitle}>Severity indicators</Text>
          {ind ? (
            <>
              {ind.notes?.length ? <Fine>{ind.notes.join(" ")}</Fine> : null}
              <Fine>
                Texture {ind.texture_energy} · colour variation {ind.color_variation} ·
                irregularity {ind.structural_irregularity} · extent {ind.estimated_extent}
              </Fine>
            </>
          ) : (
            <Fine>No severity indicators on this run.</Fine>
          )}
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Photograph quality</Text>
          <MeterBar
            label="Quality score"
            value={data.quality.score}
            maxLabel={data.quality.score.toFixed(2)}
          />
          <Fine>
            {data.quality.width || "?"}×{data.quality.height || "?"} · brightness{" "}
            {Math.round(data.quality.brightness || 0)}
          </Fine>
          <View style={styles.flags}>
            {(data.quality.flags || []).length ? (
              data.quality.flags.map((flag) => (
                <Flag key={flag}>{flag.replaceAll("_", " ")}</Flag>
              ))
            ) : (
              <Flag>no quality flags</Flag>
            )}
          </View>
        </Card>

        {lastPhotoUri ? (
          <Card>
            <Text style={styles.cardTitle}>Your frame</Text>
            <View style={styles.plate}>
              <Image source={{ uri: lastPhotoUri }} style={styles.photo} />
              {overlay && data.explainability?.available && showCam ? (
                <Image source={{ uri: overlay }} style={styles.overlay} />
              ) : null}
            </View>
            {overlay && data.explainability?.available ? (
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Show Grad-CAM overlay</Text>
                <Switch
                  value={showCam}
                  onValueChange={setShowCam}
                  trackColor={{ true: colors.sage, false: colors.wash }}
                  thumbColor={colors.white}
                />
              </View>
            ) : null}
            {data.explainability?.note ? <Fine>{data.explainability.note}</Fine> : null}
          </Card>
        ) : null}

        {data.lesion_effect?.note ? (
          <Card>
            <Text style={styles.cardTitle}>Lesion-context ablation</Text>
            <Fine>{data.lesion_effect.note}</Fine>
          </Card>
        ) : null}

        {ingredients ? (
          <Card>
            <Text style={styles.cardTitle}>Ingredient ideas</Text>
            <Fine>{ingredients.note}</Fine>
            {ingredients.ingredients.map((item) => (
              <View key={item.name} style={styles.ingredient}>
                <Text style={styles.ingredientName}>{item.name}</Text>
                <Text style={styles.cardBody}>{item.benefit}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        <View style={styles.actions}>
          <PrimaryButton
            label="Risk guidance dashboard"
            onPress={() => router.push("/guidance")}
          />
          <GhostButton label="Advisory report" onPress={() => router.push("/report")} />
          <GhostButton label="New assessment" onPress={() => router.replace("/assess")} />
        </View>

        <Text style={styles.disclaimer}>{data.disclaimer}</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: 48 },
  headline: {
    fontFamily: fonts.serifSemi,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.5,
    textTransform: "capitalize",
  },
  condition: {
    fontFamily: fonts.sans,
    color: colors.muted,
    fontSize: 15,
    textTransform: "capitalize",
  },
  alert: {
    borderRadius: radius.tight,
    borderWidth: 1,
    borderColor: "rgba(196, 92, 74, 0.35)",
    backgroundColor: "rgba(196, 92, 74, 0.08)",
    padding: 14,
  },
  alertText: { color: colors.high, fontFamily: fonts.sans, fontSize: 15, lineHeight: 21 },
  cardTitle: { color: colors.ink, fontFamily: fonts.serifSemi, fontSize: 17 },
  cardBody: { color: colors.muted, fontFamily: fonts.sans, lineHeight: 21, fontSize: 14 },
  step: { color: colors.muted, fontFamily: fonts.sans, lineHeight: 22, fontSize: 14 },
  flags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  plate: {
    height: 260,
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: colors.wash,
  },
  photo: { width: "100%", height: "100%" },
  overlay: { ...StyleSheet.absoluteFill, opacity: 0.7 },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleLabel: { color: colors.muted, fontFamily: fonts.sans, fontSize: 14 },
  ingredient: { gap: 2, marginTop: 4 },
  ingredientName: { color: colors.sage, fontFamily: fonts.sansSemi },
  actions: { gap: spacing.sm, marginTop: 4 },
  disclaimer: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
