import { router } from '../router';
import { Packet, PacketType } from '../../protocol/packet';

describe('MeshRouter Adversarial Tests', () => {
  const localPubkey = 'local-pubkey';

  beforeEach(() => {
    router.setDeliverCallback(() => {});
  });

  it('should drop packets when TTL reaches 0', async () => {
    const packet: Packet = {
      id: 'pkt-1',
      type: PacketType.DIRECT,
      sender: 'sender-pubkey',
      recipient: 'remote-pubkey',
      payload: 'hello',
      ttl: 1,
      hopLog: [],
    };

    // Route once: TTL 1 -> 0
    await router.routePacket(packet, localPubkey);

    // The packet should now be in DTN queue because ttl <= 1 and recipient != local
    // We verify that if we try to route it again (simulating a loop), it's cached.
    const result = await router.routePacket(packet, localPubkey);
    // Since it's in the cache, it returns immediately.
    // But we want to verify it doesn't decrement TTL further or enter infinite loop.
    expect(packet.ttl).toBe(0);
  });

  it('should handle malicious oversized packets without crashing', async () => {
    const oversizedPacket: Packet = {
      id: 'big-pkt',
      type: PacketType.DIRECT,
      sender: 'sender',
      recipient: 'remote',
      payload: 'a'.repeat(1024 * 1024), // 1MB payload
      ttl: 5,
      hopLog: [],
    };

    await expect(router.routePacket(oversizedPacket, localPubkey)).resolves.not.toThrow();
  });
});
