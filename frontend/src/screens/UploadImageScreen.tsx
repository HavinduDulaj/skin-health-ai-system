import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '../components/AppButton';
import { useThemeContext } from '../context/ThemeContext';
import { analyzeImage, API_BASE_URL } from '../services/analysisService';
import type { ScreenProps } from '../types';

export default function UploadImageScreen({ navigation }: ScreenProps<'UploadImage'>) {
  const { palette } = useThemeContext();
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Needed', 'Please allow photo access to upload a skin image.');
      return;
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
      Alert.alert('No Image Selected', 'Please choose an image before analysis.');
      return;
    }

    setLoading(true);
    try {
      const result = await analyzeImage({
        uri: selectedImage.uri,
        file: (selectedImage as ImagePicker.ImagePickerAsset & { file?: File }).file,
        fileName: selectedImage.fileName,
        mimeType: selectedImage.mimeType,
      });
      navigation.navigate('Result', { result });
    } catch (error) {
      const message = error instanceof Error ? error.message : `Backend request failed at ${API_BASE_URL}`;
      Alert.alert('Analysis Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: palette.text }]}>Upload Image</Text>
        <Text style={[styles.subtitle, { color: palette.secondaryText }]}>Select an image from your gallery</Text>

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
          <Text style={[styles.dropIcon, { color: palette.primary }]}>UP</Text>
          <Text style={[styles.dropText, { color: palette.text }]}>Tap to choose image</Text>
        </TouchableOpacity>

        <Text style={[styles.label, { color: palette.text }]}>Selected Image</Text>
        <View style={[styles.previewWrap, { backgroundColor: palette.card, shadowColor: palette.shadow }]}>
          {selectedImage?.uri ? (
            <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
          ) : (
            <View style={styles.emptyPreview}>
              <Text style={[styles.placeholder, { color: palette.secondaryText }]}>No image selected yet</Text>
            </View>
          )}
        </View>

        <AppButton
          disabled={!selectedImage?.uri}
          label="Analyze Image"
          loading={loading}
          onPress={handleAnalyze}
          style={styles.cta}
        />
        {loading ? <ActivityIndicator color={palette.primary} style={styles.loader} /> : null}
      </ScrollView>
    </SafeAreaView>
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
  title: {
    fontSize: 34,
    fontWeight: '800',
    marginTop: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
  },
  dropZone: {
    alignItems: 'center',
    borderRadius: 22,
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
  dropIcon: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 22,
  },
  previewWrap: {
    borderRadius: 18,
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
  },
  previewImage: {
    height: 182,
    width: '100%',
  },
  cta: {
    marginTop: 28,
  },
  loader: {
    marginTop: 16,
  },
});
