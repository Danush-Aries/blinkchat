import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { THEME } from '../../theme';
import { BlinkText } from '../components/BlinkText';
import { BlinkButton } from '../components/BlinkButton';

export default function SettingsScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <BlinkText color="text" size="l" style={{ fontWeight: 'bold' }}>Privacy</BlinkText>
        <View style={styles.row}>
          <BlinkText color="textMuted" size="s">Default TTL</BlinkText>
          <BlinkText color="text" size="s">5 Minutes</BlinkText>
        </View>
      </View>

      <View style={styles.section}>
        <BlinkText color="text" size="l" style={{ fontWeight: 'bold' }}>Security</BlinkText>
        <BlinkButton onPress={() => {}} variant="danger">
          <BlinkText color="text" size="m">Panic Wipe</BlinkText>
        </BlinkButton>
      </View>

      <View style={styles.section}>
        <BlinkText color="text" size="l" style={{ fontWeight: 'bold' }}>BLE</BlinkText>
        <View style={styles.row}>
          <BlinkText color="textMuted" size="s">Advertising</BlinkText>
          <BlinkText color="text" size="s">Enabled</BlinkText>
        </View>
      </View>

      <View style={styles.section}>
        <BlinkText color="text" size="l" style={{ fontWeight: 'bold' }}>About</BlinkText>
        <BlinkText color="textMuted" size="xs">v1.0.0</BlinkText>
        <BlinkText color="primary" size="s">GitHub: blinkchat-offline</BlinkText>
        <View style={styles.badge}>
          <BlinkText color="background" size="xs" style={{ fontWeight: 'bold' }}>No Servers</BlinkText>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    padding: THEME.spacing.l,
  },
  section: {
    marginBottom: 32,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: THEME.colors.primary,
    padding: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
});
