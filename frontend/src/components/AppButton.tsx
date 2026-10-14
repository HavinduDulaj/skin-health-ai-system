import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { useThemeContext } from '../context/ThemeContext';
import { radii } from '../theme/theme';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: keyof typeof Ionicons.glyphMap;
}

export default function AppButton({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  icon,
}: AppButtonProps) {
  const { palette } = useThemeContext();
  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: isPrimary ? palette.primary : isGhost ? 'transparent' : palette.card,
          borderColor: isPrimary ? palette.primary : isGhost ? 'transparent' : palette.border,
          opacity: disabled || loading ? 0.55 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
          shadowColor: isPrimary ? palette.shadow : 'transparent',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#FFFFFF' : palette.primary} />
      ) : (
        <View style={styles.labelRow}>
          {icon ? <Ionicons name={icon} size={18} color={isPrimary ? '#FFFFFF' : palette.primary} /> : null}
          <Text
            style={[
              styles.label,
              {
                color: isPrimary ? '#FFFFFF' : isGhost ? palette.primary : palette.text,
              },
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 20,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 22,
    elevation: 4,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
