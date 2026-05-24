import { sha256 } from '@noble/hashes/sha2';
import { loadIdentity, saveIdentity } from '../crypto/identity';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'blinkchat-onion' });

export async function deriveOnionAddress(pubKey: Uint8Array): Promise<string> {
  // Simplified Tor v3 derivation for scaffold
  const hash = sha256(pubKey);
  const address = Buffer.from(hash).toString('hex').substring(0, 56) + '.onion';
  return address;
}

export function saveOnionAddress(address: string) {
  storage.set('onion_address', address);
}

export function loadOnionAddress(): string | null {
  return storage.getString('onion_address') ?? null;
}

export function advertiseOnion(address: string, payload: any) {
  payload.onion = address;
}
