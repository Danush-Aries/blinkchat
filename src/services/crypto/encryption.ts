import { x25519, ed25519 } from '@noble/curves/ed25519';
import { hkdf } from '@noble/hashes/hkdf';
import { sha512 } from '@noble/hashes/sha2';
import crypto from 'react-native-quick-crypto';
import { MlKem768 } from 'mlkem';

const INFO_STRING = 'blinkchat-mad-v2';

/**
 * Double Ratchet State
 */
export interface RatchetState {
  rootKey: Uint8Array;
  sendChainKey: Uint8Array;
  recvChainKey: Uint8Array;
  remotePubKey: Uint8Array;
  localKeyPair: { privateKey: Uint8Array; publicKey: Uint8Array };
  previousChainLength: number;
  messageNumbers: Map<number, boolean>;
}

/**
 * KDF for the Double Ratchet root ratchet step.
 */
function kdf(
  key: Uint8Array,
  input: Uint8Array
): { nextKey: Uint8Array; chainKey: Uint8Array } {
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
 * MAD Protocol: Hybrid Post-Quantum Key Derivation.
 * Combines X25519 ECDH and ML-KEM shared secrets via HKDF.
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
 * AES-256-GCM Encryption.
 */
function encryptAESGCM(
  plaintext: string,
  key: Uint8Array
): { ciphertext: string; nonce: string } {
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce) as any;

  const encData = cipher.update(plaintext, 'utf8');
  const finData = cipher.final();

  const encBytes =
    typeof encData === 'string'
      ? Buffer.from(encData, 'binary')
      : Buffer.from(encData);
  const finBytes =
    typeof finData === 'string'
      ? Buffer.from(finData, 'binary')
      : Buffer.from(finData);

  const combined = Buffer.concat([encBytes, finBytes]);
  const tag = cipher.getAuthTag();
  const fullCiphertext = Buffer.concat([combined, Buffer.from(tag)]);

  return {
    ciphertext: fullCiphertext.toString('base64'),
    nonce: Buffer.from(nonce).toString('base64'),
  };
}

/**
 * AES-256-GCM Decryption.
 */
function decryptAESGCM(
  ciphertextB64: string,
  nonceB64: string,
  key: Uint8Array
): string {
  const ciphertextFull = Buffer.from(ciphertextB64, 'base64');
  const nonce = Buffer.from(nonceB64, 'base64');
  const tag = ciphertextFull.slice(-16);
  const encrypted = ciphertextFull.slice(0, -16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce) as any;
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Double Ratchet: Symmetric Chain Ratchet step.
 */
function ratchetChain(
  chainKey: Uint8Array
): { nextChainKey: Uint8Array; messageKey: Uint8Array } {
  const result = hkdf(
    sha512,
    chainKey,
    new Uint8Array(0),
    new TextEncoder().encode('msg-key'),
    64
  );
  return {
    nextChainKey: result.slice(0, 32),
    messageKey: result.slice(32, 64),
  };
}

/**
 * Initialise a Double Ratchet session with hybrid PQ key exchange.
 * Returns the root key, the ephemeral DH public key for the first ratchet step,
 * and the ML-KEM ciphertext that the recipient must decapsulate.
 */
export async function initializeRatchet(
  senderX25519PrivKey: Uint8Array,
  recipientX25519PubKey: Uint8Array,
  recipientMlKemPubKey: Uint8Array
): Promise<{
  rootKey: Uint8Array;
  ephemeralPubKey: Uint8Array;
  mlKemCiphertext: Uint8Array;
}> {
  // 1. Classical X25519 ECDH
  const xSecret = x25519.getSharedSecret(senderX25519PrivKey, recipientX25519PubKey);

  // 2. Post-Quantum ML-KEM-768 Encapsulation
  const kemInstance = new MlKem768();
  const [mlKemCiphertext, qSecret] = await kemInstance.encap(recipientMlKemPubKey);

  // 3. Hybrid Root Key via HKDF
  const salt = crypto.randomBytes(32);
  const rootKey = await deriveMADKey(xSecret, qSecret, Buffer.from(salt));

  // 4. Generate ephemeral X25519 key for the first DH ratchet step
  const ephPriv = ed25519.utils.randomPrivateKey().slice(0, 32);
  const ephPub = x25519.getPublicKey(ephPriv);

  return {
    rootKey,
    ephemeralPubKey: ephPub,
    mlKemCiphertext: new Uint8Array(mlKemCiphertext),
  };
}

/**
 * Decapsulate ML-KEM ciphertext on the receiver side to recover the shared secret.
 */
export async function decapsulateRatchet(
  mlKemCiphertext: Uint8Array,
  recipientMlKemPrivKey: Uint8Array,
  x25519Secret: Uint8Array,
  salt: Uint8Array
): Promise<Uint8Array> {
  const kemInstance = new MlKem768();
  const qSecret = await kemInstance.decap(mlKemCiphertext, recipientMlKemPrivKey);
  return deriveMADKey(x25519Secret, qSecret, salt);
}

/**
 * Build an initial RatchetState from a known root key and a peer's X25519 public key.
 * Used when both parties have agreed on a root key (e.g., after initializeRatchet).
 */
export function buildInitialRatchetState(
  rootKey: Uint8Array,
  localX25519PrivKey: Uint8Array,
  localX25519PubKey: Uint8Array,
  remotePubKey: Uint8Array
): RatchetState {
  // Derive the initial send chain key from the first DH ratchet step
  const dhSecret = x25519.getSharedSecret(localX25519PrivKey, remotePubKey);
  const { nextKey, chainKey } = kdf(rootKey, dhSecret);

  return {
    rootKey: nextKey,
    sendChainKey: chainKey,
    recvChainKey: chainKey,
    remotePubKey,
    localKeyPair: {
      privateKey: localX25519PrivKey,
      publicKey: localX25519PubKey,
    },
    previousChainLength: 0,
    messageNumbers: new Map(),
  };
}

/**
 * Encrypt a message using the Double Ratchet send chain.
 */
export async function encryptForPeerMAD(
  message: string,
  state: RatchetState
): Promise<{
  ciphertext: string;
  nonce: string;
  header: { dhPub: string; n: number };
}> {
  const { nextChainKey, messageKey } = ratchetChain(state.sendChainKey);
  state.sendChainKey = nextChainKey;

  const { ciphertext, nonce } = encryptAESGCM(message, messageKey);

  return {
    ciphertext,
    nonce,
    header: {
      dhPub: Buffer.from(state.localKeyPair.publicKey).toString('hex'),
      n: state.previousChainLength,
    },
  };
}

/**
 * Decrypt a message using the Double Ratchet receive chain.
 * Performs a DH ratchet step if the sender has rotated their key.
 */
export async function decryptFromPeerMAD(
  ciphertext: string,
  nonce: string,
  header: { dhPub: string; n: number },
  state: RatchetState
): Promise<string> {
  const headerPubKey = Buffer.from(header.dhPub, 'hex');

  // Perform DH ratchet step if sender key has rotated
  if (Buffer.compare(headerPubKey, state.remotePubKey) !== 0) {
    const dhSecret = x25519.getSharedSecret(
      state.localKeyPair.privateKey,
      headerPubKey
    );
    const { nextKey, chainKey } = kdf(state.rootKey, dhSecret);
    state.rootKey = nextKey;
    state.recvChainKey = chainKey;
    state.remotePubKey = headerPubKey;
  }

  const { nextChainKey, messageKey } = ratchetChain(state.recvChainKey);
  state.recvChainKey = nextChainKey;

  return decryptAESGCM(ciphertext, nonce, messageKey);
}
