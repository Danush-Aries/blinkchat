import { create } from 'zustand';
import { BLEPeer } from '../ble/scanner';

export class PeerRegistry {
  private peers: Map<string, BLEPeer> = new Map();
  private rssiHistory: Map<string, number[]> = new Map();
  private routingTable: Map<string, { nextHop: string, distance: number, lastUpdated: number }> = new Map();

  static instance: PeerRegistry = new PeerRegistry();

  private constructor() {}

  addPeer(peer: BLEPeer): void {
    this.peers.set(peer.pubkey, peer);

    const history = this.rssiHistory.get(peer.pubkey) || [];
    history.push(peer.rssi);
    if (history.length > 5) history.shift();
    this.rssiHistory.set(peer.pubkey, history);
  }

  updateRoute(destination: string, nextHop: string, distance: number): void {
    const current = this.routingTable.get(destination);
    if (!current || distance < current.distance) {
      this.routingTable.set(destination, {
        nextHop,
        distance,
        lastUpdated: Date.now(),
      });
    }
  }

  getRoute(destination: string): { nextHop: string, distance: number } | undefined {
    return this.routingTable.get(destination);
  }

  removePeer(pubkey: string): void {
    this.peers.delete(pubkey);
    this.rssiHistory.delete(pubkey);

    // Remove routes that use this peer as next hop
    for (const [dest, route] of this.routingTable.entries()) {
      if (route.nextHop === pubkey) {
        this.routingTable.delete(dest);
      }
    }
  }

  getActivePeers(): BLEPeer[] {
    const now = Date.now();
    const activePeers = Array.from(this.peers.values()).filter(peer => {
      const isAlive = (now - peer.lastSeen) < 30000;
      if (!isAlive) this.removePeer(peer.pubkey);
      return isAlive;
    });
    return activePeers;
  }

  getPeerByPubkey(pubkey: string): BLEPeer | undefined {
    return this.peers.get(pubkey);
  }

  getAverageRSSI(pubkey: string): number {
    const history = this.rssiHistory.get(pubkey) || [];
    if (history.length === 0) return -100;
    return Math.round(history.reduce((a, b) => a + b, 0) / history.length);
  }
}

export const peerRegistry = PeerRegistry.instance;

export const usePeerRegistry = create< {
  peers: BLEPeer[];
  updatePeers: () => void;
} >((set) => ({
  peers: [],
  updatePeers: () => set({ peers: peerRegistry.getActivePeers() }),
}));
