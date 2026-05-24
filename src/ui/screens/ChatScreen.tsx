import React from 'react';
import { View, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { THEME } from '../../theme';
import { BlinkText } from '../components/BlinkText';
import { BlinkAvatar } from '../components/BlinkAvatar';
import { db, Message } from '../../services/storage/db';
import { router } from '../../services/mesh/router';
import { encryptForPeerMAD } from '../../services/crypto/encryption';
import { Packet, PacketType } from '../../services/protocol/packet';
import { loadIdentity } from '../../services/crypto/identity';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useBurnStore } from '../../services/state/burnStore';

export default function ChatScreen() {
  const route = useRoute();
  const { peerPubkey, nickname } = route.params as any;
  const navigation = useNavigation();
  const { burnMessages, purgeBurnMessage } = useBurnStore();

  const [messages, setMessages] = React.useState<Message[]>([]);
  const [text, setText] = React.useState('');
  const [revealedId, setRevealedId] = React.useState<string | null>(null);
  const [logoTaps, setLogoTaps] = React.useState(0);

  React.useEffect(() => {
    async function loadMsgs() {
      const msgs = await db.getMessagesByThread(peerPubkey);
      setMessages(msgs);
    }
    loadMsgs();
  }, [peerPubkey]);

  const handleLogoPress = () => {
    setLogoTaps(prev => {
      const next = prev + 1;
      if (next >= 3) {
        // PANIC WIPE TRIGGER
        console.log('!!! EMERGENCY PANIC WIPE TRIGGERED !!!');
        // In production: call a service to wipe the SQLite DB and keybundle
        setLogoTaps(0);
        return 0;
      }
      return next;
    });
  };

  const sendMessage = async () => {
    if (!text.trim()) return;

    const identity = loadIdentity();
    if (!identity) return;

    try {
      const initialState = {
        rootKey: new Uint8Array(32),
        sendChainKey: new Uint8Array(32),
        recvChainKey: new Uint8Array(32),
        remotePubKey: identity.publicKey,
        localKeyPair: { privateKey: identity.privateKey, publicKey: identity.publicKey },
        previousChainLength: 0,
        messageNumbers: new Map(),
      };
      const { ciphertext, nonce } = await encryptForPeerMAD(text, initialState);

      const packet: Packet = {
        id: Math.random().toString(36).substring(7),
        type: PacketType.DIRECT,
        sender: Buffer.from(identity.publicKey).toString('hex'),
        recipient: peerPubkey,
        payload: ciphertext,
        nonce: nonce,
        ttl: 5,
        timestamp: Date.now(),
        signature: '',
        hopLog: [],
      };

      await router.routePacket(packet, Buffer.from(identity.publicKey).toString('hex'));

      await db.insertMessage({
        id: packet.id,
        thread_id: peerPubkey,
        from_pubkey: Buffer.from(identity.publicKey).toString('hex'),
        to_pubkey: peerPubkey,
        group_id: null,
        plaintext: text,
        timestamp: packet.timestamp,
        ttl_seconds: 300,
        expires_at: packet.timestamp + 300000,
        delivery_status: 'sent',
      });

      setText('');
      setMessages(prev => [...prev, {
        id: packet.id,
        plaintext: text,
        from_pubkey: Buffer.from(identity.publicKey).toString('hex'),
        timestamp: packet.timestamp,
        thread_id: peerPubkey,
        to_pubkey: peerPubkey,
        group_id: null,
        ttl_seconds: 300,
        expires_at: packet.timestamp + 300000,
        delivery_status: 'sent'
      } as Message]);

    } catch (e) {
      console.error('MAD Send Failed', e);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return THEME.colors.neonMint;
      case 'relayed': return THEME.colors.accent;
      case 'sent': return THEME.colors.textMuted;
      default: return THEME.colors.textMuted;
    }
  };

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => handleLogoPress()} style={styles.logoTrigger}>
            <BlinkText size="xs" style={styles.logoText}>BLINK</BlinkText>
          </TouchableOpacity>
          <BlinkAvatar nickname={peerPubkey} size={30} />
          <View style={styles.headerInfo}>
            <BlinkText size="s" style={styles.headerNickname}>{nickname || 'Secure Peer'}</BlinkText>
            <BlinkText color="neonMint" size="xs" style={styles.headerStatus}>● Mesh Active</BlinkText>
          </View>
        </View>

        <FlatList
          data={[...messages, ...burnMessages]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isBurn = !!item.id && burnMessages.some(bm => bm.id === item.id);
            const msg = item as Message;
            const isMe = msg.from_pubkey === Buffer.from(loadIdentity()?.publicKey || []).toString('hex');

            return (
              <TouchableOpacity
                onPressIn={() => { if (isBurn) setRevealedId(item.id); }}
                onPressOut={() => {
                  if (isBurn) {
                    purgeBurnMessage(item.id);
                    setRevealedId(null);
                  }
                }}
                style={[styles.bubble, isMe ? styles.sent : styles.received, isBurn && styles.burnBubble]}
              >
                <View style={isBurn && revealedId !== item.id ? styles.blurOverlay : null}>
                  <BlinkText color={isMe ? 'obsidian' as any : 'text' as any} size="s">
                    {msg.plaintext || (item as any).text}
                  </BlinkText>

                  {isMe && !isBurn && (
                    <BlinkText
                      color={getStatusColor(msg.delivery_status) as any}
                      size="xs"
                      style={styles.statusText}
                    >
                      {msg.delivery_status?.toUpperCase()}
                    </BlinkText>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
        <View style={styles.inputBar}>
          <TextInput
            style={[styles.input, { color: THEME.colors.text }]}
            value={text}
            onChangeText={setText}
            placeholder="Secure message..."
            placeholderTextColor={THEME.colors.textMuted}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={() => sendMessage()}>
            <BlinkText color="obsidian" size="s" style={{ fontWeight: 'bold' }}>SEND</BlinkText>
          </TouchableOpacity>
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.obsidian,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.m,
    backgroundColor: THEME.colors.darkSurface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    gap: THEME.spacing.s,
  },
  logoTrigger: {
    paddingRight: THEME.spacing.m,
    borderRightWidth: 1,
    borderRightColor: THEME.colors.border,
  },
  logoText: {
    color: THEME.colors.neonMint,
    fontWeight: '900',
    letterSpacing: 2,
  },
  headerInfo: {
    flexDirection: 'column',
  },
  headerNickname: {
    color: THEME.colors.text,
    fontWeight: 'bold',
  },
  headerStatus: {
    fontWeight: 'bold',
  },
  bubble: {
    padding: THEME.spacing.m,
    borderRadius: THEME.borderRadius.m,
    margin: THEME.spacing.s,
    maxWidth: '80%',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sent: {
    alignSelf: 'flex-end',
    backgroundColor: THEME.colors.neonMint,
    borderBottomRightRadius: 0,
    borderColor: THEME.colors.neonMint,
  },
  received: {
    alignSelf: 'flex-start',
    backgroundColor: THEME.colors.steelGrey,
    borderBottomLeftRadius: 0,
    borderColor: THEME.colors.border,
  },
  burnBubble: {
    borderColor: THEME.colors.accent,
    backgroundColor: THEME.colors.darkSurface,
  },
  statusText: {
    fontSize: 8,
    alignSelf: 'flex-end',
    marginTop: 4,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  blurOverlay: {
    opacity: 0.4,
  },
  inputBar: {
    flexDirection: 'row',
    padding: THEME.spacing.m,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    backgroundColor: THEME.colors.darkSurface,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: THEME.colors.obsidian,
    color: THEME.colors.text,
    padding: THEME.spacing.s,
    borderRadius: THEME.borderRadius.s,
    marginRight: THEME.spacing.s,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  sendBtn: {
    backgroundColor: THEME.colors.neonMint,
    padding: THEME.spacing.m,
    borderRadius: THEME.borderRadius.s,
  },
});
