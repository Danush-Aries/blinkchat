import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { THEME } from '../../theme';

interface BlinkButtonProps {
  onPress: (...args: any[]) => void;
  variant?: 'primary' | 'danger';
  children: React.ReactNode;
  style?: any;
}

export const BlinkButton = ({ onPress, variant = 'primary', children, style }: BlinkButtonProps) => {
  const bgColor = variant === 'danger' ? THEME.colors.danger : THEME.colors.primary;
  const textColor = variant === 'danger' ? THEME.colors.text : THEME.colors.background;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.button, { backgroundColor: bgColor }, style]}
    >
      {children}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: THEME.spacing.m,
    borderRadius: THEME.borderRadius.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
