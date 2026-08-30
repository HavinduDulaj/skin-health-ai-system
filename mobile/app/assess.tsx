import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Body,
  CaptureRing,
  Eyebrow,
  Fine,
  GhostButton,
  PrimaryButton,
  Screen,
  Title,
} from "../components/ui";
import { useApp } from "../context/AppContext";
import { analyzeImage, fetchSamples, sampleImageUrl } from "../lib/api";
import { API_URL, LESIONS, type Lesion } from "../lib/config";
import { saveScreening } from "../lib/db";
import { colors, fonts, radius, spacing } from "../lib/theme";

export default function AssessScreen() {
  const { session, setLastScreening, apiOnline } = useApp();
  const [lesion, setLesion] = useState<Lesion | "">("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [samples, setSamples] = useState<
    Array<{ id: string; lesion: string; risk: string }>
  >([]);

  useEffect(() => {
    if (!session?.accepted) {
      router.replace("/enter");
    }
  }, [session]);

  useEffect(() => {
    fetchSamples()
      .then((data) => setSamples(data.items || []))
      .catch(() => setSamples([]));
  }, []);

  async function pickFromLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.92,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Camera", "Allow camera access or pick from the library.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.92,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function runScreening() {
    if (!photoUri) return;
    if (!apiOnline) {
      Alert.alert(
        "API offline",
        `Cannot reach ${API_URL}.\n\nStart the Python backend: python -m backend\nPhone and PC must share the same Wi‑Fi.`
      );
      return;
    }
    setBusy(true);
    try {
      const data = await analyzeImage(photoUri, lesion);
      await saveScreening(session?.name || "", lesion, data);
      setLastScreening(data, photoUri);
      router.push("/result");
    } catch (err) {
      Alert.alert("Screening failed", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Eyebrow>Plate · capture</Eyebrow>
        <Title>One lesion. Daylight. Fill the ring.</Title>
        <Body>
          Hold steady. Do not zoom digitally — move closer. Quality is scored
          before any risk grade is computed.
        </Body>

        <View style={styles.plate}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No frame yet</Text>
              <Text style={styles.emptyHint}>JPEG or PNG · one area filling most of the frame</Text>
            </View>
          )}
          <CaptureRing />
        </View>

        <View style={styles.rowBtns}>
          <View style={styles.half}>
            <PrimaryButton label="Take photograph" onPress={takePhoto} disabled={busy} />
          </View>
          <View style={styles.half}>
            <GhostButton label="From library" onPress={pickFromLibrary} />
          </View>
        </View>

        <Text style={styles.section}>Lesion family — leave blank to identify</Text>
        <View style={styles.chips}>
          <Pressable
            style={[styles.chip, lesion === "" && styles.chipOn]}
            onPress={() => setLesion("")}
          >
            <Text style={[styles.chipText, lesion === "" && styles.chipTextOn]}>Identify</Text>
          </Pressable>
          {LESIONS.map((item) => (
            <Pressable
              key={item}
              style={[styles.chip, lesion === item && styles.chipOn]}
              onPress={() => setLesion(item)}
            >
              <Text style={[styles.chipText, lesion === item && styles.chipTextOn]}>{item}</Text>
            </Pressable>
          ))}
        </View>

        {samples.length > 0 ? (
          <View style={styles.samples}>
            <Text style={styles.section}>Held-out test plates</Text>
            <Fine>Labels stay hidden until after you run them.</Fine>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {samples.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.sample}
                  onPress={() => {
                    setPhotoUri(sampleImageUrl(item.id));
                    setLesion(item.lesion as Lesion);
                  }}
                >
                  <Image source={{ uri: sampleImageUrl(item.id) }} style={styles.sampleImg} />
                  <Text style={styles.sampleLabel}>{item.lesion}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {busy ? (
          <View style={styles.busy}>
            <ActivityIndicator color={colors.sage} />
            <Text style={styles.busyText}>Reading the photograph…</Text>
          </View>
        ) : (
          <PrimaryButton
            label="Run screening"
            onPress={runScreening}
            disabled={!photoUri}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: 48 },
  plate: {
    height: 300,
    backgroundColor: colors.wash,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    overflow: "hidden",
    position: "relative",
  },
  preview: { width: "100%", height: "100%" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  emptyTitle: { fontFamily: fonts.serifItalic, color: colors.ink, fontSize: 20 },
  emptyHint: { fontFamily: fonts.sans, color: colors.muted, fontSize: 13, marginTop: 6, textAlign: "center" },
  rowBtns: { flexDirection: "row", gap: spacing.sm },
  half: { flex: 1 },
  section: {
    color: colors.sage,
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.tight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.paper2,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { color: colors.ink, fontFamily: fonts.sansMed, textTransform: "capitalize", fontSize: 14 },
  chipTextOn: { color: colors.paper2 },
  samples: { gap: 8 },
  sample: { marginRight: 10, width: 92 },
  sampleImg: { width: 92, height: 92, backgroundColor: colors.wash },
  sampleLabel: {
    textAlign: "center",
    color: colors.muted,
    marginTop: 4,
    textTransform: "capitalize",
    fontFamily: fonts.sans,
    fontSize: 12,
  },
  busy: { alignItems: "center", gap: 10, paddingVertical: 8 },
  busyText: { fontFamily: fonts.serifItalic, color: colors.sage, fontSize: 16 },
});
