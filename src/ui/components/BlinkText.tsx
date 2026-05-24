import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { THEME } from '../../theme';

interface BlinkTextProps {
  style?: any;
  color?: keyof typeof THEME.colors;
  size?: keyof typeof THEME.typography.fontSize;
  numberOfLines?: number;
  children: React.ReactNode;
}

export const BlinkText = ({ style, color = 'text', size = 'm', numberOfLines, children }: BlinkTextProps) => {
  return (
    <Text numberOfLines={numberOfLines} style={[styles.default, { color: THEME.colors[color], fontSize: THEME.typography.fontSize[size] }, style]}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  default: {
    fontFamily: 'System',
  },
});
