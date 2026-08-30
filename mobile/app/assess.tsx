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
  Eyebrow,
  PrimaryButton,
  Screen,
  Title,
} from "../components/ui";
import { useApp } from "../context/AppContext";
import { analyzeImage, fetchSamples, sampleImageUrl } from "../lib/api";
import { API_URL, LESIONS, type Lesion } from "../lib/config";
import { saveScreening } from "../lib/db";
import { colors, spacing } from "../lib/theme";

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
      Alert.alert("Camera permission", "Allow camera access or pick from gallery instead.");
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
        `Cannot reach ${API_URL}.\n\nStart the Python backend: python -m backend\nEnsure phone and PC share the same Wi‑Fi.`
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
      <ScrollView contentContainerStyle={styles.scroll}>
        <Eyebrow>Image upload</Eyebrow>
        <Title>Photograph the lesion.</Title>
        <Body>
          Use daylight without flash. Fill the frame with the lesion. You may confirm the
          lesion family or let the model identify it.
        </Body>

        <View style={styles.actions}>
          <PrimaryButton label="Take photo" onPress={takePhoto} disabled={busy} />
          <PrimaryButton label="Choose from gallery" onPress={pickFromLibrary} disabled={busy} />
        </View>

        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>No photograph yet</Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>Lesion family (optional)</Text>
        <View style={styles.chips}>
          {LESIONS.map((item) => (
            <Pressable
              key={item}
              style={[styles.chip, lesion === item && styles.chipActive]}
              onPress={() => setLesion(item)}
            >
              <Text style={[styles.chipText, lesion === item && styles.chipTextActive]}>
                {item}
              </Text>
            </Pressable>
          ))}
        </View>

        {samples.length > 0 && (
          <View style={styles.samples}>
            <Text style={styles.sectionLabel}>Test samples</Text>
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
        )}

        {busy ? (
          <ActivityIndicator color={colors.sage} size="large" />
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
  scroll: { gap: spacing.md, paddingBottom: spacing.xl },
  actions: { gap: spacing.sm },
  preview: { width: "100%", height: 280, borderRadius: 18 },
  placeholder: {
    height: 220,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paper2,
  },
  placeholderText: { color: colors.muted },
  sectionLabel: { color: colors.ink, fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.paper2,
  },
  chipActive: { backgroundColor: colors.sage, borderColor: colors.sage },
  chipText: { color: colors.ink, textTransform: "capitalize" },
  chipTextActive: { color: colors.white },
  samples: { gap: spacing.sm },
  sample: { marginRight: spacing.sm, width: 96 },
  sampleImg: { width: 96, height: 96, borderRadius: 12 },
  sampleLabel: { textAlign: "center", color: colors.muted, marginTop: 4, textTransform: "capitalize" },
});
