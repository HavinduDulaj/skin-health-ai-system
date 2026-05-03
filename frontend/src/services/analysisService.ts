import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

import type { DetectedCondition, ScanResult } from '../types';

type UploadableImage =
  | string
  | {
      uri: string;
      file?: File;
      fileName?: string | null;
      mimeType?: string | null;
    };

const FALLBACK_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const MANUAL_MOBILE_HOST = '10.42.223.53';

function getHostFromScriptUrl() {
  const scriptUrl = NativeModules.SourceCode?.scriptURL;

  if (!scriptUrl) {
    return null;
  }

  try {
    return new URL(scriptUrl).hostname;
  } catch {
    return null;
  }
}

function getHostFromExpoConfig() {
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.manifest2?.extra?.expoGo?.debuggerHost,
    Constants.manifest?.debuggerHost,
  ];

  const hostValue = candidates.find(Boolean);
  return hostValue ? hostValue.split(':')[0] : null;
}

const API_HOST = MANUAL_MOBILE_HOST || getHostFromExpoConfig() || getHostFromScriptUrl() || FALLBACK_HOST;
export const API_BASE_URL = `http://${API_HOST}:5000/api`;

function getUri(image: UploadableImage) {
  return typeof image === 'string' ? image : image.uri;
}

function getFileName(uri: string) {
  const rawName = uri.split('/').pop();

  if (!rawName) {
    return `skin-image-${Date.now()}.jpg`;
  }

  if (/\.(jpg|jpeg|png|webp|heic)$/i.test(rawName)) {
    return rawName;
  }

  return `${rawName}.jpg`;
}

function getMimeType(uri: string) {
  const extension = uri.split('.').pop()?.toLowerCase();

  if (extension === 'png') {
    return 'image/png';
  }

  if (extension === 'webp') {
    return 'image/webp';
  }

  if (extension === 'heic') {
    return 'image/heic';
  }

  return 'image/jpeg';
}

async function createWebFile(image: UploadableImage) {
  if (typeof image !== 'string' && image.file instanceof File) {
    return image.file;
  }

  const uri = getUri(image);
  const response = await fetch(uri);
  const blob = await response.blob();
  return new File([blob], getFileName(uri), { type: blob.type || getMimeType(uri) });
}

function normalizeCondition(value: string): DetectedCondition {
  const normalized = value.trim().toLowerCase();

  if (normalized === 'acne') return 'Acne';
  if (normalized === 'burns' || normalized === 'burn') return 'Burns';
  if (normalized === 'rashes' || normalized === 'rash') return 'Rashes';
  if (normalized === 'warts' || normalized === 'wart') return 'Warts';

  return 'Acne';
}

export async function analyzeImage(image: UploadableImage): Promise<ScanResult> {
  const uri = getUri(image);
  const formData = new FormData();

  if (Platform.OS === 'web') {
    const file = await createWebFile(image);
    formData.append('image', file);
  } else {
    formData.append('image', {
      uri,
      name: typeof image === 'string' ? getFileName(uri) : image.fileName || getFileName(uri),
      type: typeof image === 'string' ? getMimeType(uri) : image.mimeType || getMimeType(uri),
    } as never);
  }

  const response = await fetch(`${API_BASE_URL}/analysis/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || 'Unable to analyze image.');
  }

  if (!data?.condition || typeof data?.confidence !== 'number') {
    throw new Error('Invalid prediction response received from backend.');
  }

  return {
    id: `${Date.now()}`,
    date: new Date().toISOString(),
    condition: normalizeCondition(data.condition),
    confidence: data.confidence,
    imageUri: uri,
    source: 'api',
  };
}
