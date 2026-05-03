import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '../components/AppButton';
import { useThemeContext } from '../context/ThemeContext';
import { analyzeImage, API_BASE_URL } from '../services/analysisService';
import type { ScreenProps } from '../types';

export default function CameraCaptureScreen({ navigation }: ScreenProps<'CameraCapture'>) {
  const { palette } = useThemeContext();
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const takePhoto = async () => {
    if (!cameraRef.current) {
      return;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      setImageUri(photo.uri);
    } catch {
      Alert.alert('Camera Error', 'Unable to capture photo. Please try again.');
    }
  };

  const handleAnalyze = async () => {
    if (!imageUri) {
      Alert.alert('No Image Captured', 'Capture an image before analysis.');
      return;
    }

    setLoading(true);
    try {
      const result = await analyzeImage(imageUri);
      navigation.navigate('Result', { result });
    } catch (error) {
      const message = error instanceof Error ? error.message : `Backend request failed at ${API_BASE_URL}`;
      Alert.alert('Analysis Failed', message);
    } finally {
      setLoading(false);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator color="#FFFFFF" />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.permissionScreen, { backgroundColor: palette.background }]}>
        <View style={[styles.permissionCard, { backgroundColor: palette.card, shadowColor: palette.shadow }]}>
          <Text style={[styles.permissionTitle, { color: palette.text }]}>Camera access required</Text>
          <Text style={[styles.permissionText, { color: palette.secondaryText }]}>
            Please allow camera access so you can capture a live skin image.
          </Text>
          <AppButton label="Grant Permission" onPress={requestPermission} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerIcon}>X</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Capture Image</Text>
        <Text style={styles.headerIcon}>FL</Text>
      </View>

      {imageUri ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
          <View style={styles.previewActions}>
            <AppButton label="Retake" onPress={() => setImageUri(null)} variant="secondary" />
            <AppButton label="Analyze Image" loading={loading} onPress={handleAnalyze} />
          </View>
        </View>
      ) : (
        <>
          <CameraView facing="back" ref={cameraRef} style={styles.cameraView} />
          <View style={styles.bottomBar}>
            <View style={styles.thumbPlaceholder} />
            <TouchableOpacity onPress={takePhoto} style={styles.captureRing}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
            <View style={styles.sideIconWrap}>
              <Text style={styles.sideIconText}>SW</Text>
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#000000',
    flex: 1,
  },
  loadingScreen: {
    alignItems: 'center',
    backgroundColor: '#000000',
    flex: 1,
    justifyContent: 'center',
  },
  permissionScreen: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  permissionCard: {
    borderRadius: 24,
    padding: 22,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 22,
    width: '100%',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  permissionText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
    marginTop: 8,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    minWidth: 24,
    textAlign: 'center',
  },
  cameraView: {
    flex: 1,
  },
  bottomBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 26,
    paddingVertical: 18,
  },
  thumbPlaceholder: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    height: 44,
    width: 44,
  },
  captureRing: {
    alignItems: 'center',
    borderColor: '#FFFFFF',
    borderRadius: 999,
    borderWidth: 4,
    height: 76,
    justifyContent: 'center',
    width: 76,
  },
  captureInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    height: 58,
    width: 58,
  },
  sideIconWrap: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  sideIconText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  previewContainer: {
    flex: 1,
  },
  previewImage: {
    flex: 1,
    width: '100%',
  },
  previewActions: {
    backgroundColor: '#000000',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
});
