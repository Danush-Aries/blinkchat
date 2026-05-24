import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { THEME } from '../../theme';
import { BlinkText } from '../components/BlinkText';
import { BlinkButton } from '../components/BlinkButton';

export default function KeyVerificationScreen() {
  const [isVerified, setIsVerified] = useState(false);
  const [scannedKey, setScannedKey] = useState('');

  const handleScan = () => {
    setScannedKey('ed25519_f8a2c1...99b0');
  };

  const verifyKey = () => {
    setIsVerified(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BlinkText size="l" style={styles.title}>Sovereign Trust</BlinkText>
        <BlinkText color="textMuted" size="s" style={styles.subtitle}>
          Verify the peer's identity hash to establish a cryptographically secure link.
        </BlinkText>
      </View>

      <View style={styles.qrPlaceholder}>
        <BlinkText color="textMuted" style={styles.placeholderText}>
          {scannedKey ? '✓ Fingerprint Captured' : 'Scan Peer QR Code'}
        </BlinkText>
      </View>

      {scannedKey !== '' && !isVerified && (
        <View style={styles.verificationBox}>
          <BlinkText color="textMuted" size="xs" style={styles.label}>SHORT AUTHENTICATION STRING (SAS)</BlinkText>
          <View style={styles.sasContainer}>
            <BlinkText color="text" size="l" style={styles.sasText}>
              {scannedKey.substring(0, 12).toUpperCase()} • {scannedKey.substring(13, 25).toUpperCase()}
            </BlinkText>
          </View>
          <BlinkText color="textMuted" size="xs" style={styles.hint}>
            Compare these segments with the peer's screen.
          </BlinkText>
        </View>
      )}

      <View style={styles.actions}>
        {!scannedKey && (
          <BlinkButton onPress={handleScan} style={styles.btn}>
            Initiate Secure Scan
          </BlinkButton>
        )}

        {scannedKey !== '' && !isVerified && (
          <BlinkButton onPress={verifyKey} style={[styles.btn, styles.verifyBtn]}>
            Verify & Trust Identity
          </BlinkButton>
        )}

        {isVerified && (
          <View style={styles.successState}>
            <BlinkText color="neonMint" size="m" style={styles.successText}>
              Identity Permanently Signed ✓
            </BlinkText>
            <BlinkText color="textMuted" size="xs" style={styles.successSubtext}>
              This peer is now trusted. All future communications will be encrypted using this verified key.
            </BlinkText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.obsidian,
    alignItems: 'center',
    justifyContent: 'center',
    padding: THEME.spacing.l,
  },
  header: {
    alignItems: 'center',
    marginBottom: THEME.spacing.xl,
  },
  title: {
    color: THEME.colors.text,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginBottom: THEME.spacing.s,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
  qrPlaceholder: {
    width: 240,
    height: 240,
    backgroundColor: THEME.colors.darkSurface,
    borderRadius: THEME.borderRadius.m,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderStyle: 'dashed',
    marginBottom: THEME.spacing.xl,
  },
  placeholderText: {
    fontSize: 14,
    letterSpacing: 1,
  },
  verificationBox: {
    backgroundColor: THEME.colors.steelGrey,
    padding: THEME.spacing.m,
    borderRadius: THEME.borderRadius.m,
    marginBottom: THEME.spacing.xl,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  label: {
    marginBottom: THEME.spacing.s,
    letterSpacing: 1,
    fontWeight: 'bold',
  },
  sasContainer: {
    backgroundColor: THEME.colors.obsidian,
    padding: THEME.spacing.m,
    borderRadius: THEME.borderRadius.s,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.neonMint,
  },
  sasText: {
    fontFamily: THEME.typography.fontFamily.mono,
    letterSpacing: 2,
    fontWeight: 'bold',
  },
  hint: {
    marginTop: THEME.spacing.s,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actions: {
    width: '100%',
    gap: THEME.spacing.m,
    alignItems: 'center',
  },
  btn: {
    backgroundColor: THEME.colors.neonMint,
    width: '100%',
  },
  verifyBtn: {
    backgroundColor: THEME.colors.accent,
  },
  successState: {
    alignItems: 'center',
    padding: THEME.spacing.m,
  },
  successText: {
    fontWeight: 'bold',
    marginBottom: THEME.spacing.xs,
    letterSpacing: 1,
  },
  successSubtext: {
    textAlign: 'center',
  },
});
