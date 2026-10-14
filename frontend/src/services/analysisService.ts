import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

import type { ClinicalMetadata, DetectedCondition, ScanResult } from '../types';

type UploadableImage =
  | string
  | {
      uri: string;
      file?: File;
      fileName?: string | null;
      mimeType?: string | null;
    };

const MOBILE_LAN_FALLBACK_HOST = '10.119.173.206';
const FALLBACK_HOST = Platform.OS === 'android' ? MOBILE_LAN_FALLBACK_HOST : 'localhost';

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
  const host = hostValue ? hostValue.split(':')[0] : null;

  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return null;
  }

  return host;
}

function getHostFromBrowserLocation() {
  if (Platform.OS !== 'web') {
    return null;
  }

  const location = globalThis.location;
  return location?.hostname || null;
}

const API_HOST =
  getHostFromBrowserLocation() ||
  getHostFromExpoConfig() ||
  getHostFromScriptUrl() ||
  FALLBACK_HOST;
export const API_BASE_URL = `http://${API_HOST}:5000/api`;
const ANALYSIS_TIMEOUT_MS = 180000;

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
  if (
    normalized === 'healthy' ||
    normalized === 'normal' ||
    normalized === 'clear' ||
    normalized === 'good' ||
    normalized === 'no_condition' ||
    normalized === 'no condition'
  ) {
    return 'Healthy';
  }

  throw new Error(`Unsupported prediction class received from backend: ${value}`);
}

function normalizeRiskLevel(value: unknown): ScanResult['riskLevel'] {
  if (value === 'Low' || value === 'Medium' || value === 'High') {
    return value;
  }

  return undefined;
}

export async function analyzeImage(image: UploadableImage, clinicalMetadata?: ClinicalMetadata): Promise<ScanResult> {
  const uri = getUri(image);
  const formData = new FormData();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS);

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

  if (clinicalMetadata) {
    formData.append('clinicalMetadata', JSON.stringify(clinicalMetadata));
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/analysis/upload`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Analysis is taking too long. Please try again with a smaller or clearer image.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error('Backend returned an invalid response. Please restart the backend and try again.');
  }

  const payload = data as {
    message?: unknown;
    condition?: unknown;
    confidence?: unknown;
    reviewRequired?: unknown;
    top_predictions?: unknown;
    riskLevel?: unknown;
    riskScore?: unknown;
    riskConfidence?: unknown;
    suggestedAction?: unknown;
    riskFactors?: unknown;
    riskDecision?: unknown;
    riskQuality?: unknown;
    uncertainty?: unknown;
    confidenceBand?: unknown;
    gradCam?: { image?: unknown; targetLayer?: unknown };
  };

  if (!response.ok) {
    throw new Error(typeof payload.message === 'string' ? payload.message : 'Unable to analyze image.');
  }

  if (typeof payload.condition !== 'string' || typeof payload.confidence !== 'number') {
    throw new Error('Invalid prediction response received from backend.');
  }

  return {
    id: `${Date.now()}`,
    date: new Date().toISOString(),
    condition: normalizeCondition(payload.condition),
    confidence: payload.confidence,
    reviewRequired: Boolean(payload.reviewRequired),
    topPredictions: Array.isArray(payload.top_predictions)
      ? payload.top_predictions
          .filter((item: unknown) => {
            const prediction = item as { condition?: unknown; confidence?: unknown };
            return typeof prediction.condition === 'string' && typeof prediction.confidence === 'number';
          })
          .map((item: { condition: string; confidence: number }) => ({
            condition: item.condition,
            confidence: item.confidence,
          }))
      : undefined,
    riskLevel: normalizeRiskLevel(payload.riskLevel),
    riskScore: typeof payload.riskScore === 'number' ? payload.riskScore : undefined,
    riskConfidence: typeof payload.riskConfidence === 'number' ? payload.riskConfidence : undefined,
    suggestedAction: typeof payload.suggestedAction === 'string' ? payload.suggestedAction : undefined,
    riskFactors: Array.isArray(payload.riskFactors) ? payload.riskFactors.filter((item: unknown) => typeof item === 'string') : undefined,
    riskDecision:
      payload.riskDecision === 'grade' ||
      payload.riskDecision === 'abstain' ||
      payload.riskDecision === 'quality_reject' ||
      payload.riskDecision === 'unavailable'
        ? payload.riskDecision
        : undefined,
    riskQuality:
      payload.riskQuality && typeof payload.riskQuality === 'object'
        ? (payload.riskQuality as ScanResult['riskQuality'])
        : undefined,
    uncertainty: typeof payload.uncertainty === 'number' ? payload.uncertainty : undefined,
    confidenceBand: typeof payload.confidenceBand === 'string' ? payload.confidenceBand : undefined,
    gradCamImage: typeof payload.gradCam?.image === 'string' ? payload.gradCam.image : undefined,
    gradCamLayer: typeof payload.gradCam?.targetLayer === 'string' ? payload.gradCam.targetLayer : undefined,
    imageUri: uri,
    source: 'api',
  };
}
