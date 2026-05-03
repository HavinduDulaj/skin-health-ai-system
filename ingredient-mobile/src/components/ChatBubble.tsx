import { StyleSheet, Text, View } from "react-native";

interface ChatBubbleProps {
  text: string;
  sender: "user" | "rebeka";
}

export default function ChatBubble({ text, sender }: ChatBubbleProps) {
  const isUser = sender === "user";

  return (
    <View style={[styles.row, isUser && styles.userRow]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.rebekaBubble]}>
        <Text style={[styles.text, isUser && styles.userText]}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginBottom: 10,
  },
  userRow: {
    justifyContent: "flex-end",
  },
  bubble: {
    maxWidth: "82%",
    borderRadius: 14,
    padding: 12,
  },
  rebekaBubble: {
    backgroundColor: "#EEF4FF",
    borderColor: "#DBEAFE",
    borderWidth: 1,
  },
  userBubble: {
    backgroundColor: "#0057FF",
  },
  text: {
    color: "#1F2937",
    lineHeight: 20,
  },
  userText: {
    color: "#FFFFFF",
  },
});
