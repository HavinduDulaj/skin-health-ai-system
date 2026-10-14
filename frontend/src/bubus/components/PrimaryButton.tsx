import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useThemeContext } from "../../context/ThemeContext";

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

export default function PrimaryButton({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  icon,
}: PrimaryButtonProps) {
  const { palette } = useThemeContext();
  const isSecondary = variant === "secondary";
  const buttonStyle =
    variant === "primary"
      ? { backgroundColor: palette.primary }
      : variant === "danger"
        ? { backgroundColor: palette.danger }
        : { backgroundColor: palette.subtleSurface, borderColor: palette.border, borderWidth: 1 };
  const textColor = isSecondary ? palette.primary : palette.buttonText;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        buttonStyle,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.row}>
        {icon ? (
          <Ionicons
            name={icon}
            size={17}
            color={textColor}
          />
        ) : null}
        <Text style={[styles.text, { color: textColor }]}>
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 46,
    borderRadius: 8,
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
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
