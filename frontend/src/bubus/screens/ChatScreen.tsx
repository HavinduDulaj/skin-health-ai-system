import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import ChatBubble from "../components/ChatBubble";
import { sendChatMessage } from "../services/api";
import { ChatMessage, RootStackParamList } from "../types/types";

type Props = NativeStackScreenProps<RootStackParamList, "Chat">;

const quickPrompts = [
  "Can I use niacinamide daily?",
  "Which ingredients should I avoid?",
  "Is this safe for sensitive skin?",
];

export default function ChatScreen({ route, navigation }: Props) {
  const profile = route.params?.profile;
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "rebeka",
      text: "Hi, I am Rebeka. I can explain ingredient recommendations, avoid ingredients, allergies, and conflicts. This is general skincare guidance and not a medical diagnosis.",
    },
  ]);
  const [sending, setSending] = useState(false);
  const chatScroll = useRef<ScrollView>(null);

  const contextLabel = useMemo(() => {
    if (!profile) {
      return "No profile attached";
    }
    return `${profile.lesion} - ${profile.severity} - ${profile.skinType}`;
  }, [profile]);

  async function submitMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      sender: "user",
      text: trimmed,
    };

    setInput("");
    setMessages((current) => [...current, userMessage]);
    setSending(true);

    try {
      const answer = await sendChatMessage(trimmed, profile);
      const rebekaMessage: ChatMessage = {
        id: `${Date.now()}-rebeka`,
        sender: "rebeka",
        text: answer,
      };
      setMessages((current) => [...current, rebekaMessage]);
    } catch (error) {
      setInput(trimmed);
      setMessages((current) => [...current, {
        id: `${Date.now()}-error`, sender: 'rebeka',
        text: error instanceof Error ? error.message : 'Unable to send your message. Please try again.',
      }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back-outline" size={22} color="#102033" />
        </Pressable>
        <View style={styles.assistantMark}>
          <Ionicons name="sparkles-outline" size={21} color="#0F62D9" />
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Rebeka AI Assistant</Text>
          <View style={styles.statusRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.subtitle}>Ingredient guidance</Text>
          </View>
        </View>
        <View style={styles.infoButton}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#12805C" />
        </View>
      </View>

      <View style={styles.contextCard}>
        <View style={styles.contextIcon}>
          <Ionicons name="person-circle-outline" size={20} color="#0F62D9" />
        </View>
        <View style={styles.contextCopy}>
          <Text style={styles.contextLabel}>Current profile</Text>
          <Text style={styles.contextValue}>{contextLabel}</Text>
        </View>
      </View>

      <ScrollView ref={chatScroll} onContentSizeChange={() => chatScroll.current?.scrollToEnd({ animated: true })} style={styles.chat} contentContainerStyle={styles.chatContent}>
        {messages.map((message) => (
          <ChatBubble key={message.id} text={message.text} sender={message.sender} />
        ))}
        {sending ? (
          <View style={styles.typingBubble}>
            <View style={styles.typingDot} />
            <View style={styles.typingDot} />
            <View style={styles.typingDot} />
            <Text style={styles.typingText}>Rebeka is checking safety rules</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.quickPanel}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
          {quickPrompts.map((prompt) => (
            <Pressable key={prompt} style={styles.quickChip} onPress={() => submitMessage(prompt)}>
              <Text style={styles.quickText}>{prompt}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.inputArea}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask about ingredients, allergies, or conflicts..."
          placeholderTextColor="#94A3B8"
          style={styles.input}
          multiline
          accessibilityLabel="Message to Rebeka"
          maxLength={4000}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          style={[styles.sendButton, (!input.trim() || sending) && styles.sendDisabled]}
          onPress={() => submitMessage(input)}
          disabled={!input.trim() || sending}
        >
          <Ionicons name={sending ? "hourglass-outline" : "send-outline"} size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F6FAFC",
  },
  header: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomColor: "#DDE8F0",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 16,
    paddingTop: 18,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "#F8FBFF",
    borderColor: "#DDE8F0",
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  assistantMark: {
    alignItems: "center",
    backgroundColor: "#EAF3FF",
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    color: "#102033",
    fontSize: 16,
    fontWeight: "900",
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 3,
  },
  onlineDot: {
    backgroundColor: "#12805C",
    borderRadius: 999,
    height: 7,
    width: 7,
  },
  subtitle: {
    color: "#526376",
    fontSize: 12,
    fontWeight: "700",
  },
  infoButton: {
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  contextCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE8F0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    margin: 14,
    marginBottom: 8,
    padding: 12,
  },
  contextIcon: {
    alignItems: "center",
    backgroundColor: "#EAF3FF",
    borderRadius: 8,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  contextCopy: {
    flex: 1,
  },
  contextLabel: {
    color: "#526376",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  contextValue: {
    color: "#102033",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 2,
  },
  chat: {
    flex: 1,
  },
  chatContent: {
    padding: 14,
    paddingBottom: 10,
  },
  typingBubble: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE8F0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    marginTop: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  typingDot: {
    backgroundColor: "#0F62D9",
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  typingText: {
    color: "#526376",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
  },
  quickPanel: {
    backgroundColor: "#FFFFFF",
    borderTopColor: "#EEF2F7",
    borderTopWidth: 1,
    paddingVertical: 10,
  },
  quickRow: {
    gap: 8,
    paddingHorizontal: 14,
  },
  quickChip: {
    backgroundColor: "#EAF3FF",
    borderColor: "#BFD5FF",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  quickText: {
    color: "#0F62D9",
    fontSize: 12,
    fontWeight: "800",
  },
  inputArea: {
    alignItems: "flex-end",
    backgroundColor: "#FFFFFF",
    borderTopColor: "#DDE8F0",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 14,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#102033",
    flex: 1,
    maxHeight: 106,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: "#0F62D9",
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  sendDisabled: {
    opacity: 0.45,
  },
});
