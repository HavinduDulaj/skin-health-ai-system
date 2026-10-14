import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

interface ChatBubbleProps {
  text: string;
  sender: "user" | "rebeka";
}

export default function ChatBubble({ text, sender }: ChatBubbleProps) {
  const isUser = sender === "user";
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <View style={[styles.row, isUser && styles.userRow]}>
      {!isUser ? (
        <View style={styles.avatar}>
          <Ionicons name="sparkles-outline" size={16} color="#0F62D9" />
        </View>
      ) : null}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.rebekaBubble]}>
        {!isUser ? <Text style={styles.senderLabel}>Rebeka</Text> : null}
        <Text style={[styles.text, isUser && styles.userText]}>
          {parts.map((part, index) => {
            const isBold = part.startsWith("**") && part.endsWith("**");
            return (
              <Text
                key={`${part}-${index}`}
                style={isBold ? [styles.boldText, isUser && styles.userBoldText] : undefined}
              >
                {isBold ? part.slice(2, -2) : part}
              </Text>
            );
          })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  userRow: {
    justifyContent: "flex-end",
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "#EAF3FF",
    borderColor: "#BFD5FF",
    borderRadius: 8,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  bubble: {
    borderRadius: 8,
    maxWidth: "78%",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rebekaBubble: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DDE8F0",
    borderWidth: 1,
  },
  userBubble: {
    backgroundColor: "#0F62D9",
  },
  senderLabel: {
    color: "#0F62D9",
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  text: {
    color: "#102033",
    fontSize: 14,
    lineHeight: 20,
  },
  boldText: {
    color: "#071033",
    fontWeight: "900",
  },
  userBoldText: {
    color: "#FFFFFF",
  },
  userText: {
    color: "#FFFFFF",
  },
});
