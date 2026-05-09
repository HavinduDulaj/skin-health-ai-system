import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type RiskLevel = "Low" | "Medium" | "High";

type PredictionResult = {
  condition: string;
  riskLevel: RiskLevel;
  riskScore: number;
  riskConfidence: number;
  suggestedAction: string;
  disclaimer: string;
  allScores?: {
    condition: string;
    riskLevel: RiskLevel;
    score: number;
  }[];
  riskScores?: {
    riskLevel: RiskLevel;
    score: number;
  }[];
};

const API_URL =
  Platform.OS === "web"
    ? "http://127.0.0.1:8000/predict-risk"
    : "http://192.168.1.188:8000/predict-risk";

const riskColor: Record<RiskLevel, string> = {
  Low: "#16A34A",
  Medium: "#D97706",
  High: "#DC2626",
};

export default function RiskPredictionModule() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageAsset, setImageAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow gallery access to upload an image.");
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });

    if (!pickerResult.canceled) {
      const asset = pickerResult.assets[0];
      setImageAsset(asset);
      setImageUri(asset.uri);
      setResult(null);
      setErrorMessage(null);
    }
  };

  const predictRisk = async () => {
    if (!imageUri) {
      Alert.alert("Image required", "Please upload a skin lesion image first.");
      return;
    }

    const extension = imageAsset?.fileName?.split(".").pop()?.toLowerCase()
      || imageUri.split(".").pop()?.toLowerCase()
      || "jpg";
    const mimeType = imageAsset?.mimeType || `image/${extension === "jpg" ? "jpeg" : extension}`;
    const formData = new FormData();

    if (Platform.OS === "web") {
      const blob = imageAsset?.file
        ? imageAsset.file
        : await fetch(imageUri).then((response) => response.blob());
      formData.append("file", blob, imageAsset?.fileName || `skin-lesion.${extension}`);
    } else {
      formData.append("file", {
        uri: imageUri,
        name: imageAsset?.fileName || `skin-lesion.${extension}`,
        type: mimeType,
      } as any);
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.detail || "Prediction failed.");
      }

      setResult(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Backend connection failed.";
      setErrorMessage(message);
      Alert.alert("Prediction error", message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImageUri(null);
    setImageAsset(null);
    setResult(null);
    setErrorMessage(null);
  };

  const activeColor = result ? riskColor[result.riskLevel] : "#2563EB";

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.phone}>
        <View style={styles.header}>
          <Text style={styles.title}>Skin Risk Prediction</Text>
          <Text style={styles.subtitle}>Upload one lesion image to predict Low, Medium, or High risk.</Text>
        </View>

        <TouchableOpacity style={styles.uploadBox} onPress={pickImage} activeOpacity={0.8}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.emptyUpload}>
              <Text style={styles.uploadIcon}>+</Text>
              <Text style={styles.uploadText}>Upload image</Text>
              <Text style={styles.helperText}>JPG, PNG, WEBP, or AVIF</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryButton} onPress={imageUri ? predictRisk : pickImage}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>{imageUri ? "Predict Risk" : "Choose Image"}</Text>
          )}
        </TouchableOpacity>

        {imageUri && (
          <TouchableOpacity style={styles.secondaryButton} onPress={pickImage}>
            <Text style={styles.secondaryButtonText}>Change Image</Text>
          </TouchableOpacity>
        )}

        {errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {result && (
          <View style={[styles.resultPanel, { borderColor: activeColor }]}>
            <Text style={[styles.riskText, { color: activeColor }]}>{result.riskLevel} Risk</Text>
            <Text style={styles.conditionText}>Detected lesion type: {result.condition}</Text>

            <View style={styles.metricRow}>
              <View style={styles.metricBox}>
                <Text style={styles.metricValue}>{result.riskScore}%</Text>
                <Text style={styles.metricLabel}>Risk score</Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricValue}>{result.riskConfidence}%</Text>
                <Text style={styles.metricLabel}>Confidence</Text>
              </View>
            </View>

            <View style={styles.actionBox}>
              <Text style={styles.sectionTitle}>Suggested action</Text>
              <Text style={styles.normalText}>{result.suggestedAction}</Text>
            </View>

            {result.allScores && (
              <View style={styles.actionBox}>
                <Text style={styles.sectionTitle}>Model class scores</Text>
                {result.allScores.map((item) => (
                  <View key={item.condition} style={styles.scoreRow}>
                    <Text style={styles.normalText}>{item.condition}</Text>
                    <Text style={styles.scoreText}>{item.score}%</Text>
                  </View>
                ))}
              </View>
            )}

            {result.riskScores && (
              <View style={styles.actionBox}>
                <Text style={styles.sectionTitle}>Risk evidence</Text>
                {result.riskScores.map((item) => (
                  <View key={item.riskLevel} style={styles.scoreRow}>
                    <Text style={styles.normalText}>{item.riskLevel}</Text>
                    <Text style={styles.scoreText}>{item.score}%</Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.disclaimer}>{result.disclaimer}</Text>

            <TouchableOpacity style={styles.secondaryButton} onPress={reset}>
              <Text style={styles.secondaryButtonText}>New Prediction</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    backgroundColor: "#F4F7FB",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  phone: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: "#D9E2EF",
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    color: "#4B5563",
    lineHeight: 20,
    textAlign: "center",
  },
  uploadBox: {
    width: "100%",
    aspectRatio: 1,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#A9B8CC",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F8FAFC",
  },
  emptyUpload: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  uploadIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    textAlign: "center",
    lineHeight: 54,
    fontSize: 36,
    color: "#2563EB",
    borderWidth: 2,
    borderColor: "#2563EB",
    marginBottom: 14,
  },
  uploadText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
  },
  helperText: {
    marginTop: 6,
    color: "#6B7280",
    fontSize: 12,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  primaryButton: {
    minHeight: 54,
    backgroundColor: "#2563EB",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  secondaryButton: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#2563EB",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  secondaryButtonText: {
    color: "#2563EB",
    fontWeight: "900",
  },
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
    padding: 12,
  },
  errorText: {
    color: "#B91C1C",
    fontWeight: "700",
    lineHeight: 20,
  },
  resultPanel: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginTop: 18,
    backgroundColor: "#FFFFFF",
  },
  riskText: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    textAlign: "center",
  },
  conditionText: {
    color: "#374151",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 8,
  },
  metricRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  metricBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
  },
  metricLabel: {
    color: "#6B7280",
    marginTop: 4,
    fontSize: 12,
  },
  actionBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },
  sectionTitle: {
    color: "#111827",
    fontWeight: "900",
    marginBottom: 6,
  },
  normalText: {
    color: "#374151",
    lineHeight: 20,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 5,
  },
  scoreText: {
    color: "#111827",
    fontWeight: "800",
  },
  disclaimer: {
    marginTop: 14,
    color: "#6B7280",
    fontSize: 12,
    lineHeight: 18,
  },
});
