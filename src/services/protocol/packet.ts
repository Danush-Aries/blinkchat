import { v4 as uuidv4 } from 'uuid';
import { encode, decode } from 'cbor-x';

export enum PacketType {
  DIRECT = 'DIRECT',
  GROUP = 'GROUP',
  ACK = 'ACK',
  PING = 'PING',
  KEY_EXCHANGE = 'KEY_EXCHANGE',
  RELAY = 'RELAY',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  RREQ = 'RREQ',
  RREP = 'RREP',
}


export interface Packet {
  id: string; // UUID v4
  type: PacketType;
  sender: string; // Pubkey hex
  recipient: string; // Pubkey hex or 'broadcast'
  groupId?: string;
  payload: string; // Base64 encrypted content
  nonce: string; // Base64 AES-GCM nonce
  ttl: number; // 1-10
  timestamp: number; // Unix ms
  signature: string; // Ed25519 signature hex
  hopLog: string[]; // Array of pubkey hex strings
}

/**
 * Serializes a packet to a CBOR binary buffer.
 */
export function serializePacket(packet: Packet): Uint8Array {
  return encode(packet);
}

/**
 * Deserializes a CBOR binary buffer back into a Packet.
 */
export function deserializePacket(buffer: Uint8Array): Packet {
  return decode(buffer) as Packet;
}

/**
 * Splits a serialized CBOR buffer into Uint8Array chunks fitting a given MTU.
 * Defaults to 512 bytes (max typical BLE MTU).
 */
export function chunkPacket(data: Uint8Array, mtu: number = 512): Uint8Array[] {
  const chunks: Uint8Array[] = [];

  for (let i = 0; i < data.length; i += mtu) {
    chunks.push(data.slice(i, i + mtu));
  }

  return chunks;
}

/**
 * Reconstructs a full Uint8Array from a series of chunks.
 */
export function reassemblePacket(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);

  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

/**
 * Helper to convert reassembled Uint8Array back to a Packet object.
 */
export function reassembleToPacket(chunks: Uint8Array[]): Packet {
  const bytes = reassemblePacket(chunks);
  return deserializePacket(bytes);
}
