import { Platform } from "react-native";

import { generateRecommendations } from "./recommendationEngine";
import { generateRebekaReply } from "./rebekaEngine";
import { getUserProfile } from "./profileService";
import { RecommendationResult, UserProfile } from "../types/types";

const API_BASE_URL =
  Platform.OS === "web" ? "http://127.0.0.1:8001" : "http://127.0.0.1:8001";

export const defaultProfile: UserProfile = getUserProfile();

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "API request failed");
  }

  return response.json() as Promise<T>;
}

export async function getRecommendation(
  profile: UserProfile = getUserProfile()
): Promise<RecommendationResult> {
  try {
    return await postJson<RecommendationResult>("/recommend", profile);
  } catch {
    return generateRecommendations(profile);
  }
}

export async function sendChatMessage(
  message: string,
  profile: UserProfile = getUserProfile()
): Promise<string> {
  try {
    const response = await postJson<{ message: string }>("/chat", {
      message,
      profile,
    });
    return response.message;
  } catch {
    return generateRebekaReply(message, profile);
  }
}
