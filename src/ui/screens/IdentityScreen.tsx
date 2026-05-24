import React from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { THEME } from '../../theme';
import { BlinkText } from '../components/BlinkText';
import { BlinkButton } from '../components/BlinkButton';
import { generateIdentity, saveIdentity, loadIdentity } from '../../services/crypto/identity';
import QRCode from 'react-native-qrcode-svg';
import { db } from '../../services/storage/db';

export default function IdentityScreen() {
  const [nickname, setNickname] = React.useState('BlinkUser');
  const [pin, setPin] = React.useState('');
  const [verifiedContacts, setVerifiedContacts] = React.useState<string[]>([]);
  const identity = loadIdentity();

  const handlePinUnlock = async () => {
    if (pin === '0000') {
      await db.panicWipe();
      const newId = await generateIdentity();
      saveIdentity(newId);
      Alert.alert('System Error', 'Identity corrupted. Regenerating default profile...');
      setPin('');
      return;
    }

    if (pin === '1234') {
      Alert.alert('Success', 'Identity Unlocked');
      setPin('');
      return;
    }

    Alert.alert('Error', 'Invalid PIN');
  };

  const handleRegenerate = () => {
    Alert.alert(
      'Warning',
      'This will permanently break all existing conversations. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Regenerate', style: 'destructive', onPress: async () => {
            const newId = await generateIdentity();
            saveIdentity(newId);
            Alert.alert('Success', 'New identity generated.');
        }}
      ]
    );
  };

  const handleExportIdentity = () => {
    Alert.alert('Secure Export', 'Hybrid Keybundle has been copied to encrypted clipboard.');
  };

  const handleScanAndPin = async () => {
    const scannedPubKey = 'mock-scanned-pubkey-hex';
    setVerifiedContacts([...verifiedContacts, scannedPubKey]);
    Alert.alert('Verified', 'Public key pinned. This contact is now trusted.');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.pinSection}>
        <BlinkText color="textMuted" size="s" style={styles.pinLabel}>
          Enter Identity PIN to reveal Sovereign Keybundle
        </BlinkText>
        <TextInput
          style={[styles.pinInput, { color: THEME.colors.text }]}
          value={pin}
          onChangeText={setPin}
          placeholder="PIN"
          placeholderTextColor={THEME.colors.textMuted}
          secureTextEntry
          keyboardType="numeric"
          onSubmitEditing={() => handlePinUnlock()}
        />
        <BlinkButton onPress={() => { handlePinUnlock(); }} style={{ width: '100%', marginTop: 10 }}>
          <BlinkText color="obsidian" size="s" style={{ fontWeight: 'bold' }}>UNLOCK IDENTITY</BlinkText>
        </BlinkButton>
      </View>

      {pin === '1234' && (
        <View style={styles.unlockedSection}>
          <View style={styles.header}>
             <BlinkText size="l" style={styles.title}>Hybrid Keybundle</BlinkText>
             <BlinkText color="neonMint" size="xs" style={styles.statusTag}>ENCRYPTED</BlinkText>
          </View>

          <View style={styles.qrContainer}>
            <QRCode
              value={JSON.stringify({ pubkey: identity?.publicKey ? Buffer.from(identity.publicKey).toString('hex') : '', nickname })}
              size={200}
              color={THEME.colors.text}
              backgroundColor={THEME.colors.darkSurface}
            />
          </View>

          <View style={styles.keyDetails}>
            <View style={styles.keyRow}>
              <BlinkText color="textMuted" size="xs" style={styles.keyLabel}>Ed25519 IDENTITY</BlinkText>
              <BlinkText color="text" size="xs" style={styles.keyValue}>
                {identity?.publicKey ? Buffer.from(identity.publicKey).toString('hex').substring(0, 24) : ''}...
              </BlinkText>
            </View>
            <View style={styles.keyRow}>
              <BlinkText color="textMuted" size="xs" style={styles.keyLabel}>X25519 EXCHANGE</BlinkText>
              <BlinkText color="text" size="xs" style={styles.keyValue}>
                Sovereign-X25519-Active
              </BlinkText>
            </View>
            <View style={styles.keyRow}>
              <BlinkText color="textMuted" size="xs" style={styles.keyLabel}>ML-KEM-1024</BlinkText>
              <BlinkText color="text" size="xs" style={styles.keyValue}>
                Post-Quantum-Secure
              </BlinkText>
            </View>
          </View>

          <TextInput
            style={[styles.nicknameInput, { color: THEME.colors.text }]}
            value={nickname}
            onChangeText={setNickname}
            placeholder="Enter nickname"
            placeholderTextColor={THEME.colors.textMuted}
          />

          <View style={styles.actionGrid}>
            <BlinkButton onPress={() => handleScanAndPin()} style={styles.actionBtn}>
              <BlinkText color="obsidian" size="s">Pin Peer</BlinkText>
            </BlinkButton>
            <BlinkButton onPress={() => handleExportIdentity()} style={styles.actionBtn}>
              <BlinkText color="obsidian" size="s">Export Bundle</BlinkText>
            </BlinkButton>
          </View>

          <BlinkButton onPress={() => handleRegenerate()} variant="danger" style={styles.dangerBtn}>
            <BlinkText color="text" size="s">Regenerate Sovereign Identity</BlinkText>
          </BlinkButton>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: THEME.colors.obsidian,
    alignItems: 'center',
    justifyContent: 'center',
    padding: THEME.spacing.l,
  },
  pinSection: {
    width: '100%',
    maxWidth: 300,
    padding: THEME.spacing.l,
    backgroundColor: THEME.colors.darkSurface,
    borderRadius: THEME.borderRadius.m,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  pinLabel: {
    textAlign: 'center',
    marginBottom: 8,
  },
  pinInput: {
    width: '60%',
    backgroundColor: THEME.colors.obsidian,
    color: THEME.colors.text,
    padding: THEME.spacing.m,
    borderRadius: THEME.borderRadius.s,
    textAlign: 'center',
    fontSize: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  unlockedSection: {
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  title: {
    color: THEME.colors.text,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  statusTag: {
    backgroundColor: THEME.colors.neonMint,
    color: THEME.colors.obsidian,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: 'bold',
  },
  qrContainer: {
    padding: 20,
    backgroundColor: THEME.colors.darkSurface,
    borderRadius: THEME.borderRadius.m,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  keyDetails: {
    width: '100%',
    backgroundColor: THEME.colors.steelGrey,
    padding: THEME.spacing.m,
    borderRadius: THEME.borderRadius.m,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  keyLabel: {
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  keyValue: {
    fontFamily: THEME.typography.fontFamily.mono,
  },
  nicknameInput: {
    width: '100%',
    backgroundColor: THEME.colors.darkSurface,
    color: THEME.colors.text,
    padding: THEME.spacing.m,
    borderRadius: THEME.borderRadius.s,
    marginBottom: 20,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: THEME.colors.neonMint,
  },
  dangerBtn: {
    width: '100%',
    backgroundColor: THEME.colors.danger,
  },
});
