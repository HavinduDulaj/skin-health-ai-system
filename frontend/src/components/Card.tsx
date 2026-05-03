import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { useThemeContext } from '../context/ThemeContext';
import { radii } from '../theme/theme';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
}

export default function Card({ children, style }: CardProps) {
  const { palette } = useThemeContext();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.card,
          shadowColor: palette.shadow,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    padding: 18,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 22,
    elevation: 4,
  },
});
