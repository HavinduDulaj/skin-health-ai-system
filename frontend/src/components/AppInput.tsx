import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { useThemeContext } from '../context/ThemeContext';
import { radii } from '../theme/theme';

interface AppInputProps extends TextInputProps {
  label?: string;
  icon?: string;
  rightIcon?: string;
}

export default function AppInput({ label, icon, rightIcon, style, ...props }: AppInputProps) {
  const { palette } = useThemeContext();

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={[styles.label, { color: palette.secondaryText }]}>{label}</Text> : null}
      <View
        style={[
          styles.inputShell,
          {
            backgroundColor: palette.card,
            borderColor: palette.border,
          },
        ]}
      >
        {icon ? <Text style={[styles.iconText, { color: palette.muted }]}>{icon}</Text> : null}
        <TextInput
          placeholderTextColor={palette.muted}
          style={[
            styles.input,
            {
              color: palette.text,
            },
            style,
          ]}
          {...props}
        />
        {rightIcon ? <Text style={[styles.iconText, { color: palette.muted }]}>{rightIcon}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputShell: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 52,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontSize: 15,
    minHeight: 52,
    paddingVertical: 12,
  },
  iconText: {
    fontSize: 13,
    fontWeight: '700',
    marginHorizontal: 6,
    minWidth: 18,
    textAlign: 'center',
  },
});
