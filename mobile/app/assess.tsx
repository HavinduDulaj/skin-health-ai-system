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
  Chip,
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
import { colors, fonts, spacing } from "../lib/theme";

const TIPS = [
  "Hold steady.",
  "Move closer instead of zooming.",
  "Quality is checked before any risk grade.",
];

export default function AssessScreen() {
  const { session, setLastScreening, apiOnline } = useApp();
  const [lesion, setLesion] = useState<Lesion | "">("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [samples, setSamples] = useState<
    Array<{ id: string; lesion: string; risk: string }>
  >([]);

  useEffect(() => {
    if (!session?.accepted) router.replace("/enter");
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
      Alert.alert("Camera", "Allow camera access or choose a photo instead.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.92 });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function runScreening() {
    if (!photoUri) return;
    if (!apiOnline) {
      Alert.alert(
        "Can't connect",
        `Open the API on your computer, then try again.\n\n${API_URL}`
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
      Alert.alert("Something went wrong", err instanceof Error ? err.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Eyebrow>Photo</Eyebrow>
        <Title>Add a clear photo</Title>
        <Body>
          Soft daylight. Fill the frame with the skin area. Hold still — blurry
          photos are rejected.
        </Body>

        <View style={styles.tips}>
          {TIPS.map((tip, i) => (
            <Text key={tip} style={styles.tip}>
              {i + 1}. {tip}
            </Text>
          ))}
        </View>

        <View style={styles.well}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Add a photograph here</Text>
              <Text style={styles.emptyHint}>JPEG, PNG, or WebP · under 12 MB</Text>
            </View>
          )}
          <CaptureRing />
        </View>

        <View style={styles.rowBtns}>
          <View style={styles.half}>
            <PrimaryButton label="Upload photo" onPress={pickFromLibrary} disabled={busy} />
          </View>
          <View style={styles.half}>
            <GhostButton label="Use camera" onPress={takePhoto} />
          </View>
        </View>

        <Text style={styles.legend}>
          Lesion family — leave blank to let the system identify it
        </Text>
        <View style={styles.chips}>
          <Chip
            label="Identify automatically"
            selected={lesion === ""}
            onPress={() => setLesion("")}
            capitalize={false}
          />
          {LESIONS.map((item) => (
            <Chip
              key={item}
              label={item}
              selected={lesion === item}
              onPress={() => setLesion(item)}
            />
          ))}
        </View>

        {samples.length > 0 ? (
          <View style={styles.samples}>
            <Text style={styles.galleryTitle}>Or try a held-out test image</Text>
            <Fine>From the cleaned test split. Labels are hidden until after you run it.</Fine>
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
            <Text style={styles.busyText}>Checking your photo…</Text>
          </View>
        ) : (
          <>
            <Fine>
              {photoUri ? "Photograph ready." : "Choose a photograph to continue."}
            </Fine>
            <PrimaryButton label="See results" onPress={runScreening} disabled={!photoUri} />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: 48 },
  tips: { gap: 4, marginTop: -4 },
  tip: { color: colors.muted, fontFamily: fonts.sans, fontSize: 15, lineHeight: 22 },
  well: {
    height: 300,
    backgroundColor: colors.paper2,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.lineStrong,
  },
  preview: { width: "100%", height: "100%" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  emptyTitle: { fontFamily: fonts.serif, color: colors.ink, fontSize: 22 },
  emptyHint: {
    fontFamily: fonts.sans,
    color: colors.muted,
    fontSize: 14,
    marginTop: 6,
    textAlign: "center",
  },
  rowBtns: { flexDirection: "row", gap: spacing.sm },
  half: { flex: 1 },
  legend: {
    color: colors.sage,
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  samples: { gap: 8 },
  galleryTitle: { fontFamily: fonts.serifSemi, color: colors.ink, fontSize: 20 },
  sample: { marginRight: 10, width: 88 },
  sampleImg: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: colors.wash,
  },
  sampleLabel: {
    textAlign: "center",
    color: colors.muted,
    marginTop: 6,
    textTransform: "capitalize",
    fontFamily: fonts.sans,
    fontSize: 12,
  },
  busy: { alignItems: "center", gap: 10, paddingVertical: 8 },
  busyText: { fontFamily: fonts.sansMed, color: colors.sage, fontSize: 15 },
});
