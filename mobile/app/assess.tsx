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
        <Title>Add a photo</Title>
        <Body>
          Use soft daylight. Fill the frame with the skin area. Hold still — blurry
          photos are rejected.
        </Body>

        <View style={styles.plate}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No photo yet</Text>
              <Text style={styles.emptyHint}>Take one or pick from your gallery</Text>
            </View>
          )}
          <CaptureRing />
        </View>

        <View style={styles.rowBtns}>
          <View style={styles.half}>
            <PrimaryButton label="Camera" onPress={takePhoto} disabled={busy} />
          </View>
          <View style={styles.half}>
            <GhostButton label="Gallery" onPress={pickFromLibrary} />
          </View>
        </View>

        <Text style={styles.section}>What are you checking? (optional)</Text>
        <View style={styles.chips}>
          <Pressable
            style={[styles.chip, lesion === "" && styles.chipOn]}
            onPress={() => setLesion("")}
          >
            <Text style={[styles.chipText, lesion === "" && styles.chipTextOn]}>Auto</Text>
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
            <Text style={styles.section}>Try a sample photo</Text>
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
          <PrimaryButton label="See results" onPress={runScreening} disabled={!photoUri} />
        )}
        <Fine>Results are guidance only.</Fine>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: 48 },
  plate: {
    height: 300,
    backgroundColor: colors.wash,
    borderRadius: radius.plate,
    overflow: "hidden",
    position: "relative",
  },
  preview: { width: "100%", height: "100%" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  emptyTitle: { fontFamily: fonts.serif, color: colors.ink, fontSize: 20 },
  emptyHint: {
    fontFamily: fonts.sans,
    color: colors.muted,
    fontSize: 14,
    marginTop: 6,
    textAlign: "center",
  },
  rowBtns: { flexDirection: "row", gap: spacing.sm },
  half: { flex: 1 },
  section: {
    color: colors.ink,
    fontFamily: fonts.sansSemi,
    fontSize: 14,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: colors.paper2,
  },
  chipOn: { backgroundColor: colors.sage, borderColor: colors.sage },
  chipText: {
    color: colors.ink,
    fontFamily: fonts.sansMed,
    textTransform: "capitalize",
    fontSize: 14,
  },
  chipTextOn: { color: colors.white },
  samples: { gap: 8 },
  sample: { marginRight: 10, width: 88 },
  sampleImg: {
    width: 88,
    height: 88,
    borderRadius: radius.tight,
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
