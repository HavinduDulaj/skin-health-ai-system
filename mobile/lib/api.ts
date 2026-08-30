import { File } from "expo-file-system";
import { API_URL, INGREDIENTS_URL } from "./config";
import type {
  AnalyzeResponse,
  HealthResponse,
  IngredientRecommendation,
} from "./types";

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as { detail?: string }).detail || "Request failed");
  }
  return data as T;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_URL}/api/v1/health`);
  return parseJson(res);
}

export async function analyzeImage(
  uri: string,
  lesion: string,
  _mimeType = "image/jpeg"
): Promise<AnalyzeResponse> {
  const body = new FormData();
  body.append("image", new File(uri));
  body.append("lesion", lesion);
  body.append("explain", "1");

  const res = await fetch(`${API_URL}/api/v1/analyze`, {
    method: "POST",
    body,
  });
  return parseJson(res);
}

export async function fetchLab(): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_URL}/api/v1/lab`);
  return parseJson(res);
}

export async function fetchResearch(): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_URL}/api/v1/research`);
  return parseJson(res);
}

export async function fetchSamples(): Promise<{
  items: Array<{ id: string; lesion: string; risk: string }>;
}> {
  const res = await fetch(`${API_URL}/api/v1/samples`);
  return parseJson(res);
}

export function sampleImageUrl(id: string): string {
  return `${API_URL}/api/v1/samples/${id}`;
}

export async function fetchIngredientRecommendations(
  condition: string,
  riskLevel: string
): Promise<IngredientRecommendation> {
  const params = new URLSearchParams({ condition, risk_level: riskLevel });
  const res = await fetch(`${INGREDIENTS_URL}/api/ingredients?${params}`);
  return parseJson(res);
}

export function pct(value?: number | null): string {
  if (value == null) return "—";
  return `${Math.round(value * 100)}%`;
}
