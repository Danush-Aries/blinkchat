import { Packet, PacketType, serializePacket, chunkPacket, reassemblePacket } from '../protocol/packet';
import { GATTClient } from '../ble/gatt';
import { peerRegistry } from './peerRegistry';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'blinkchat-dtn-queue' });

class PacketCache {
  private cache: Map<string, boolean> = new Map();
  private readonly maxEntries: number = 500;

  set(id: string): boolean {
    if (this.cache.has(id)) return true;
    if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(id, true);
    return false;
  }

  has(id: string): boolean {
    return this.cache.has(id);
  }

  clear(): void {
    this.cache.clear();
  }
}

export class MeshRouter {
  private static instance: MeshRouter = new MeshRouter();
  private packetCache = new PacketCache();
  private deliverCallback: ((packet: Packet) => void) | null = null;

  private constructor() {}

  static getInstance(): MeshRouter {
    return MeshRouter.instance;
  }

  setDeliverCallback(callback: (packet: Packet) => void): void {
    this.deliverCallback = callback;
  }

  async routePacket(packet: Packet, localPubkey: string): Promise<void> {
    if (this.packetCache.set(packet.id)) return;

    const isForMe = packet.recipient === localPubkey;
    const isBroadcast = packet.recipient === 'broadcast';

    if (isForMe || isBroadcast) {
      if (this.deliverCallback) this.deliverCallback(packet);
    }

    if (isBroadcast) {
      await this.floodBroadcast(packet, localPubkey);
      return;
    }

    if (isForMe) return; // Packet reached destination

    // AODV Routing Logic
    if (packet.ttl <= 0) {
      return;
    }

    packet.ttl -= 1;
    packet.hopLog.push(localPubkey);

    if (packet.type === PacketType.RREQ) {
      await this.handleRREQ(packet, localPubkey);
    } else if (packet.type === PacketType.RREP) {
      await this.handleRREP(packet, localPubkey);
    } else {
      await this.forwardPacket(packet, localPubkey);
    }
  }

  private async handleRREQ(packet: Packet, localPubkey: string): Promise<void> {
    const destination = packet.recipient;

    // If I am the destination, send RREP
    if (destination === localPubkey) {
      await this.sendRREP(packet, localPubkey);
      return;
    }

    // If I have a valid route to the destination, send RREP
    const route = peerRegistry.getRoute(destination);
    if (route) {
      await this.sendRREP(packet, localPubkey);
      return;
    }

    // Otherwise, update route to the original sender for the return path of RREP
    // In AODV, we record the reverse path to the source
    peerRegistry.updateRoute(packet.sender, packet.sender, 1);

    // Flood the RREQ to find the destination
    await this.floodBroadcast(packet, localPubkey);
  }

  private async handleRREP(packet: Packet, localPubkey: string): Promise<void> {
    const destination = packet.payload.split(':')[0]; // Assuming payload format "dest:dist"
    const distance = parseInt(packet.payload.split(':')[1]) || 1;
    const sender = packet.sender;

    // Update routing table: to reach destination, go via sender
    peerRegistry.updateRoute(destination, sender, distance);

    // Forward RREP back towards the original requester (recipient)
    await this.forwardPacket(packet, localPubkey);
  }

  private async sendRREP(rreq: Packet, localPubkey: string): Promise<void> {
    const route = peerRegistry.getRoute(rreq.recipient);
    const distance = route ? route.distance + 1 : 1;

    const rrep: Packet = {
      id: `rrep-${rreq.id}-${localPubkey}`,
      type: PacketType.RREP,
      sender: localPubkey,
      recipient: rreq.sender,
      payload: `${rreq.recipient}:${distance}`, // Format: "destination:distance"
      nonce: rreq.nonce,
      ttl: 10,
      timestamp: Date.now(),
      signature: '', // Simplified for routing
      hopLog: [],
    };

    await this.forwardPacket(rrep, localPubkey);
  }

  private async forwardPacket(packet: Packet, localPubkey: string): Promise<void> {
    const route = peerRegistry.getRoute(packet.recipient);

    if (route) {
      const nextHop = route.nextHop;
      await this.sendToPeer(nextHop, packet);
    } else {
      // No route found, initiate Route Discovery if it's a data packet
      if (packet.type !== PacketType.RREQ && packet.type !== PacketType.RREP) {
        await this.initiateRouteDiscovery(packet, localPubkey);
      } else {
        this.addToDTNQueue(packet);
      }
    }
  }

  private async initiateRouteDiscovery(packet: Packet, localPubkey: string): Promise<void> {
    const rreq: Packet = {
      id: `rreq-${packet.id}-${localPubkey}`,
      type: PacketType.RREQ,
      sender: localPubkey,
      recipient: packet.recipient,
      payload: 'DISCOVER',
      nonce: packet.nonce,
      ttl: 10,
      timestamp: Date.now(),
      signature: '',
      hopLog: [],
    };

    await this.floodBroadcast(rreq, localPubkey);

    // Queue the original packet until route is found (handled by DTN queue logic)
    this.addToDTNQueue(packet);
  }

  private async floodBroadcast(packet: Packet, localPubkey: string): Promise<void> {
    const activePeers = peerRegistry.getActivePeers();
    await Promise.all(activePeers.map(peer => this.sendToPeer(peer.pubkey, packet)));
  }

  private async sendToPeer(peerPubkey: string, packet: Packet): Promise<void> {
    const peer = peerRegistry.getPeerByPubkey(peerPubkey);
    if (!peer) return;

    try {
      const serialized = serializePacket(packet);
      const chunks = chunkPacket(serialized);
      const fullBuffer = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        fullBuffer.set(chunk, offset);
        offset += chunk.length;
      }
      const gatt = new GATTClient();
      await gatt.connectAndSend(peer.deviceId, fullBuffer);
    } catch (e) {
      // Peer might be gone, registry will handle it on next getActivePeers
    }
  }

  private addToDTNQueue(packet: Packet): void {
    const queue = this.getDTNQueue();
    queue.push(packet);
    // Store as CBOR for consistency, but MMKV handles strings/bytes.
    // For simplicity and persistence, we use JSON here unless a binary store is available.
    storage.set('dtn_queue', JSON.stringify(queue));
  }

  private getDTNQueue(): Packet[] {
    const data = storage.getString('dtn_queue');
    return data ? JSON.parse(data) : [];
  }

  async flushQueueToPeer(peerDeviceId: string): Promise<void> {
    const queue = this.getDTNQueue();
    if (queue.length === 0) return;

    const gatt = new GATTClient();
    const remainingQueue: Packet[] = [];

    for (const packet of queue) {
      try {
        const serialized = serializePacket(packet);
        const chunks = chunkPacket(serialized);
        const fullBuffer = reassemblePacket(chunks);
        await gatt.connectAndSend(peerDeviceId, fullBuffer);
      } catch (e) {
        remainingQueue.push(packet);
      }
    }
    storage.set('dtn_queue', JSON.stringify(remainingQueue));
  }
}

export const router = MeshRouter.getInstance();
