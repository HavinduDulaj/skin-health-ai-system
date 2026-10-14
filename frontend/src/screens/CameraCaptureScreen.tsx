import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppButton from '../components/AppButton';
import { AppIcon } from '../components/DesignSystem';
import { useThemeContext } from '../context/ThemeContext';
import { analyzeImage, API_BASE_URL } from '../services/analysisService';
import type { ScreenProps } from '../types';

export default function CameraCaptureScreen({ navigation }: ScreenProps<'CameraCapture'>) {
  const { palette } = useThemeContext();
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Dashboard');
  };

  const takePhoto = async () => {
    if (!cameraRef.current) {
      return;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.72,
        skipProcessing: false,
      });
      setAnalysisError('');
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
    setAnalysisError('');
    try {
      const result = await analyzeImage({
        uri: imageUri,
        fileName: `camera-scan-${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
      });
      navigation.navigate('Result', { result });
    } catch (error) {
      const message = error instanceof Error ? error.message : `Backend request failed at ${API_BASE_URL}`;
      setAnalysisError(message);
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
        <View style={[styles.permissionCard, { backgroundColor: palette.card, borderColor: palette.border, shadowColor: palette.shadow }]}>
          <View style={[styles.permissionIcon, { backgroundColor: palette.surface }]}>
            <AppIcon name="camera-outline" size={28} color={palette.primary} />
          </View>
          <Text style={[styles.permissionTitle, { color: palette.text }]}>Camera access required</Text>
          <Text style={[styles.permissionText, { color: palette.secondaryText }]}>
            Please allow camera access so you can capture a live skin image.
          </Text>
          <AppButton icon="camera-outline" label="Grant Permission" onPress={requestPermission} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityLabel="Back" onPress={handleBack}>
          <AppIcon name="close-outline" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Capture Image</Text>
        <AppIcon name="flash-outline" size={22} color="#FFFFFF" />
      </View>

      {imageUri ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
          <View style={styles.previewActions}>
            {analysisError ? (
              <View style={styles.errorCard}>
                <AppIcon name="alert-circle-outline" size={21} color="#FCA5A5" />
                <View style={styles.errorCopy}>
                  <Text style={styles.errorTitle}>Image could not be analyzed</Text>
                  <Text style={styles.errorText}>{analysisError}</Text>
                </View>
              </View>
            ) : null}
            <AppButton
              icon="refresh-outline"
              label="Retake"
              onPress={() => {
                setAnalysisError('');
                setImageUri(null);
              }}
              variant="secondary"
            />
            <AppButton icon="sparkles-outline" label="Analyze Image" loading={loading} onPress={handleAnalyze} />
          </View>
        </View>
      ) : (
        <>
          <CameraView facing="back" ref={cameraRef} style={styles.cameraView} />
          <View pointerEvents="none" style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
            <Text style={styles.scanInstruction}>Position the skin area inside the frame</Text>
          </View>
          <View style={styles.bottomBar}>
            <View style={styles.thumbPlaceholder}>
              <AppIcon name="image-outline" size={21} color="#FFFFFF" />
            </View>
            <TouchableOpacity onPress={takePhoto} style={styles.captureRing}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
            <View style={styles.sideIconWrap}>
              <AppIcon name="sync-outline" size={22} color="#FFFFFF" />
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
    borderColor: '#DDE8F0',
    borderRadius: 8,
    borderWidth: 1,
    padding: 22,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 22,
    width: '100%',
  },
  permissionIcon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 58,
    justifyContent: 'center',
    marginBottom: 16,
    width: 58,
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
  cameraView: {
    flex: 1,
  },
  scanFrame: {
    alignItems: 'center',
    bottom: 112,
    justifyContent: 'center',
    left: 36,
    position: 'absolute',
    right: 36,
    top: 96,
  },
  corner: {
    borderColor: '#FFFFFF',
    height: 42,
    position: 'absolute',
    width: 42,
  },
  cornerTopLeft: {
    borderLeftWidth: 3,
    borderTopWidth: 3,
    left: 0,
    top: 0,
  },
  cornerTopRight: {
    borderRightWidth: 3,
    borderTopWidth: 3,
    right: 0,
    top: 0,
  },
  cornerBottomLeft: {
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    bottom: 0,
    left: 0,
  },
  cornerBottomRight: {
    borderBottomWidth: 3,
    borderRightWidth: 3,
    bottom: 0,
    right: 0,
  },
  scanInstruction: {
    bottom: 26,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    position: 'absolute',
    textAlign: 'center',
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
    borderRadius: 8,
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
  errorCard: {
    alignItems: 'flex-start',
    backgroundColor: '#451A1A',
    borderColor: '#EF4444',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 13,
  },
  errorCopy: {
    flex: 1,
    gap: 3,
  },
  errorTitle: {
    color: '#FCA5A5',
    fontSize: 14,
    fontWeight: '800',
  },
  errorText: {
    color: '#F3F4F6',
    fontSize: 13,
    lineHeight: 18,
  },
});
