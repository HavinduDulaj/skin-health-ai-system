import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
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
import PrimaryButton from "../components/PrimaryButton";
import { sendChatMessage } from "../services/api";
import { ChatMessage, RootStackParamList } from "../types/types";

type Props = NativeStackScreenProps<RootStackParamList, "Chat">;

export default function ChatScreen({ route, navigation }: Props) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "rebeka",
      text: "Hi, I am Rebeka. Ask me about suitable ingredients, avoid ingredients, allergies, or whether two ingredients can be used together. This is general skincare guidance and not a medical diagnosis.",
    },
  ]);
  const [sending, setSending] = useState(false);

  async function handleSend() {
    const trimmed = input.trim();
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
      const answer = await sendChatMessage(trimmed, route.params.profile);
      const rebekaMessage: ChatMessage = {
        id: `${Date.now()}-rebeka`,
        sender: "rebeka",
        text: answer,
      };
      setMessages((current) => [...current, rebekaMessage]);
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.phone}>
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => navigation.goBack()}>
            <Text style={styles.back}>{"<"}</Text>
          </Pressable>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Rebeka AI Assistant</Text>
            <Text style={styles.subtitle}>Ingredient guidance chat</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AI</Text>
          </View>
        </View>

        <ScrollView style={styles.chat} contentContainerStyle={styles.chatContent}>
          {messages.map((message) => (
            <ChatBubble key={message.id} text={message.text} sender={message.sender} />
          ))}
        </ScrollView>

        <View style={styles.inputArea}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask Rebeka..."
            placeholderTextColor="#94A3B8"
            style={styles.input}
            multiline
          />
          <View style={styles.sendWrap}>
            <PrimaryButton
              title={sending ? "..." : "Send"}
              onPress={handleSend}
              disabled={!input.trim() || sending}
            />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F4F7FC",
    alignItems: "center",
    padding: 16,
  },
  phone: {
    width: "100%",
    maxWidth: 390,
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderColor: "#CED6E4",
    borderWidth: 1,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  header: {
    padding: 16,
    paddingTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomColor: "#EEF2F7",
    borderBottomWidth: 1,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F8FF",
  },
  back: {
    color: "#071033",
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800",
  },
  titleBlock: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    color: "#070B25",
    fontSize: 17,
    fontWeight: "900",
  },
  subtitle: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF2FF",
    borderColor: "#BFD5FF",
    borderWidth: 1,
  },
  avatarText: {
    color: "#0057FF",
    fontSize: 12,
    fontWeight: "900",
  },
  chat: {
    flex: 1,
    backgroundColor: "#FBFDFF",
  },
  chatContent: {
    padding: 20,
    paddingBottom: 12,
  },
  inputArea: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    padding: 14,
    borderTopColor: "#EEF2F7",
    borderTopWidth: 1,
  },
  input: {
    minHeight: 48,
    maxHeight: 100,
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    borderWidth: 1,
    borderRadius: 14,
    color: "#0F172A",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sendWrap: {
    width: 72,
  },
});
