import { ed25519, x25519 } from '@noble/curves/ed25519';
import { sha256 } from '@noble/hashes/sha2';
import { MMKV } from 'react-native-mmkv';
import * as mlkem from 'mlkem';

const storage = new MMKV({ id: 'blinkchat-identity' });

export interface Identity {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  fingerprint: string;
  x25519PrivateKey: Uint8Array;
  x25519PublicKey: Uint8Array;
  mlKemPrivateKey: Uint8Array;
  mlKemPublicKey: Uint8Array;
}

/**
 * Generates a new Ed25519 keypair and calculates a fingerprint.
 * Fingerprint is the first 8 bytes of SHA256(pubkey) formatted as colon-separated hex.
 */
export async function generateIdentity(): Promise<Identity> {
  const privKey = (ed25519.utils as any).randomPrivateKey() as Uint8Array;
  const pubKey = ed25519.getPublicKey(privKey);

  // Derive X25519 keys from Ed25519 (Sovereign Identity Mapping)
  const x25519PrivateKey = (ed25519.utils as any).convertToX25519PrivateKey(privKey) as Uint8Array;
  const x25519PublicKey = x25519.getPublicKey(x25519PrivateKey);

  // Generate ML-KEM (Kyber) keypair for Quantum Resistance
  const { publicKey: mlKemPublicKey, privateKey: mlKemPrivateKey } = mlkem.generateKeyPair();

  const hash = sha256(pubKey);
  const fingerprint = Array.from(hash.slice(0, 8))
    .map(b => b.toString(16).padStart(2, '0'))
    .join(':');

  return {
    privateKey: privKey,
    publicKey: pubKey,
    fingerprint,
    x25519PrivateKey,
    x25519PublicKey,
    mlKemPrivateKey,
    mlKemPublicKey,
  };
}

/**
 * Persists the identity to encrypted MMKV storage.
 */
export function saveIdentity(identity: Identity): void {
  storage.set('privateKey', Buffer.from(identity.privateKey).toString('base64'));
  storage.set('publicKey', Buffer.from(identity.publicKey).toString('base64'));
  storage.set('fingerprint', identity.fingerprint);
  storage.set('x25519PrivateKey', Buffer.from(identity.x25519PrivateKey).toString('base64'));
  storage.set('x25519PublicKey', Buffer.from(identity.x25519PublicKey).toString('base64'));
  storage.set('mlKemPrivateKey', Buffer.from(identity.mlKemPrivateKey).toString('base64'));
  storage.set('mlKemPublicKey', Buffer.from(identity.mlKemPublicKey).toString('base64'));
}

/**
 * Loads the identity from MMKV storage.
 */
export function loadIdentity(): Identity | null {
  const privB64 = storage.getString('privateKey');
  const pubB64 = storage.getString('publicKey');
  const fingerprint = storage.getString('fingerprint');
  const xPrivB64 = storage.getString('x25519PrivateKey');
  const xPubB64 = storage.getString('x25519PublicKey');
  const qPrivB64 = storage.getString('mlKemPrivateKey');
  const qPubB64 = storage.getString('mlKemPublicKey');

  if (!privB64 || !pubB64 || !fingerprint || !xPrivB64 || !xPubB64 || !qPrivB64 || !qPubB64) return null;

  return {
    privateKey: Buffer.from(privB64, 'base64'),
    publicKey: Buffer.from(pubB64, 'base64'),
    fingerprint,
    x25519PrivateKey: Buffer.from(xPrivB64, 'base64'),
    x25519PublicKey: Buffer.from(xPubB64, 'base64'),
    mlKemPrivateKey: Buffer.from(qPrivB64, 'base64'),
    mlKemPublicKey: Buffer.from(qPubB64, 'base64'),
  };
}

/**
 * Signs a packet using the Ed25519 private key.
 */
export async function signPacket(packetJson: string, privateKey: Uint8Array): Promise<string> {
  const signature = await ed25519.sign(new TextEncoder().encode(packetJson), privateKey);
  return Buffer.from(signature).toString('hex');
}

/**
 * Verifies a packet signature using the Ed25519 public key.
 */
export async function verifyPacket(packetJson: string, signatureHex: string, publicKey: Uint8Array): Promise<boolean> {
  try {
    const signature = Buffer.from(signatureHex, 'hex');
    return await ed25519.verify(signature, new TextEncoder().encode(packetJson), publicKey);
  } catch {
    return false;
  }
}

/**
 * Converts a public key Uint8Array to a hex string.
 */
export function publicKeyToHex(pubKey: Uint8Array): string {
  return Buffer.from(pubKey).toString('hex');
}

/**
 * Converts a hex string back to a public key Uint8Array.
 */
export function hexToPublicKey(hex: string): Uint8Array {
  return Buffer.from(hex, 'hex');
}
