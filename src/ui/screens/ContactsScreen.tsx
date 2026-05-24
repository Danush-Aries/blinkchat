import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { THEME } from '../../theme';
import { BlinkText } from '../components/BlinkText';
import { BlinkAvatar } from '../components/BlinkAvatar';
import { usePeerRegistry } from '../../services/mesh/peerRegistry';
import { useNavigation } from '@react-navigation/native';

export default function ContactsScreen() {
  const { peers, updatePeers } = usePeerRegistry();
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <FlatList
        data={peers}
        keyExtractor={(item) => item.deviceId}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => (navigation as any).navigate('Chat', { peerPubkey: item.pubkey, nickname: item.nickname })}
          >
            <BlinkAvatar nickname={item.nickname} />
            <View style={styles.content}>
              <BlinkText color="text" size="m" style={{ fontWeight: 'bold' }}>{item.nickname}</BlinkText>
              <BlinkText color="textMuted" size="xs" style={{ fontFamily: 'monospace' }}>{item.pubkey.substring(0, 16)}...</BlinkText>
            </View>
            <TouchableOpacity style={styles.msgBtn}>
              <BlinkText color="background" size="s">Message</BlinkText>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <BlinkText color="textMuted" size="m">Scanning for peers...</BlinkText>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  msgBtn: {
    backgroundColor: THEME.colors.primary,
    padding: THEME.spacing.s,
    borderRadius: THEME.borderRadius.s,
  },
});
