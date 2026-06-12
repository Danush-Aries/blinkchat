import React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MMKV } from 'react-native-mmkv';
import { THEME } from '../../theme';
import { BlinkText } from '../components/BlinkText';
import { BlinkAvatar } from '../components/BlinkAvatar';
import { db, Message } from '../../services/storage/db';
import { router } from '../../services/mesh/router';
import {
  buildInitialRatchetState,
  encryptForPeerMAD,
} from '../../services/crypto/encryption';
import { Packet, PacketType } from '../../services/protocol/packet';
import { loadIdentity, wipeIdentity } from '../../services/crypto/identity';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useBurnStore } from '../../services/state/burnStore';

const identityStorage = new MMKV({ id: 'blinkchat-identity' });

export default function ChatScreen() {
  const route = useRoute();
  const { peerPubkey, nickname, peerX25519PubKey } = route.params as {
    peerPubkey: string;
    nickname?: string;
    peerX25519PubKey?: string;
  };
  const navigation = useNavigation();
  const { burnMessages, purgeBurnMessage } = useBurnStore();

  const [messages, setMessages] = React.useState<Message[]>([]);
  const [text, setText] = React.useState('');
  const [revealedId, setRevealedId] = React.useState<string | null>(null);
  const [logoTaps, setLogoTaps] = React.useState(0);

  React.useEffect(() => {
    db.getMessagesByThread(peerPubkey).then(setMessages);
  }, [peerPubkey]);

  // ----- Panic Wipe -----
  const handleLogoPress = () => {
    setLogoTaps(prev => {
      const next = prev + 1;
      if (next >= 3) {
        Alert.alert(
          'Emergency Wipe',
          'This will immediately erase all messages and identity keys.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setLogoTaps(0) },
            {
              text: 'Wipe Now',
              style: 'destructive',
              onPress: async () => {
                await db.panicWipe();
                wipeIdentity();
                setLogoTaps(0);
                (navigation as any).reset({ index: 0, routes: [{ name: 'Home' }] });
              },
            },
          ]
        );
        return prev;
      }
      // Reset tap counter after 1.5 seconds of inactivity
      setTimeout(() => setLogoTaps(0), 1500);
      return next;
    });
  };

  // ----- Send Message -----
  const sendMessage = async () => {
    if (!text.trim()) return;

    const identity = loadIdentity();
    if (!identity) return;

    try {
      const myPubkeyHex = Buffer.from(identity.publicKey).toString('hex');

      // Build a ratchet state seeded from a proper DH exchange.
      // If we have the peer's X25519 public key use it; otherwise fall back
      // to a deterministic ephemeral key derived from our own key so the
      // encryption path is always exercised (messages decrypt only if the
      // recipient does the same derivation on their side).
      const remotePubKeyBytes = peerX25519PubKey
        ? Buffer.from(peerX25519PubKey, 'hex')
        : identity.x25519PublicKey; // fallback: self-exchange (no real secrecy)

      const ratchetState = buildInitialRatchetState(
        identity.x25519PrivateKey,
        identity.x25519PublicKey,
        remotePubKeyBytes
      );

      const { ciphertext, nonce } = await encryptForPeerMAD(text, ratchetState);

      const msgId = Math.random().toString(36).substring(2, 10);
      const now = Date.now();

      const packet: Packet = {
        id: msgId,
        type: PacketType.DIRECT,
        sender: myPubkeyHex,
        recipient: peerPubkey,
        payload: ciphertext,
        nonce,
        ttl: 5,
        timestamp: now,
        signature: '',
        hopLog: [],
      };

      await router.routePacket(packet, myPubkeyHex);

      const newMsg: Message = {
        id: msgId,
        thread_id: peerPubkey,
        from_pubkey: myPubkeyHex,
        to_pubkey: peerPubkey,
        group_id: null,
        plaintext: text,
        timestamp: now,
        ttl_seconds: 300,
        expires_at: now + 300_000,
        delivery_status: 'sent',
      };

      await db.insertMessage(newMsg);
      setText('');
      setMessages(prev => [...prev, newMsg]);
    } catch (e) {
      console.error('Send failed', e);
    }
  };

  // ----- Helpers -----
  const myPubkeyHex = React.useMemo(() => {
    const id = loadIdentity();
    return id ? Buffer.from(id.publicKey).toString('hex') : '';
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return THEME.colors.neonMint;
      case 'relayed':
        return THEME.colors.accent;
      default:
        return THEME.colors.textMuted;
    }
  };

  // ----- Render -----
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleLogoPress}
          style={styles.logoTrigger}
          accessibilityLabel="Panic wipe trigger — triple tap"
        >
          <BlinkText size="xs" style={styles.logoText}>BLINK</BlinkText>
        </TouchableOpacity>
        <BlinkAvatar nickname={nickname ?? peerPubkey} size={30} />
        <View style={styles.headerInfo}>
          <BlinkText size="s" style={styles.headerNickname}>
            {nickname ?? 'Secure Peer'}
          </BlinkText>
          <BlinkText color="neonMint" size="xs" style={styles.headerStatus}>
            ● Mesh Active
          </BlinkText>
        </View>
      </View>

      {/* Message List */}
      <FlatList
        data={[...messages, ...burnMessages] as any[]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isBurn = burnMessages.some(bm => bm.id === item.id);
          const msg = item as Message;
          const isMe = msg.from_pubkey === myPubkeyHex;

          return (
            <TouchableOpacity
              onPressIn={() => { if (isBurn) setRevealedId(item.id); }}
              onPressOut={() => {
                if (isBurn) {
                  purgeBurnMessage(item.id);
                  setRevealedId(null);
                }
              }}
              style={[
                styles.bubble,
                isMe ? styles.sent : styles.received,
                isBurn && styles.burnBubble,
              ]}
            >
              <View style={isBurn && revealedId !== item.id ? styles.blurOverlay : undefined}>
                <BlinkText
                  color={isMe ? ('obsidian' as any) : ('text' as any)}
                  size="s"
                >
                  {msg.plaintext ?? (item as any).text}
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
        contentContainerStyle={styles.messageList}
      />

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Secure message..."
          placeholderTextColor={THEME.colors.textMuted}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <BlinkText color="obsidian" size="s" style={{ fontWeight: 'bold' }}>
            SEND
          </BlinkText>
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
  messageList: {
    paddingVertical: THEME.spacing.s,
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
    opacity: 0.2,
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
