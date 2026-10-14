import { INGREDIENT_API_URL, requestJson as sharedRequest } from './httpClient';
import { Platform } from "react-native";

import {
  KnowledgeDocumentDetail,
  KnowledgeDocument,
  KnowledgeSummary,
  UploadKnowledgeResponse,
} from "../types/knowledgeBaseTypes";

const API_BASE_URL = `${INGREDIENT_API_URL}/api/knowledge-base`;

type UploadFile = {
  uri: string;
  name: string;
  mimeType?: string;
  file?: File;
};

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  return sharedRequest<T>(`/api/knowledge-base${path}`, options);
}

export async function getKnowledgeDocuments(): Promise<KnowledgeDocument[]> {
  return requestJson<KnowledgeDocument[]>("/documents");
}

export async function getKnowledgeDocumentDetail(
  id: string
): Promise<KnowledgeDocumentDetail> {
  return requestJson<KnowledgeDocumentDetail>(`/documents/${id}`);
}

export async function getKnowledgeSummary(): Promise<KnowledgeSummary> {
  return requestJson<KnowledgeSummary>("/summary");
}

export async function uploadKnowledgeFile(
  file: UploadFile
): Promise<UploadKnowledgeResponse> {
  const formData = new FormData();

  if (Platform.OS === "web") {
    if (file.file) {
      formData.append("file", file.file, file.name);
    } else {
      const response = await fetch(file.uri);
      const blob = await response.blob();
      formData.append("file", blob, file.name);
    }
  } else {
    formData.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || "application/octet-stream",
    } as unknown as Blob);
  }

  return requestJson<UploadKnowledgeResponse>("/upload", {
    method: "POST",
    body: formData,
  });
}

export async function deleteKnowledgeDocument(id: string): Promise<void> {
  await requestJson<{ message: string }>(`/documents/${id}`, {
    method: "DELETE",
  });
}

export async function syncKnowledgeBase(): Promise<KnowledgeSummary> {
  return requestJson<KnowledgeSummary>("/reprocess", {
    method: "POST",
  });
}

export async function clearKnowledgeBase(): Promise<KnowledgeSummary> {
  return requestJson<KnowledgeSummary>("/clear", {
    method: "POST",
  });
}

export function getKnowledgeExportUrl(): string {
  return `${API_BASE_URL}/export`;
}
