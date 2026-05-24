import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { THEME } from '../../theme';
import { BlinkText } from '../components/BlinkText';
import { BlinkAvatar } from '../components/BlinkAvatar';
import { usePeerRegistry } from '../../services/mesh/peerRegistry';
import { useDb } from '../../services/storage/db';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const { peers, updatePeers } = usePeerRegistry();
  const { threads, refreshThreads } = useDb();
  const navigation = useNavigation();

  React.useEffect(() => {
    const interval = setInterval(updatePeers, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <BlinkText color="text" size="xl" style={{ fontWeight: 'bold' }}>BlinkChat</BlinkText>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: THEME.colors.primary }]} />
          <BlinkText color="textMuted" size="s">{peers.length} peers</BlinkText>
        </View>
      </View>

      <FlatList
        data={threads}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.threadRow}
            onPress={() => (navigation as any).navigate('Chat', { peerPubkey: item.peer_pubkey, nickname: item.nickname })}
          >
            <BlinkAvatar nickname={item.nickname} />
            <View style={styles.content}>
              <View style={styles.row}>
                <BlinkText color="text" size="m" style={{ fontWeight: 'bold' }}>{item.nickname}</BlinkText>
                <BlinkText color="textMuted" size="xs">{item.last_timestamp}</BlinkText>
              </View>
              <BlinkText color="textMuted" size="s" numberOfLines={1}>{item.last_message}</BlinkText>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <BlinkText color="textMuted" size="m">No conversations yet. Discover peers nearby.</BlinkText>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => (navigation as any).navigate('Contacts')}
      >
        <BlinkText color="background" size="m" style={{ fontWeight: 'bold' }}>+</BlinkText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: THEME.spacing.l,
    marginTop: 40,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  threadRow: {
    flexDirection: 'row',
    padding: THEME.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    alignItems: 'center',
  },
  content: {
    marginLeft: 12,
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
});
