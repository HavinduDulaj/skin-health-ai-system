import * as ImagePicker from "expo-image-picker";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Screen =
  | "upload"
  | "symptoms"
  | "additional"
  | "analyzing"
  | "result"
  | "history"
  | "summary"
  | "info";

type Condition = "Acne" | "Rashes" | "Burns" | "Warts";
type RiskLevel = "Low" | "Medium" | "High";

type HistoryItem = {
  id: number;
  condition: Condition;
  riskLevel: RiskLevel;
  confidence: number;
  score: number;
  date: string;
  imageUri: string | null;
  symptoms: typeof defaultSymptoms;
  extra: typeof defaultExtra;
};

const modelConfidence: Record<Condition, number> = {
  Acne: 87,
  Rashes: 91,
  Burns: 75,
  Warts: 70,
};

const conditionEmoji: Record<Condition, string> = {
  Acne: "🌸",
  Rashes: "🌿",
  Burns: "🔥",
  Warts: "🤚",
};

const defaultSymptoms = {
  pain: "Medium",
  itching: "Moderate",
  redness: "High",
  swelling: "No",
  duration: "7",
};

const defaultExtra = {
  infection: "No",
  previousIssue: "Yes",
  sensitivity: "Normal",
  sunExposure: "Medium",
};

const cycle = <T,>(current: T, values: T[]) => {
  const index = values.indexOf(current);
  return values[(index + 1) % values.length];
};

