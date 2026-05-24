import { x25519, ed25519 } from '@noble/curves/ed25519';
import { hkdf } from '@noble/hashes/hkdf';
import { sha512 } from '@noble/hashes/sha2';
import crypto from 'react-native-quick-crypto';
import * as mlkem from 'mlkem';

const INFO_STRING = 'blinkchat-mad-v2';

/**
 * Double Ratchet State
 */
interface RatchetState {
  rootKey: Uint8Array;
  sendChainKey: Uint8Array;
  recvChainKey: Uint8Array;
  remotePubKey: Uint8Array;
  localKeyPair: { privateKey: Uint8Array; publicKey: Uint8Array };
  previousChainLength: number;
  messageNumbers: Map<number, boolean>;
}

/**
 * KDF for the Double Ratchet
 */
function kdf(key: Uint8Array, input: Uint8Array): { nextKey: Uint8Array; chainKey: Uint8Array } {
  const info = new TextEncoder().encode(INFO_STRING);
  const concatInfo = new Uint8Array(info.length + input.length);
  concatInfo.set(info);
  concatInfo.set(input, info.length);
  const result = hkdf(sha512, key, new Uint8Array(0), concatInfo, 64);
  return {
    nextKey: result.slice(0, 32),
    chainKey: result.slice(32, 64),
  };
}

/**
 * MAD Protocol: Hybrid Post-Quantum Key Derivation
 * Combines X25519 and ML-KEM (Kyber)
 */
async function deriveMADKey(
  x25519Secret: Uint8Array,
  kyberSecret: Uint8Array,
  salt: Uint8Array
): Promise<Uint8Array> {
  const combinedSecret = new Uint8Array(x25519Secret.length + kyberSecret.length);
  combinedSecret.set(x25519Secret);
  combinedSecret.set(kyberSecret, x25519Secret.length);
  return hkdf(sha512, combinedSecret, salt, new TextEncoder().encode(INFO_STRING), 32);
}

/**
 * AES-256-GCM Implementation
 * Mandatory for high-security payloads
 */
function encryptAESGCM(plaintext: string, key: Uint8Array): { ciphertext: string, nonce: string } {
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);

  const encData = cipher.update(plaintext, 'utf8') as any;
  const finData = cipher.final() as any;
  const encBytes = typeof encData === 'string' ? new TextEncoder().encode(encData) : new Uint8Array(encData);
  const finBytes = typeof finData === 'string' ? new TextEncoder().encode(finData) : new Uint8Array(finData);
  const combined = new Uint8Array(encBytes.length + finBytes.length);
  combined.set(encBytes);
  combined.set(finBytes, encBytes.length);
  const tag = cipher.getAuthTag();
  const fullCiphertext = Buffer.concat([combined, new Uint8Array(tag)]) as unknown as Buffer;

  return {
    ciphertext: fullCiphertext.toString('base64'),
    nonce: nonce.toString('base64'),
  };
}

function decryptAESGCM(ciphertextB64: string, nonceB64: string, key: Uint8Array): string {
  const ciphertextFull = Buffer.from(ciphertextB64, 'base64');
  const nonce = Buffer.from(nonceB64, 'base64');
  const tag = ciphertextFull.slice(-16);
  const encrypted = ciphertextFull.slice(0, -16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAuthTag(tag as any);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Double Ratchet: Symmetric Chain Ratchet
 */
function ratchetChain(chainKey: Uint8Array): { nextChainKey: Uint8Array, messageKey: Uint8Array } {
  const result = hkdf(sha512, chainKey, new Uint8Array(0), new TextEncoder().encode('msg-key'), 64);
  return {
    nextChainKey: result.slice(0, 32),
    messageKey: result.slice(32, 64),
  };
}

export async function initializeRatchet(
  senderPrivKey: Uint8Array,
  recipientPubKey: Uint8Array,
  recipientMlKemPubKey: Uint8Array
): Promise<{ rootKey: Uint8Array, ephemeralPubKey: Uint8Array, ciphertext: Uint8Array }> {
  // 1. Classical X25519 Secret
  const xSecret = x25519.getSharedSecret(senderPrivKey, recipientPubKey);

  // 2. Post-Quantum ML-KEM Encapsulation
  const result = mlkem.encapsulate(recipientMlKemPubKey);
  const qSecret = result.sharedSecret;
  const ct = result.ciphertext;

  // 3. Hybrid Root Key
  const salt = crypto.randomBytes(32);
  const rootKey = await deriveMADKey(xSecret, qSecret, salt);

  // Generate ephemeral key for first DH ratchet step
  const ephPriv = (ed25519.utils as any).randomPrivateKey() as Uint8Array;
  const ephPub = x25519.getPublicKey(ephPriv);

  return { rootKey, ephemeralPubKey: ephPub, ciphertext: new Uint8Array(ct) };
}

export async function encryptForPeerMAD(
  message: string,
  state: RatchetState
): Promise<{ ciphertext: string, nonce: string, header: { dhPub: Uint8Array, n: number } }> {
  // Symmetric Ratchet
  const { nextChainKey, messageKey } = ratchetChain(state.sendChainKey);
  state.sendChainKey = nextChainKey;

  const { ciphertext, nonce } = encryptAESGCM(message, messageKey);

  return {
    ciphertext,
    nonce,
    header: {
      dhPub: state.localKeyPair.publicKey,
      n: state.previousChainLength // Simplified for this implementation
    }
  };
}

export async function decryptFromPeerMAD(
  ciphertext: string,
  nonce: string,
  header: { dhPub: Uint8Array, n: number },
  state: RatchetState
): Promise<string> {
  // DH Ratchet check
  if (Buffer.compare(header.dhPub, state.remotePubKey) !== 0) {
    // Perform DH ratchet step
    const dhSecret = x25519.getSharedSecret(state.localKeyPair.privateKey, header.dhPub);
    const { nextKey, chainKey } = kdf(state.rootKey, dhSecret);
    state.rootKey = nextKey;
    state.recvChainKey = chainKey;
    state.remotePubKey = header.dhPub;
  }

  // Symmetric Ratchet
  const { nextChainKey, messageKey } = ratchetChain(state.recvChainKey);
  state.recvChainKey = nextChainKey;

  return decryptAESGCM(ciphertext, nonce, messageKey);
}
