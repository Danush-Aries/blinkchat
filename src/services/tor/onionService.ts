import { sha3_256 } from '@noble/hashes/sha3';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'blinkchat-onion' });

/**
 * Derives a Tor v3 onion address from an Ed25519 public key.
 *
 * Tor v3 format (rfc4648 base32, lowercase, no padding, + ".onion"):
 *   address  = base32( pubkey || checksum || version ) + ".onion"
 *   checksum = sha3_256(".onion checksum" || pubkey || version)[0:2]
 *   version  = 0x03 (1 byte)
 *   total    = 32 + 2 + 1 = 35 bytes → 56 base32 chars
 *
 * Reference: https://spec.torproject.org/rend-spec-v3
 */
export async function deriveOnionAddress(pubKey: Uint8Array): Promise<string> {
  const VERSION = 0x03;
  const prefix = new TextEncoder().encode('.onion checksum');

  // Build the checksum input: ".onion checksum" || pubkey || version
  const checksumInput = new Uint8Array(prefix.length + pubKey.length + 1);
  checksumInput.set(prefix, 0);
  checksumInput.set(pubKey, prefix.length);
  checksumInput[prefix.length + pubKey.length] = VERSION;

  const checksum = sha3_256(checksumInput).slice(0, 2);

  // Build the address bytes: pubkey (32) || checksum (2) || version (1)
  const addressBytes = new Uint8Array(35);
  addressBytes.set(pubKey.slice(0, 32), 0);
  addressBytes.set(checksum, 32);
  addressBytes[34] = VERSION;

  return base32Encode(addressBytes).toLowerCase() + '.onion';
}

/**
 * RFC 4648 Base32 encoding (A-Z2-7 alphabet, no padding).
 */
function base32Encode(data: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  let bits = 0;
  let value = 0;

  for (const byte of data) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += alphabet[(value >> bits) & 0x1f];
    }
  }

  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 0x1f];
  }

  return result;
}

export function saveOnionAddress(address: string): void {
  storage.set('onion_address', address);
}

export function loadOnionAddress(): string | null {
  return storage.getString('onion_address') ?? null;
}

/**
 * Attach an onion address to an outbound advertisement payload.
 */
export function advertiseOnion(address: string, payload: Record<string, unknown>): void {
  payload.onion = address;
}