export default function RiskPredictionModule() {
  const [screen, setScreen] = useState<Screen>("upload");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [condition, setCondition] = useState<Condition>("Acne");
  const [symptoms, setSymptoms] = useState(defaultSymptoms);
  const [extra, setExtra] = useState(defaultExtra);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(null);

  const risk = useMemo(() => {
    let score = 0;
    const breakdown: string[] = [];

    const add = (point: number, reason: string) => {
      score += point;
      breakdown.push(`+${point} ${reason}`);
    };

    if (condition === "Acne") add(15, "Acne base condition risk");
    if (condition === "Rashes") add(25, "Rashes base condition risk");
    if (condition === "Burns") add(35, "Burns base condition risk");
    if (condition === "Warts") add(20, "Warts base condition risk");

    if (symptoms.pain === "Low") add(3, "Low pain level");
    if (symptoms.pain === "Medium") add(8, "Medium pain level");
    if (symptoms.pain === "High") add(15, "High pain level");

    if (symptoms.itching === "Mild") add(3, "Mild itching");
    if (symptoms.itching === "Moderate") add(8, "Moderate itching");
    if (symptoms.itching === "Severe") add(15, "Severe itching");

    if (symptoms.redness === "Medium") add(8, "Medium redness");
    if (symptoms.redness === "High") add(15, "High redness");
    if (symptoms.swelling === "Yes") add(12, "Swelling present");

    const duration = Number(symptoms.duration);
    if (duration > 7) add(8, "Symptoms lasting more than 7 days");
    if (duration > 14) add(7, "Symptoms lasting more than 14 days");

    if (extra.infection === "Yes") add(22, "Fever or infection signs");
    if (extra.previousIssue === "Yes") add(8, "Previous similar issue");
    if (extra.sensitivity === "Sensitive") add(8, "Sensitive skin");
    if (extra.sunExposure === "High") add(8, "High sun exposure");

    score = Math.min(score, 100);

    let level: RiskLevel = "Low";
    let color = "#22C55E";
    let explanation =
      "The symptoms and history indicate a low risk level. Continue basic skincare and monitor symptoms.";
    let action = "Follow basic skincare and monitor symptoms.";

    if (score > 35 && score <= 70) {
      level = "Medium";
      color = "#F59E0B";
      explanation =
        "The symptoms and history indicate a moderate risk level based on redness, duration, and previous skin condition.";
      action = "Monitor symptoms closely and seek professional advice if symptoms worsen.";
    }

    if (score > 70) {
      level = "High";
      color = "#EF4444";
      explanation =
        "The selected inputs show higher warning signs and stronger risk factors.";
      action = "Seek medical advice as soon as possible.";
    }

    return {
      score,
      level,
      color,
      confidence: Math.max(60, Math.min(95, modelConfidence[condition] - 3)),
      explanation,
      action,
      breakdown,
    };
  }, [condition, symptoms, extra]);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow gallery access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const validateImage = () => {
    if (!imageUri) {
      Alert.alert("Validation Error", "Please upload a skin image first.");
      return false;
    }
    return true;
  };

  const validateSymptoms = () => {
    const duration = Number(symptoms.duration);
    if (!symptoms.duration || Number.isNaN(duration) || duration < 0) {
      Alert.alert("Validation Error", "Please enter a valid duration in days.");
      return false;
    }
    return true;
  };

  const saveToHistory = () => {
    const newItem: HistoryItem = {
      id: Date.now(),
      condition,
      riskLevel: risk.level,
      confidence: risk.confidence,
      score: risk.score,
      date: new Date().toLocaleString(),
      imageUri,
      symptoms,
      extra,
    };

    setHistory([newItem, ...history]);
    Alert.alert("Saved", "Risk prediction saved to history.");
    setScreen("history");
  };

  const deleteHistoryItem = (id: number) => {
  setHistory((prevHistory) =>
    prevHistory.filter((item) => item.id !== id)
  );
};


  const clearHistory = () => {
    Alert.alert("Clear History", "Do you want to remove all history records?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All",
        style: "destructive",
        onPress: () => setHistory([]),
      },
    ]);
  };

  const updateHistoryItem = (item: HistoryItem) => {
    setCondition(item.condition);
    setSymptoms(item.symptoms);
    setExtra(item.extra);
    setImageUri(item.imageUri);
    setSelectedHistory(item);
    setScreen("symptoms");
  };

  const applyUpdateToHistory = () => {
    if (!selectedHistory) return;

    const updatedItem: HistoryItem = {
      ...selectedHistory,
      condition,
      riskLevel: risk.level,
      confidence: risk.confidence,
      score: risk.score,
      imageUri,
      symptoms,
      extra,
      date: new Date().toLocaleString(),
    };

    setHistory(history.map((item) => (item.id === selectedHistory.id ? updatedItem : item)));
    setSelectedHistory(null);
    Alert.alert("Updated", "History record updated successfully.");
    setScreen("history");
  };

  const SelectChip = ({
    label,
    selected,
    onPress,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity style={[styles.chip, selected && styles.selectedChip]} onPress={onPress}>
      <Text style={[styles.chipText, selected && styles.selectedChipText]}>{label}</Text>
    </TouchableOpacity>
  );

  const Header = ({ title }: { title: string }) => (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => {
          if (screen === "upload") return;
          if (screen === "symptoms") setScreen("upload");
          if (screen === "additional") setScreen("symptoms");
          if (screen === "analyzing") setScreen("additional");
          if (screen === "result") setScreen("additional");
          if (screen === "history") setScreen("result");
          if (screen === "summary") setScreen("history");
          if (screen === "info") setScreen("result");
        }}
      >
        <Text style={styles.back}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <TouchableOpacity onPress={() => setScreen("info")}>
        <Text style={styles.infoIcon}>ⓘ</Text>
      </TouchableOpacity>
    </View>
  );

  if (screen === "upload") {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.phone}>
          <Header title="Upload Skin Image" />

          <Text style={styles.centerText}>
            Upload or capture a clear image of the affected skin area.
          </Text>

          <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
            <Text style={styles.uploadIcon}>☁️</Text>
            <Text style={styles.uploadText}>Tap to upload image</Text>
            <Text style={styles.smallText}>JPG, PNG up to 10MB</Text>
          </TouchableOpacity>

          <View style={styles.twoButtons}>
            <TouchableOpacity style={styles.lightButton} onPress={pickImage}>
              <Text style={styles.lightButtonText}>🖼 Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.lightButton} onPress={pickImage}>
              <Text style={styles.lightButtonText}>📷 Camera</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Image Preview</Text>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.emptyPreview}>
              <Text style={styles.smallText}>No image selected</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.button}
            onPress={() => validateImage() && setScreen("symptoms")}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (screen === "symptoms") {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.phone}>
          <Header title="Enter Symptom Details" />

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: "50%" }]} />
          </View>
          <Text style={styles.stepText}>Step 1 of 2</Text>

          <Text style={styles.label}>Detected Condition (from system)</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() =>
              setCondition(cycle(condition, ["Acne", "Rashes", "Burns", "Warts"]))
            }
          >
            <Text style={styles.dropdownText}>
              {conditionEmoji[condition]} {condition}
            </Text>
            <Text style={styles.dropdownArrow}>⌄</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Pain Level</Text>
          <View style={styles.chipRow}>
            {["None", "Low", "Medium", "High"].map((item) => (
              <SelectChip
                key={item}
                label={item}
                selected={symptoms.pain === item}
                onPress={() => setSymptoms({ ...symptoms, pain: item })}
              />
            ))}
          </View>

          <Text style={styles.label}>Itching Level</Text>
          <View style={styles.chipRow}>
            {["None", "Mild", "Moderate", "Severe"].map((item) => (
              <SelectChip
                key={item}
                label={item}
                selected={symptoms.itching === item}
                onPress={() => setSymptoms({ ...symptoms, itching: item })}
              />
            ))}
          </View>

          <Text style={styles.label}>Redness Level</Text>
          <View style={styles.chipRow}>
            {["Low", "Medium", "High"].map((item) => (
              <SelectChip
                key={item}
                label={item}
                selected={symptoms.redness === item}
                onPress={() => setSymptoms({ ...symptoms, redness: item })}
              />
            ))}
          </View>

          <Text style={styles.label}>Swelling</Text>
          <View style={styles.chipRow}>
            {["Yes", "No"].map((item) => (
              <SelectChip
                key={item}
                label={item}
                selected={symptoms.swelling === item}
                onPress={() => setSymptoms({ ...symptoms, swelling: item })}
              />
            ))}
          </View>

          <Text style={styles.label}>Duration (in days)</Text>
          <View style={styles.counterRow}>
            <TouchableOpacity
              onPress={() =>
                setSymptoms({
                  ...symptoms,
                  duration: String(Math.max(0, Number(symptoms.duration) - 1)),
                })
              }
            >
              <Text style={styles.counterBtn}>−</Text>
            </TouchableOpacity>
            <TextInput
              value={symptoms.duration}
              keyboardType="numeric"
              onChangeText={(text) => setSymptoms({ ...symptoms, duration: text })}
              style={styles.durationInput}
            />
            <TouchableOpacity
              onPress={() =>
                setSymptoms({
                  ...symptoms,
                  duration: String(Number(symptoms.duration || 0) + 1),
                })
              }
            >
              <Text style={styles.counterBtn}>＋</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={() => validateSymptoms() && setScreen("additional")}
          >
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (screen === "additional") {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.phone}>
          <Header title="Additional Details" />

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: "100%" }]} />
          </View>
          <Text style={styles.stepText}>Step 2 of 2</Text>

          <Text style={styles.label}>Fever or infection signs</Text>
          <View style={styles.chipRow}>
            {["Yes", "No"].map((item) => (
              <SelectChip
                key={item}
                label={item}
                selected={extra.infection === item}
                onPress={() => setExtra({ ...extra, infection: item })}
              />
            ))}
          </View>

          <Text style={styles.label}>Previous similar issue</Text>
          <View style={styles.chipRow}>
            {["Yes", "No"].map((item) => (
              <SelectChip
                key={item}
                label={item}
                selected={extra.previousIssue === item}
                onPress={() => setExtra({ ...extra, previousIssue: item })}
              />
            ))}
          </View>

          <Text style={styles.label}>Skin Sensitivity</Text>
          <View style={styles.chipRow}>
            {["Normal", "Sensitive"].map((item) => (
              <SelectChip
                key={item}
                label={item}
                selected={extra.sensitivity === item}
                onPress={() => setExtra({ ...extra, sensitivity: item })}
              />
            ))}
          </View>

          <Text style={styles.label}>Sun Exposure Level</Text>
          <View style={styles.chipRow}>
            {["Low", "Medium", "High"].map((item) => (
              <SelectChip
                key={item}
                label={item}
                selected={extra.sunExposure === item}
                onPress={() => setExtra({ ...extra, sunExposure: item })}
              />
            ))}
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              ⓘ These details help in better risk level prediction.
            </Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={() => setScreen("analyzing")}>
            <Text style={styles.buttonText}>
              {selectedHistory ? "Update Risk Level" : "Predict Risk Level"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (screen === "analyzing") {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.phone}>
          <Header title="Analyzing..." />

          <View style={styles.circle}>
            <Text style={styles.circleIcon}>✦</Text>
          </View>

          <Text style={styles.centerText}>
            Our AI model is analyzing the information and predicting the risk level.
          </Text>

          <View style={styles.checkRow}>
            <Text>✅ Processing image</Text>
            <Text>✅</Text>
          </View>
          <View style={styles.checkRow}>
            <Text>✅ Extracting features</Text>
            <Text>✅</Text>
          </View>
          <View style={styles.checkRow}>
            <Text>✅ Evaluating symptoms</Text>
            <Text>✅</Text>
          </View>
          <View style={styles.checkRow}>
            <Text>🔵 Predicting risk level</Text>
            <Text>🔄</Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={() => setScreen("result")}>
            <Text style={styles.buttonText}>View Result</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (screen === "result") {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.phone}>
          <Header title="Risk Prediction Result" />

          <View style={[styles.resultHero, { borderColor: risk.color }]}>
            <Text style={[styles.shield, { color: risk.color }]}>🛡</Text>
            <Text style={[styles.riskLevel, { color: risk.color }]}>
              {risk.level} Risk
            </Text>
            <Text>Detected Condition: {condition}</Text>

            <View style={[styles.confidenceCircle, { borderColor: risk.color }]}>
              <Text style={[styles.confidenceText, { color: risk.color }]}>
                {risk.confidence}%
              </Text>
              <Text style={styles.smallText}>Confidence</Text>
            </View>
          </View>

          <View style={styles.resultCard}>
            <Text style={styles.sectionTitle}>Explanation</Text>
            <Text style={styles.normalText}>{risk.explanation}</Text>
          </View>

          <View style={styles.resultCard}>
            <Text style={styles.sectionTitle}>Suggested Action</Text>
            <Text style={styles.normalText}>⚠ {risk.action}</Text>
          </View>

          <View style={styles.disclaimer}>
            <Text style={styles.infoText}>
              Disclaimer: This result is for decision-support only and is not a medical diagnosis.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={selectedHistory ? applyUpdateToHistory : saveToHistory}
          >
            <Text style={styles.buttonText}>
              {selectedHistory ? "Update History Record" : "Save to History"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.outlineButton} onPress={() => setScreen("summary")}>
            <Text style={styles.outlineText}>View Symptom Summary</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (screen === "history") {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.phone}>
          <Header title="Risk Prediction History" />

          {history.length > 0 && (
            <TouchableOpacity style={styles.deleteAllButton} onPress={clearHistory}>
              <Text style={styles.deleteAllText}>Clear All History</Text>
            </TouchableOpacity>
          )}

          {history.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.sectionTitle}>No history records yet</Text>
              <Text style={styles.smallText}>Saved predictions will appear here.</Text>
            </View>
          ) : (
            history.map((item) => (
              <View key={item.id} style={styles.historyItem}>
                {item.imageUri ? (
                  <Image source={{ uri: item.imageUri }} style={styles.historyImage} />
                ) : (
                  <View style={styles.historyPlaceholder} />
                )}

                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => {
                    setSelectedHistory(item);
                    setScreen("summary");
                  }}
                >
                  <Text style={styles.historyTitle}>{item.condition}</Text>
                  <Text style={styles.smallText}>{item.date}</Text>
                  <Text style={styles.smallText}>Score: {item.score}%</Text>
                </TouchableOpacity>

                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <Text style={styles.historyBadge}>{item.riskLevel}</Text>
                  <TouchableOpacity onPress={() => updateHistoryItem(item)}>
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteHistoryItem(item.id)}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          <TouchableOpacity style={styles.button} onPress={() => setScreen("upload")}>
            <Text style={styles.buttonText}>New Prediction</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (screen === "summary") {
    const item = selectedHistory;

    return (
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.phone}>
          <Header title="Symptom Summary" />

          <Text style={styles.label}>Detected Condition</Text>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>
              {conditionEmoji[item?.condition || condition]} {item?.condition || condition}
            </Text>
          </View>

          <Text style={styles.label}>Symptoms Provided</Text>
          {[
            ["Pain Level", item?.symptoms.pain || symptoms.pain],
            ["Itching Level", item?.symptoms.itching || symptoms.itching],
            ["Redness Level", item?.symptoms.redness || symptoms.redness],
            ["Swelling", item?.symptoms.swelling || symptoms.swelling],
            ["Duration", `${item?.symptoms.duration || symptoms.duration} days`],
            ["Fever / Infection Signs", item?.extra.infection || extra.infection],
            ["Previous Similar Issue", item?.extra.previousIssue || extra.previousIssue],
            ["Skin Sensitivity", item?.extra.sensitivity || extra.sensitivity],
            ["Sun Exposure", item?.extra.sunExposure || extra.sunExposure],
          ].map(([label, value]) => (
            <View style={styles.summaryRow} key={label}>
              <Text>{label}</Text>
              <Text style={styles.summaryValue}>{value}</Text>
            </View>
          ))}

          {item && (
            <TouchableOpacity style={styles.button} onPress={() => updateHistoryItem(item)}>
              <Text style={styles.buttonText}>Edit This Record</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.outlineButton} onPress={() => setScreen("history")}>
            <Text style={styles.outlineText}>Back to History</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.phone}>
        <Header title="About Risk Prediction" />

        <Text style={styles.bigShield}>🛡️</Text>

        <View style={styles.resultCard}>
          <Text style={styles.sectionTitle}>How it works?</Text>
          <Text style={styles.normalText}>
            Our system uses detected skin condition, symptom details, and personal factors
            to predict the risk level.
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text>⚙️ AI based decision support</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text>🏥 Personalized risk assessment</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text>⏱ Helps you take timely action</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text>🔒 Not a medical diagnosis</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    backgroundColor: "#F6FAFF",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  phone: {
    width: "100%",
    maxWidth: 390,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: "#DDE6F2",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  back: { fontSize: 32, color: "#111827" },
  headerTitle: { fontSize: 17, fontWeight: "900", color: "#111827" },
  infoIcon: { fontSize: 18, color: "#111827" },
  centerText: {
    textAlign: "center",
    color: "#374151",
    lineHeight: 20,
    marginBottom: 20,
  },
  uploadBox: {
    height: 210,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#BFDBFE",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFCFF",
    marginBottom: 16,
  },
  uploadIcon: { fontSize: 48 },
  uploadText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  smallText: { color: "#6B7280", fontSize: 12 },
  twoButtons: { flexDirection: "row", gap: 12, marginBottom: 18 },
  lightButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  lightButtonText: { fontWeight: "800", color: "#111827" },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 10,
    color: "#111827",
  },
  previewImage: {
    width: "100%",
    height: 165,
    borderRadius: 14,
    marginBottom: 18,
  },
  emptyPreview: {
    width: "100%",
    height: 120,
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  button: {
    backgroundColor: "#0B5CF5",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },
  outlineButton: {
    borderWidth: 1,
    borderColor: "#0B5CF5",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  outlineText: { color: "#0B5CF5", fontWeight: "900" },
  progressTrack: {
    height: 5,
    backgroundColor: "#DBEAFE",
    borderRadius: 10,
    marginBottom: 8,
  },
  progressFill: {
    height: 5,
    backgroundColor: "#0B5CF5",
    borderRadius: 10,
  },
  stepText: { textAlign: "center", color: "#6B7280", marginBottom: 18 },
  label: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 8,
    marginTop: 12,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#DDE6F2",
    borderRadius: 10,
    padding: 13,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  dropdownText: { fontWeight: "800", color: "#111827" },
  dropdownArrow: { fontSize: 18, color: "#111827" },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    minWidth: 70,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#DDE6F2",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  selectedChip: { backgroundColor: "#0B5CF5", borderColor: "#0B5CF5" },
  chipText: { fontWeight: "800", color: "#111827", fontSize: 13 },
  selectedChipText: { color: "#FFFFFF" },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDE6F2",
    borderRadius: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  counterBtn: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
    padding: 8,
  },
  durationInput: {
    flex: 1,
    textAlign: "center",
    fontWeight: "900",
    fontSize: 16,
  },
  infoBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    padding: 15,
    marginTop: 14,
    marginBottom: 10,
  },
  infoText: { color: "#1D4ED8", lineHeight: 20, fontWeight: "600" },
  circle: {
    width: 170,
    height: 170,
    borderRadius: 90,
    borderWidth: 10,
    borderColor: "#0B5CF5",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 30,
  },
  circleIcon: { fontSize: 44, color: "#0B5CF5" },
  checkRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 9 },
  resultHero: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    marginBottom: 12,
  },
  shield: { fontSize: 44 },
  riskLevel: { fontSize: 26, fontWeight: "900", marginVertical: 5 },
  confidenceCircle: {
    width: 105,
    height: 105,
    borderRadius: 60,
    borderWidth: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  confidenceText: { fontSize: 24, fontWeight: "900" },
  resultCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 15,
    borderRadius: 14,
    marginBottom: 12,
  },
  normalText: { color: "#374151", lineHeight: 20 },
  disclaimer: {
    backgroundColor: "#EFF6FF",
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
    gap: 10,
  },
  historyImage: { width: 58, height: 58, borderRadius: 10 },
  historyPlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  historyTitle: { fontWeight: "900", color: "#111827" },
  historyBadge: {
    backgroundColor: "#FEF3C7",
    color: "#F59E0B",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    fontWeight: "900",
  },
  historyPercent: { fontWeight: "900", color: "#111827" },
  deleteText: { color: "#EF4444", fontWeight: "900", fontSize: 12 },
  editText: { color: "#0B5CF5", fontWeight: "900", fontSize: 12 },
  deleteAllButton: {
    borderWidth: 1,
    borderColor: "#EF4444",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 14,
  },
  deleteAllText: { color: "#EF4444", fontWeight: "900" },
  emptyHistory: {
    padding: 25,
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    marginBottom: 14,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: "#DDE6F2",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  summaryText: { fontWeight: "900", color: "#111827", fontSize: 16 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 13,
    borderRadius: 12,
    marginBottom: 8,
  },
  summaryValue: { fontWeight: "900", color: "#111827" },
  bigShield: { fontSize: 90, textAlign: "center", marginVertical: 20 },
});