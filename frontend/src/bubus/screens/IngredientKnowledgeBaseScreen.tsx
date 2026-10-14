import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  clearKnowledgeBase,
  deleteKnowledgeDocument,
  getKnowledgeDocumentDetail,
  getKnowledgeDocuments,
  getKnowledgeExportUrl,
  syncKnowledgeBase,
  uploadKnowledgeFile,
} from "../services/knowledgeBaseApi";
import {
  KnowledgeDocument,
  KnowledgeDocumentDetail,
} from "../types/knowledgeBaseTypes";
import { RootStackParamList } from "../types/types";

type Props = NativeStackScreenProps<RootStackParamList, "IngredientKnowledgeBase">;

const supportedTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/jpeg",
  "image/png",
];

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatSize(bytes: number): string {
  if (!bytes) {
    return "0 MB";
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusStyle(status: KnowledgeDocument["status"]) {
  if (status === "Processed") {
    return [styles.badge, styles.badgeSuccess];
  }
  if (status === "Failed") {
    return [styles.badge, styles.badgeDanger];
  }
  return [styles.badge, styles.badgePending];
}

export default function IngredientKnowledgeBaseScreen({ navigation }: Props) {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<KnowledgeDocumentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadDocuments = useCallback(async () => {
    try {
      setError("");
      const data = await getKnowledgeDocuments();
      setDocuments(data);
    } catch {
      setError("Unable to load uploaded documents. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  async function uploadFile(file: {
    uri: string;
    name: string;
    mimeType?: string;
    file?: File;
  }) {
    try {
      setBusy("Uploading and extracting knowledge...");
      setError("");
      const uploaded = await uploadKnowledgeFile(file);
      await loadDocuments();
      if (uploaded.document.status === 'Failed') setError(uploaded.document.error || uploaded.message);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Upload failed. Please try another file."
      );
    } finally {
      setBusy("");
    }
  }

  async function handleChooseFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: supportedTypes,
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    await uploadFile({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType,
      file: asset.file,
    });
  }

  async function handleScanImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Image library permission is needed to upload ingredient images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    await uploadFile({
      uri: asset.uri,
      name: asset.fileName || `ingredient-image-${Date.now()}.jpg`,
      mimeType: asset.mimeType || "image/jpeg",
      file: asset.file,
    });
  }

  async function handleDelete(documentId: string) {
    try {
      setBusy("Deleting document...");
      await deleteKnowledgeDocument(documentId);
      if (detail?.document.id === documentId) {
        setDetail(null);
      }
      await loadDocuments();
    } catch {
      setError("Could not delete this document.");
    } finally {
      setBusy("");
    }
  }

  async function handleView(documentId: string) {
    try {
      setDetailLoading(true);
      setError("");
      const data = await getKnowledgeDocumentDetail(documentId);
      setDetail(data);
    } catch {
      setError("Could not open this document detail.");
    } finally {
      setDetailLoading(false);
    }
  }

  function confirmDelete(documentId: string) {
    if (busy) return;
    if (Platform.OS === 'web') {
      if (globalThis.confirm('Delete this document and its extracted knowledge?')) void handleDelete(documentId);
      return;
    }
    Alert.alert(
      "Delete Document",
      "Delete this file and remove its extracted knowledge from Rebeka?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => handleDelete(documentId) },
      ]
    );
  }

  async function handleSync() {
    try {
      setBusy("Reprocessing uploaded documents...");
      await syncKnowledgeBase();
      await loadDocuments();
    } catch {
      setError("Could not sync the knowledge base.");
    } finally {
      setBusy("");
    }
  }

  async function handleClear() {
    try {
      setBusy("Clearing knowledge base...");
      await clearKnowledgeBase();
      await loadDocuments();
    } catch {
      setError("Could not clear the knowledge base.");
    } finally {
      setBusy("");
    }
  }

  function confirmClear() {
    if (busy) return;
    if (Platform.OS === 'web') {
      if (globalThis.confirm('Remove all uploaded documents and extracted knowledge?')) void handleClear();
      return;
    }
    Alert.alert(
      "Clear Knowledge Base",
      "Remove all uploaded documents and extracted knowledge?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: handleClear },
      ]
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.phone}>
        <View style={styles.header}>
          <Pressable style={styles.roundButton} onPress={() => navigation.goBack()}>
            <Text style={styles.back}>{"<"}</Text>
          </Pressable>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Ingredient Knowledge Base</Text>
            <Text style={styles.subtitle}>
              Upload research papers, ingredient articles, scanned documents or
              images to improve Rebeka's ingredient knowledge.
            </Text>
          </View>
          <Pressable
            style={styles.helpButton}
            onPress={() =>
              Alert.alert(
                "Knowledge Base",
                "Upload PDFs, DOCX, TXT, JPG, or PNG files. OCR is used for images and scanned PDFs. This is general skincare guidance and not a medical diagnosis."
              )
            }
          >
            <Text style={styles.helpText}>?</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Text style={styles.cardIconText}>UP</Text>
            </View>
            <View style={styles.cardTitleBlock}>
              <Text style={styles.cardTitle}>Upload New Knowledge</Text>
              <Text style={styles.cardSubtitle}>
                Upload PDFs, DOCX, TXT, scanned documents or ingredient images.
              </Text>
            </View>
          </View>

          <View style={styles.uploadBox}>
            <Text style={styles.uploadIcon}>Cloud</Text>
            <Text style={styles.uploadTitle}>Add ingredient reference material</Text>
            <Text style={styles.uploadMeta}>PDF, DOCX, TXT, JPG, PNG - Max size 25MB</Text>
          </View>

          <View style={styles.uploadActions}>
            <Pressable
              style={[styles.actionButton, styles.primaryAction]}
              onPress={handleChooseFile}
              disabled={Boolean(busy)}
            >
              <Text style={styles.primaryActionText}>Choose File</Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, styles.secondaryAction]}
              onPress={handleScanImage}
              disabled={Boolean(busy)}
            >
              <Text style={styles.secondaryActionText}>Scan Image</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.listHeader}>
            <View style={styles.cardHeaderCompact}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>DOC</Text>
              </View>
              <Text style={styles.cardTitle}>Uploaded Documents</Text>
            </View>
            <View style={styles.countPill}>
              <Text style={styles.countText}>{documents.length} Documents</Text>
            </View>
          </View>

          {loading ? <ActivityIndicator color="#6D3FDB" style={styles.loader} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {busy ? <Text style={styles.busy}>{busy}</Text> : null}

          {!loading && documents.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No documents uploaded yet</Text>
              <Text style={styles.emptyText}>
                Add a research paper, ingredient article, scanned page, or label image.
              </Text>
            </View>
          ) : null}

          {documents.map((item) => (
            <View key={item.id} style={styles.documentRow}>
              <View style={styles.fileIcon}>
                <Text style={styles.fileIconText}>{item.file_type.toUpperCase()}</Text>
              </View>
              <View style={styles.fileDetails}>
                <Text style={styles.fileName} numberOfLines={2}>
                  {item.filename}
                </Text>
                <Text style={styles.fileMeta}>
                  {item.file_type.toUpperCase()} - {formatSize(item.size_bytes)} -{" "}
                  {formatDate(item.upload_date)}
                </Text>
              </View>
              <View style={statusStyle(item.status)}>
                <Text style={styles.badgeText}>{item.status}</Text>
              </View>
              <Pressable
                style={styles.smallButton}
                onPress={() => handleView(item.id)}
              >
                <Text style={styles.smallButtonText}>View</Text>
              </Pressable>
              <Pressable
                style={[styles.smallButton, styles.deleteButton]}
                onPress={() => confirmDelete(item.id)}
              >
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderCompact}>
            <View style={styles.cardIcon}>
              <Text style={styles.cardIconText}>KB</Text>
            </View>
            <Text style={styles.cardTitle}>Knowledge Base Actions</Text>
          </View>

          <Pressable style={styles.actionRow} onPress={handleSync}>
            <View style={styles.actionCircle}>
              <Text style={styles.actionCircleText}>Sync</Text>
            </View>
            <View style={styles.actionTextBlock}>
              <Text style={styles.actionTitle}>Sync Knowledge Base</Text>
              <Text style={styles.actionSubtitle}>
                Reprocess all documents to update knowledge.
              </Text>
            </View>
            <Text style={styles.chevron}>{">"}</Text>
          </Pressable>

          <Pressable
            style={styles.actionRow}
            onPress={() => Linking.openURL(getKnowledgeExportUrl())}
          >
            <View style={styles.actionCircle}>
              <Text style={styles.actionCircleText}>JSON</Text>
            </View>
            <View style={styles.actionTextBlock}>
              <Text style={styles.actionTitle}>Export Knowledge Base</Text>
              <Text style={styles.actionSubtitle}>
                Export all extracted knowledge as a JSON file.
              </Text>
            </View>
            <Text style={styles.chevron}>{">"}</Text>
          </Pressable>

          <Pressable style={[styles.actionRow, styles.lastActionRow]} onPress={confirmClear}>
            <View style={[styles.actionCircle, styles.dangerCircle]}>
              <Text style={styles.actionCircleText}>Del</Text>
            </View>
            <View style={styles.actionTextBlock}>
              <Text style={styles.actionTitle}>Clear Knowledge Base</Text>
              <Text style={styles.actionSubtitle}>
                Remove all documents and extracted knowledge.
              </Text>
            </View>
            <Text style={styles.chevron}>{">"}</Text>
          </Pressable>
        </View>

        <View style={styles.footerNote}>
          <Text style={styles.footerIcon}>i</Text>
          <Text style={styles.footerText}>
            Rebeka uses this knowledge base to provide research-backed ingredient
            guidance. This is general skincare guidance and not a medical diagnosis.
          </Text>
        </View>

        <Modal visible={Boolean(detail)} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.detailPanel}>
              <View style={styles.detailHeader}>
                <View style={styles.detailTitleBlock}>
                  <Text style={styles.detailTitle} numberOfLines={2}>
                    {detail?.document.filename}
                  </Text>
                  <Text style={styles.detailMeta}>
                    {detail?.entry_count ?? 0} extracted knowledge entries
                  </Text>
                </View>
                <Pressable style={styles.closeButton} onPress={() => setDetail(null)}>
                  <Text style={styles.closeButtonText}>X</Text>
                </Pressable>
              </View>

              {detailLoading ? (
                <ActivityIndicator color="#6D3FDB" style={styles.loader} />
              ) : null}

              <ScrollView style={styles.detailList}>
                {detail?.entries.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>No extracted entries</Text>
                    <Text style={styles.emptyText}>
                      Try syncing the knowledge base or uploading a clearer file.
                    </Text>
                  </View>
                ) : null}

                {detail?.entries.map((entry) => (
                  <View key={entry.id} style={styles.entryCard}>
                    <Text style={styles.entryIngredient}>{entry.ingredient}</Text>
                    <Text style={styles.entrySnippet}>{entry.source_snippet}</Text>
                    <View style={styles.entryTags}>
                      {entry.possible_benefits.slice(0, 3).map((tag) => (
                        <Text key={`benefit-${entry.id}-${tag}`} style={styles.benefitTag}>
                          {tag}
                        </Text>
                      ))}
                      {entry.possible_warnings.slice(0, 3).map((tag) => (
                        <Text key={`warning-${entry.id}-${tag}`} style={styles.warningTag}>
                          {tag}
                        </Text>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F6FAFC",
  },
  content: {
    width: '100%',
    maxWidth: 1040,
    alignSelf: 'center',
    padding: 18,
  },
  phone: {
    width: "100%",
    paddingBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 16,
  },
  roundButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE8F0",
    borderWidth: 1,
  },
  back: {
    color: "#102033",
    fontSize: 22,
    fontWeight: "900",
  },
  titleBlock: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    color: "#102033",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    color: "#526376",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 5,
  },
  helpButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderColor: "#DDE8F0",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  helpText: {
    color: "#4A5378",
    fontSize: 19,
    fontWeight: "900",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2DDF4",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#4F2DBA",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  cardHeaderCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0E9FF",
  },
  cardIconText: {
    color: "#6D3FDB",
    fontSize: 10,
    fontWeight: "900",
  },
  cardTitleBlock: {
    flex: 1,
  },
  cardTitle: {
    color: "#080D3D",
    fontSize: 18,
    fontWeight: "900",
  },
  cardSubtitle: {
    color: "#465173",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  uploadBox: {
    borderColor: "#A47BEF",
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    minHeight: 138,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  uploadIcon: {
    color: "#6D3FDB",
    fontSize: 28,
    fontWeight: "900",
  },
  uploadTitle: {
    color: "#080D3D",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 8,
    textAlign: "center",
  },
  uploadMeta: {
    color: "#596280",
    fontSize: 12,
    marginTop: 5,
    textAlign: "center",
  },
  uploadActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryAction: {
    backgroundColor: "#5E2ED8",
  },
  secondaryAction: {
    backgroundColor: "#F4F0FF",
    borderColor: "#CCBDF5",
    borderWidth: 1,
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  secondaryActionText: {
    color: "#5E2ED8",
    fontWeight: "900",
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  countPill: {
    backgroundColor: "#F1EAFD",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  countText: {
    color: "#6D3FDB",
    fontSize: 12,
    fontWeight: "900",
  },
  loader: {
    marginVertical: 20,
  },
  error: {
    color: "#DC2626",
    fontSize: 12,
    lineHeight: 18,
    marginVertical: 8,
  },
  busy: {
    color: "#5E2ED8",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
  },
  emptyState: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  emptyTitle: {
    color: "#0F172A",
    fontWeight: "900",
    marginBottom: 4,
  },
  emptyText: {
    color: "#64748B",
    lineHeight: 18,
  },
  documentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopColor: "#EDF0F7",
    borderTopWidth: 1,
    paddingVertical: 10,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderColor: "#FFE0E0",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7F7",
  },
  fileIconText: {
    color: "#EF4444",
    fontSize: 9,
    fontWeight: "900",
  },
  fileDetails: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    color: "#080D3D",
    fontSize: 13,
    fontWeight: "900",
  },
  fileMeta: {
    color: "#536079",
    fontSize: 11,
    marginTop: 3,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  badgeSuccess: {
    backgroundColor: "#DCFCE7",
  },
  badgePending: {
    backgroundColor: "#EEF2FF",
  },
  badgeDanger: {
    backgroundColor: "#FEE2E2",
  },
  badgeText: {
    color: "#067647",
    fontSize: 10,
    fontWeight: "900",
  },
  smallButton: {
    minWidth: 38,
    minHeight: 34,
    borderRadius: 9,
    borderColor: "#E0E6F2",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  smallButtonText: {
    color: "#6D3FDB",
    fontSize: 10,
    fontWeight: "900",
  },
  deleteButton: {
    borderColor: "#FFCACA",
    backgroundColor: "#FFF7F7",
  },
  deleteText: {
    color: "#EF4444",
    fontSize: 10,
    fontWeight: "900",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    borderBottomColor: "#EDF0F7",
    borderBottomWidth: 1,
  },
  lastActionRow: {
    borderBottomWidth: 0,
  },
  actionCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6D3FDB",
  },
  dangerCircle: {
    backgroundColor: "#EF4444",
  },
  actionCircleText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  actionTextBlock: {
    flex: 1,
  },
  actionTitle: {
    color: "#080D3D",
    fontSize: 14,
    fontWeight: "900",
  },
  actionSubtitle: {
    color: "#536079",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  chevron: {
    color: "#434D72",
    fontSize: 21,
    fontWeight: "800",
  },
  footerNote: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FBF9FF",
    borderColor: "#E2DDF4",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  footerIcon: {
    color: "#6D3FDB",
    fontSize: 18,
    fontWeight: "900",
  },
  footerText: {
    flex: 1,
    color: "#3F4A70",
    fontSize: 13,
    lineHeight: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  detailPanel: {
    width: "100%",
    maxWidth: 390,
    maxHeight: "82%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderColor: "#E2DDF4",
    borderWidth: 1,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomColor: "#EDF0F7",
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 10,
  },
  detailTitleBlock: {
    flex: 1,
  },
  detailTitle: {
    color: "#080D3D",
    fontSize: 16,
    fontWeight: "900",
  },
  detailMeta: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 3,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F0FF",
  },
  closeButtonText: {
    color: "#6D3FDB",
    fontWeight: "900",
  },
  detailList: {
    maxHeight: 460,
  },
  entryCard: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  entryIngredient: {
    color: "#080D3D",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 5,
  },
  entrySnippet: {
    color: "#334155",
    fontSize: 12,
    lineHeight: 18,
  },
  entryTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  benefitTag: {
    backgroundColor: "#DCFCE7",
    color: "#067647",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "800",
  },
  warningTag: {
    backgroundColor: "#FEF3C7",
    color: "#92400E",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "800",
  },
});
