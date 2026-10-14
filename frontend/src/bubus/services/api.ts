import { requestJson } from './httpClient';

import { RecommendationResult, UserProfile } from "../types/types";

async function postJson<T>(path: string, body: unknown): Promise<T> {
  return requestJson<T>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

}

export async function getRecommendation(
  profile: UserProfile
): Promise<RecommendationResult> {
  return postJson<RecommendationResult>("/recommend", profile);
}

export async function sendChatMessage(
  message: string,
  profile: UserProfile
): Promise<string> {
  const response = await postJson<{ message: string }>("/chat", { message, profile });
  return response.message;
}
