import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Body, Chip, Eyebrow, Fine, PrimaryButton, Screen, Title } from "../components/ui";
import { useApp } from "../context/AppContext";
import { dueFromChoice, PROGRESS_DISCLAIMER } from "../lib/compare";
import { saveTrackedScan } from "../lib/progressStore";
import { colors, fonts, radius, spacing } from "../lib/theme";

const CHOICES = [
  { id: "", label: "No reminder" },
  { id: "1", label: "Tomorrow" },
  { id: "3", label: "In 3 days" },
  { id: "7", label: "In 7 days" },
  { id: "14", label: "In 14 days" },
];

function pretty(value?: string | null): string {
  if (!value) return "Not graded";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function TrackScreen() {
  const { lastResult, lastPhotoUri, followSessionId, setFollowSessionId } = useApp();
  const [area, setArea] = useState("");
  const [product, setProduct] = useState("");
  const [start, setStart] = useState("");
  const [productNotes, setProductNotes] = useState("");
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);

  if (!lastResult) {
    return (
      <Screen>
        <Title>Scan first</Title>
        <Body>Complete a skin scan, then save it here.</Body>
        <PrimaryButton label="Take a photo" onPress={() => router.replace("/assess")} />
      </Screen>
    );
  }

  const condition = lastResult.condition?.used || lastResult.lesion || "";

  async function save() {
    const name = product.trim();
    if (name && !/^\d{4}-\d{2}-\d{2}$/.test(start.trim())) {
      Alert.alert("Product usage", "Add a start date as YYYY-MM-DD, or leave the product name blank.");
      return;
    }
    const dueAt = dueFromChoice(when);
    setBusy(true);
    try {
      const sessionId = await saveTrackedScan({
        followSessionId,
        result: lastResult!,
        photoUri: lastPhotoUri,
        bodyArea: area.trim(),
        notes: "",
        productName: name,
        productStart: start.trim(),
        productNotes: productNotes.trim(),
        dueAt,
      });
      setFollowSessionId("");
      router.replace({ pathname: "/compare", params: { id: sessionId } });
    } catch {
      Alert.alert("Could not save", "The scan result is still on this screen. Try saving again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Eyebrow>Skin progress</Eyebrow>
        <Title>{followSessionId ? "Save follow-up scan" : "Track skin progress"}</Title>
        <Body>
          {pretty(condition)} · predicted risk {pretty(lastResult.risk)}
          {lastResult.confidence != null
            ? ` · confidence ${Math.round(lastResult.confidence * 100)}%`
            : ""}
        </Body>
        <Text style={styles.label}>Body area (optional)</Text>
        <TextInput
          value={area}
          onChangeText={setArea}
          placeholder="e.g. left cheek"
          placeholderTextColor={colors.muted}
          style={styles.input}
          maxLength={40}
        />
        <Text style={styles.section}>Product usage (optional)</Text>
        <Fine>
          Type a product you already use. This does not recommend products or claim they treat a
          condition. Leave the name blank to skip.
        </Fine>
        <Text style={styles.label}>Product name</Text>
        <TextInput
          value={product}
          onChangeText={setProduct}
          placeholder="e.g. Acne cream"
          placeholderTextColor={colors.muted}
          style={styles.input}
          maxLength={80}
        />
        <Text style={styles.label}>Start date</Text>
        <TextInput
          value={start}
          onChangeText={setStart}
          placeholder="2026-10-16"
          placeholderTextColor={colors.muted}
          style={styles.input}
          autoCapitalize="none"
        />
        <Text style={styles.label}>Usage notes</Text>
        <TextInput
          value={productNotes}
          onChangeText={setProductNotes}
          placeholder="e.g. Applied once daily"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.area]}
          multiline
          maxLength={240}
        />
        <Text style={styles.section}>When would you like to check your skin again?</Text>
        <View style={styles.chips}>
          {CHOICES.map((choice) => (
            <Chip
              key={choice.id || "none"}
              label={choice.label}
              capitalize={false}
              selected={when === choice.id}
              onPress={() => setWhen(choice.id)}
            />
          ))}
        </View>
        <Fine>
          A reminder is only a personal prompt. It does not mean it is medically safe to wait until
          that time. On this phone it appears when you open the app.
        </Fine>
        <PrimaryButton label={busy ? "Saving…" : "Save progress"} onPress={save} disabled={busy} />
        <Fine>{PROGRESS_DISCLAIMER}</Fine>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.sm, paddingBottom: 48 },
  section: {
    marginTop: spacing.sm,
    fontFamily: fonts.serifSemi,
    fontSize: 22,
    color: colors.ink,
  },
  label: { fontFamily: fonts.sansMed, color: colors.ink, marginTop: spacing.xs },
  input: {
    fontFamily: fonts.sans,
    color: colors.ink,
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.tight,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  area: { minHeight: 72, textAlignVertical: "top" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
