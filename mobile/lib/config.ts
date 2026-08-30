import Constants from "expo-constants";
import { Platform } from "react-native";

function expoHost(): string | undefined {
  return Constants.expoConfig?.hostUri?.split(":")[0];
}

function isLocalhostUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "127.0.0.1" || host === "localhost";
  } catch {
    return false;
  }
}

/** Prefer Expo dev-server host on physical devices; localhost .env breaks phones. */
function resolveServiceUrl(envUrl: string | undefined, port: number): string {
  const host = expoHost();
  if (host && host !== "localhost" && host !== "127.0.0.1") {
    if (!envUrl || isLocalhostUrl(envUrl)) {
      return `http://${host}:${port}`;
    }
  }
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }
  if (Platform.OS === "android") {
    return `http://10.0.2.2:${port}`;
  }
  return `http://127.0.0.1:${port}`;
}

/** Python screening API (FastAPI). Override with EXPO_PUBLIC_API_URL in .env */
function defaultApiUrl(): string {
  const envUrl = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  return resolveServiceUrl(envUrl, 8000);
}

/** Node.js ingredient knowledge-base API */
function defaultIngredientsUrl(): string {
  const envUrl = Constants.expoConfig?.extra?.ingredientsUrl as string | undefined;
  return resolveServiceUrl(envUrl, 3001);
}

export const API_URL = defaultApiUrl();
export const INGREDIENTS_URL = defaultIngredientsUrl();
export const APP_NAME = "DermaSafe AI";
export const PROJECT_CODE = "R26-IT-058";

export const LESIONS = ["acne", "burns", "rash", "warts"] as const;
export type Lesion = (typeof LESIONS)[number];

export const DECISION_LABEL: Record<string, string> = {
  grade: "Grade issued",
  abstain: "Model abstains",
  quality_reject: "Quality reject",
  unavailable: "Head not loaded",
};

export { expoHost };
