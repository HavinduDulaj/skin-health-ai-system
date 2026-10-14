export type KnowledgeDocumentStatus =
  | "Processing"
  | "OCR Processing"
  | "Processed"
  | "Failed";

export type KnowledgeSourceType = "DOCUMENT" | "OCR";

export interface KnowledgeDocument {
  id: string;
  filename: string;
  file_type: string;
  upload_date: string;
  status: KnowledgeDocumentStatus;
  size_bytes: number;
  source_type: KnowledgeSourceType;
  error?: string;
}

export interface KnowledgeEntry {
  id: string;
  document_id: string;
  ingredient: string;
  source_snippet: string;
  possible_benefits: string[];
  possible_warnings: string[];
  conflicts: string[];
  source_type: KnowledgeSourceType;
  created_at: string;
}

export interface KnowledgeSummary {
  document_count: number;
  processed_count: number;
  failed_count: number;
  knowledge_entry_count: number;
  ingredients: string[];
  disclaimer: string;
}

export interface UploadKnowledgeResponse {
  document: KnowledgeDocument;
  extracted_count: number;
  message: string;
}

export interface KnowledgeDocumentDetail {
  document: KnowledgeDocument;
  entries: KnowledgeEntry[];
  entry_count: number;
}
