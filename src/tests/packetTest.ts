import { Packet, PacketType, serializePacket, chunkPacket, reassembleToPacket } from '../services/protocol/packet';

async function runPacketTest() {
  console.log('Starting Packet Round Trip Test...');
  const packet: Packet = {
    id: 'test-uuid',
    type: PacketType.DIRECT,
    sender: 'alice-pubkey',
    recipient: 'bob-pubkey',
    payload: 'SGVsbG8=',
    nonce: 'bm9uY2U=',
    ttl: 5,
    timestamp: Date.now(),
    signature: 'sig-hex',
    hopLog: ['hop1', 'hop2'],
  };

  const serialized = serializePacket(packet);
  const chunks = chunkPacket(serialized, 182);
  const result = reassembleToPacket(chunks);

  if (JSON.stringify(result) === JSON.stringify(packet)) {
    console.log('PACKET ROUND TRIP PASS');
  } else {
    throw new Error('Packet data mismatch');
  }
}

runPacketTest().catch(console.error);
