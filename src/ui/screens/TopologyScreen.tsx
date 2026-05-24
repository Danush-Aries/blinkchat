import React from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { THEME } from '../../theme';
import { BlinkText } from '../components/BlinkText';

interface PeerNode {
  id: string;
  pubkey: string;
  strength: number; // 0 to 1
  x: number;
  y: number;
  isMe?: boolean;
  status: 'direct' | 'relayed' | 'offline';
}

export default function TopologyScreen() {
  const { width, height } = Dimensions.get('window');

  // Mock topology data - in production this would come from peerRegistry
  const peers: PeerNode[] = [
    { id: 'me', pubkey: 'SELF', strength: 1, x: width / 2 - 25, y: height / 2 - 25, isMe: true, status: 'direct' },
    { id: 'p1', pubkey: '0x123...f4a2', strength: 0.8, x: 80, y: 150, status: 'direct' },
    { id: 'p2', pubkey: '0x456...b8c1', strength: 0.4, x: 220, y: 100, status: 'relayed' },
    { id: 'p3', pubkey: '0x789...e9d0', strength: 0.6, x: 120, y: 350, status: 'relayed' },
    { id: 'p4', pubkey: '0xabc...a1b2', strength: 0.2, x: 280, y: 400, status: 'offline' },
  ];

  const getNodeColor = (status: PeerNode['status'], isMe?: boolean) => {
    if (isMe) return THEME.colors.neonMint;
    switch (status) {
      case 'direct': return THEME.colors.neonMint;
      case 'relayed': return '#FFD700'; // Gold/Yellow for relayed
      case 'offline': return THEME.colors.steelGrey;
      default: return THEME.colors.steelGrey;
    }
  };

  return (
    <View style={styles.container}>
      <BlinkText size="l" style={styles.title}>Mesh Topology</BlinkText>

      <View style={styles.map}>
        {/* Connection Lines */}
        {peers.filter(p => !p.isMe && p.status !== 'offline').map(peer => {
          const dx = peer.x - (width / 2);
          const dy = peer.y - (height / 2);
          const distance = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);

          return (
            <View
              key={`link-${peer.id}`}
              style={[
                styles.connectionLine,
                {
                  left: width / 2,
                  top: height / 2,
                  width: distance,
                  transform: [{ rotate: `${angle}deg` }],
                  opacity: peer.strength * 0.6,
                  backgroundColor: peer.status === 'direct' ? THEME.colors.neonMint : THEME.colors.accent,
                }
              ]}
            />
          );
        })}

        {peers.map((peer) => (
          <TouchableOpacity
            key={peer.id}
            style={[
              styles.node,
              {
                left: peer.x,
                top: peer.y,
                backgroundColor: peer.isMe ? THEME.colors.neonMint : THEME.colors.obsidian,
                borderColor: getNodeColor(peer.status, peer.isMe),
                borderWidth: peer.isMe ? 0 : 2,
                shadowColor: getNodeColor(peer.status, peer.isMe),
                shadowOpacity: peer.isMe ? 0.8 : 0.3,
                shadowRadius: 10,
                elevation: 5,
              }
            ]}
          >
            <View style={styles.signalContainer}>
              {[1, 2, 3, 4].map(bar => (
                <View
                  key={bar}
                  style={[
                    styles.signalBar,
                    {
                      height: bar * 3,
                      backgroundColor: bar <= peer.strength * 4 ? getNodeColor(peer.status, peer.isMe) : THEME.colors.border
                    }
                  ]}
                />
              ))}
            </View>
            <BlinkText
              size="xs"
              style={[styles.nodeText, { color: peer.isMe ? THEME.colors.obsidian : THEME.colors.text }]}
            >
              {peer.isMe ? 'YOU' : peer.pubkey.substring(0, 6)}
            </BlinkText>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: THEME.colors.neonMint }]} />
          <BlinkText color="textMuted" size="xs">Direct</BlinkText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FFD700' }]} />
          <BlinkText color="textMuted" size="xs">Relayed</BlinkText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: THEME.colors.steelGrey }]} />
          <BlinkText color="textMuted" size="xs">Offline</BlinkText>
        </View>
      </View>

      <BlinkText color="textMuted" size="xs" style={styles.footer}>
        Secure BLE Mesh Lattice • Proximity based signal mapping
      </BlinkText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.obsidian,
    padding: THEME.spacing.m,
  },
  title: {
    textAlign: 'center',
    marginBottom: THEME.spacing.l,
    color: THEME.colors.text,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  map: {
    flex: 1,
    backgroundColor: '#0C0C14',
    borderRadius: THEME.borderRadius.l,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  node: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  signalContainer: {
    position: 'absolute',
    top: -22,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  signalBar: {
    width: 2,
    borderRadius: 1,
  },
  nodeText: {
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  connectionLine: {
    position: 'absolute',
    height: 1,
    zIndex: 1,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: THEME.spacing.xl,
    marginTop: THEME.spacing.l,
    marginBottom: THEME.spacing.s,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.s,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
  },
  footer: {
    textAlign: 'center',
    marginTop: THEME.spacing.s,
    fontStyle: 'italic',
  },
});
