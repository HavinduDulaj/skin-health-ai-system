import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '../components/AppButton';
import AppInput from '../components/AppInput';
import { AppIcon, ProgressBar, ScreenHeader, StatusPill, StepIndicator } from '../components/DesignSystem';
import { useAuth } from '../context/AuthContext';
import { useThemeContext } from '../context/ThemeContext';
import { analyzeImage, API_BASE_URL } from '../services/analysisService';
import type { ClinicalMetadata } from '../types';
import type { ScreenProps } from '../types';

const LEVELS = [0, 2, 5, 8, 10];
const BODY_LOCATIONS = ['Face', 'Arm', 'Leg', 'Torso', 'Hand'];

export default function UploadImageScreen({ navigation }: ScreenProps<'UploadImage'>) {
  const { palette } = useThemeContext();
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [clinicalMetadata, setClinicalMetadata] = useState<ClinicalMetadata>({
    durationDays: '',
    painLevel: 0,
    itchingLevel: 0,
    bleeding: false,
    spreading: false,
    fever: false,
    discharge: false,
    bodyLocation: 'Face',
    skinType: user?.profile?.skinType,
  });

  const updateMetadata = <K extends keyof ClinicalMetadata>(key: K, value: ClinicalMetadata[K]) => {
    setClinicalMetadata((current) => ({ ...current, [key]: value }));
  };

  const pickImage = async () => {
    setAnalysisError('');
    // Browsers use their native file chooser and do not require Expo's mobile
    // media-library permission. Awaiting that permission on web can consume the
    // user click and cause the chooser to be blocked.
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Needed', 'Please allow photo access to upload a skin image.');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      mediaTypes: ['images'],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage?.uri) {
      const message = 'Please choose an image before analysis.';
      setAnalysisError(message);
      Alert.alert('No Image Selected', message);
      return;
    }

    setLoading(true);
    setAnalysisError('');
    try {
      const result = await analyzeImage(
        {
          uri: selectedImage.uri,
          file: (selectedImage as ImagePicker.ImagePickerAsset & { file?: File }).file,
          fileName: selectedImage.fileName,
          mimeType: selectedImage.mimeType,
        },
        clinicalMetadata
      );
      navigation.navigate('Result', { result });
    } catch (error) {
      const message = error instanceof Error ? error.message : `Backend request failed at ${API_BASE_URL}`;
      setAnalysisError(message);
      Alert.alert('Analysis Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Upload Image" subtitle="Upload a clear photo of the skin area" />
        <StepIndicator steps={['Capture', 'Review', 'Analyze']} activeIndex={selectedImage?.uri ? 1 : 0} />

        <TouchableOpacity
          onPress={pickImage}
          style={[
            styles.dropZone,
            {
              backgroundColor: palette.card,
              borderColor: palette.primarySoft,
            },
          ]}
        >
          <AppIcon name="cloud-upload-outline" size={34} color={palette.primary} />
          <Text style={[styles.dropText, { color: palette.text }]}>Tap to choose image</Text>
          <Text style={[styles.dropHint, { color: palette.secondaryText }]}>JPG or PNG. Use good lighting and keep the area centered.</Text>
        </TouchableOpacity>

        <View style={styles.sectionRow}>
          <Text style={[styles.label, { color: palette.text }]}>Selected Image</Text>
          {selectedImage?.uri ? <StatusPill label="Ready" tone="green" icon="checkmark-circle-outline" /> : null}
        </View>
        <View style={[styles.previewWrap, { backgroundColor: palette.card, shadowColor: palette.shadow }]}>
          {selectedImage?.uri ? (
            <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
          ) : (
            <View style={styles.emptyPreview}>
              <AppIcon name="image-outline" size={32} color={palette.muted} />
              <Text style={[styles.placeholder, { color: palette.secondaryText }]}>No image selected yet</Text>
            </View>
          )}
        </View>

        <View style={[styles.tipBox, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.tipHead}>
            <AppIcon name="shield-checkmark-outline" size={18} color={palette.success} />
            <Text style={[styles.tipTitle, { color: palette.text }]}>Image Quality Checklist</Text>
          </View>
          <QualityCheck label="Good lighting" ready={Boolean(selectedImage?.uri)} />
          <QualityCheck label="Area in focus" ready={Boolean(selectedImage?.uri)} />
          <QualityCheck label="Single affected area visible" ready={Boolean(selectedImage?.uri)} />
          <QualityCheck label="No filters or blur" ready={Boolean(selectedImage?.uri)} />
          <ProgressBar value={selectedImage?.uri ? 100 : 35} color={palette.teal} />
        </View>

        <View style={[styles.clinicalBox, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.clinicalHead}>
            <View>
              <Text style={[styles.clinicalTitle, { color: palette.text }]}>Symptom Details</Text>
              <Text style={[styles.clinicalSubtitle, { color: palette.secondaryText }]}>Used by the risk model</Text>
            </View>
            <StatusPill label="Multimodal" tone="blue" icon="analytics-outline" />
          </View>

          <AppInput
            icon="calendar-outline"
            keyboardType="numeric"
            label="Duration in days"
            onChangeText={(value) => updateMetadata('durationDays', value.replace(/[^0-9]/g, ''))}
            placeholder="Example: 7"
            value={clinicalMetadata.durationDays}
          />

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: palette.secondaryText }]}>Body location</Text>
            <View style={styles.choiceGrid}>
              {BODY_LOCATIONS.map((location) => {
                const selected = clinicalMetadata.bodyLocation === location;
                return (
                  <TouchableOpacity
                    key={location}
                    onPress={() => updateMetadata('bodyLocation', location)}
                    style={[
                      styles.choiceChip,
                      {
                        backgroundColor: selected ? palette.primary : palette.surface,
                        borderColor: selected ? palette.primary : palette.border,
                      },
                    ]}
                  >
                    <Text style={[styles.choiceText, { color: selected ? palette.buttonText : palette.text }]}>{location}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <SeveritySelector label="Pain level" palette={palette} value={clinicalMetadata.painLevel} onChange={(value) => updateMetadata('painLevel', value)} />
          <SeveritySelector label="Itching level" palette={palette} value={clinicalMetadata.itchingLevel} onChange={(value) => updateMetadata('itchingLevel', value)} />

          <View style={styles.flagGrid}>
            <FlagButton label="Bleeding" selected={clinicalMetadata.bleeding} onPress={() => updateMetadata('bleeding', !clinicalMetadata.bleeding)} palette={palette} />
            <FlagButton label="Spreading" selected={clinicalMetadata.spreading} onPress={() => updateMetadata('spreading', !clinicalMetadata.spreading)} palette={palette} />
            <FlagButton label="Fever" selected={clinicalMetadata.fever} onPress={() => updateMetadata('fever', !clinicalMetadata.fever)} palette={palette} />
            <FlagButton label="Discharge" selected={clinicalMetadata.discharge} onPress={() => updateMetadata('discharge', !clinicalMetadata.discharge)} palette={palette} />
          </View>
        </View>

        <AppButton
          icon="sparkles-outline"
          label="Analyze Image"
          loading={loading}
          onPress={handleAnalyze}
          style={styles.cta}
        />
        {analysisError ? (
          <View style={[styles.errorCard, { backgroundColor: palette.surface, borderColor: palette.danger }]}>
            <AppIcon name="alert-circle-outline" size={20} color={palette.danger} />
            <View style={styles.errorCopy}>
              <Text style={[styles.errorTitle, { color: palette.danger }]}>Image could not be analyzed</Text>
              <Text style={[styles.errorText, { color: palette.secondaryText }]}>{analysisError}</Text>
            </View>
          </View>
        ) : null}
        {loading ? <ActivityIndicator color={palette.primary} style={styles.loader} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function SeveritySelector({
  label,
  value,
  onChange,
  palette,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  palette: ReturnType<typeof useThemeContext>['palette'];
}) {
  return (
    <View style={styles.fieldGroup}>
      <View style={styles.scaleHead}>
        <Text style={[styles.fieldLabel, { color: palette.secondaryText }]}>{label}</Text>
        <Text style={[styles.scaleValue, { color: palette.text }]}>{value}/10</Text>
      </View>
      <View style={styles.levelRow}>
        {LEVELS.map((level) => {
          const selected = value === level;
          return (
            <TouchableOpacity
              key={`${label}-${level}`}
              onPress={() => onChange(level)}
              style={[
                styles.levelButton,
                {
                  backgroundColor: selected ? palette.primary : palette.surface,
                  borderColor: selected ? palette.primary : palette.border,
                },
              ]}
            >
              <Text style={[styles.levelText, { color: selected ? palette.buttonText : palette.text }]}>{level}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function QualityCheck({ label, ready }: { label: string; ready: boolean }) {
  const { palette } = useThemeContext();

  return (
    <View style={styles.qualityRow}>
      <AppIcon
        name={ready ? 'checkmark-circle-outline' : 'ellipse-outline'}
        size={17}
        color={ready ? palette.success : palette.muted}
      />
      <Text style={[styles.qualityText, { color: palette.secondaryText }]}>{label}</Text>
    </View>
  );
}

function FlagButton({
  label,
  selected,
  onPress,
  palette,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  palette: ReturnType<typeof useThemeContext>['palette'];
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.flagButton,
        {
          backgroundColor: selected ? palette.dangerSoft : palette.surface,
          borderColor: selected ? palette.danger : palette.border,
        },
      ]}
    >
      <AppIcon name={selected ? 'alert-circle-outline' : 'ellipse-outline'} size={17} color={selected ? palette.danger : palette.muted} />
      <Text style={[styles.flagText, { color: selected ? palette.danger : palette.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  dropZone: {
    alignItems: 'center',
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    marginTop: 28,
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  dropText: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
  },
  dropHint: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: 'center',
  },
  sectionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
  previewWrap: {
    borderRadius: 8,
    marginTop: 10,
    minHeight: 182,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 22,
  },
  emptyPreview: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 182,
    padding: 24,
  },
  placeholder: {
    fontSize: 14,
    marginTop: 8,
  },
  previewImage: {
    height: 182,
    width: '100%',
  },
  cta: {
    marginTop: 28,
  },
  tipBox: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    marginTop: 16,
    padding: 14,
  },
  clinicalBox: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 16,
    marginTop: 16,
    padding: 16,
  },
  clinicalHead: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  clinicalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  clinicalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  choiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceChip: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  choiceText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scaleHead: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  levelRow: {
    flexDirection: 'row',
    gap: 8,
  },
  levelButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
  },
  levelText: {
    fontSize: 13,
    fontWeight: '800',
  },
  flagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  flagButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    minHeight: 40,
    paddingHorizontal: 10,
  },
  flagText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tipHead: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  tipText: {
    fontSize: 13,
    lineHeight: 19,
  },
  qualityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  qualityText: {
    fontSize: 13,
    fontWeight: '700',
  },
  loader: {
    marginTop: 16,
  },
  errorCard: {
    alignItems: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    padding: 14,
  },
  errorCopy: {
    flex: 1,
    gap: 4,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  errorText: {
    fontSize: 13,
    lineHeight: 19,
  },
});
