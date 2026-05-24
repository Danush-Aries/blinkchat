import React from 'react';
import { View, StyleSheet } from 'react-native';
import { THEME } from '../../theme';

interface BlinkAvatarProps {
  nickname: string;
  size?: number;
}

export const BlinkAvatar = ({ nickname, size = 40 }: BlinkAvatarProps) => {
  // Deterministic color based on pubkey/nickname char codes
  const getColor = (name: string) => {
    const palette = [
      '#FF5733', '#33FF57', '#3357FF', '#F333FF',
      '#FFFF33', '#33FFFF', '#80FF33', '#FF3380'
    ];
    const sum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return palette[sum % palette.length];
  };

  const initials = nickname.toUpperCase().substring(0, 2);

  return (
    <View style={[styles.avatar, {
      backgroundColor: getColor(nickname),
      width: size,
      height: size,
      borderRadius: size / 2
    }]}>
      {/* Text is rendered via BlinkText in actual screens, here we just use a simple View for the avatar shell */}
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
