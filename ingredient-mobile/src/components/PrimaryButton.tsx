import { Pressable, StyleSheet, Text } from "react-native";

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}

export default function PrimaryButton({
  title,
  onPress,
  variant = "primary",
  disabled = false,
}: PrimaryButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.text, variant === "secondary" && styles.secondaryText]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    marginTop: 8,
    shadowColor: "#0F4CDB",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  primary: {
    backgroundColor: "#0057FF",
  },
  secondary: {
    backgroundColor: "#F4F8FF",
    borderColor: "#BFD5FF",
    borderWidth: 1,
  },
  danger: {
    backgroundColor: "#DC2626",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  secondaryText: {
    color: "#0057FF",
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
