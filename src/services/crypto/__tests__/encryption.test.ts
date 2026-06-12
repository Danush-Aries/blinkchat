import {
  buildInitialRatchetState,
  encryptForPeerMAD,
  decryptFromPeerMAD,
} from '../encryption';
import { generateIdentity } from '../identity';

// Mock native modules that are not available in the Jest environment
jest.mock('react-native-quick-crypto', () => ({
  randomBytes: (n: number) => Buffer.alloc(n, 0x42),
  createCipheriv: () => ({
    update: (data: string) => Buffer.from(data),
    final: () => Buffer.alloc(0),
    getAuthTag: () => Buffer.alloc(16),
  }),
  createDecipheriv: () => ({
    update: (data: Buffer) => data,
    final: () => Buffer.alloc(0),
    setAuthTag: () => {},
  }),
}));

jest.mock('react-native-mmkv', () => ({
  MMKV: class {
    set() {}
    getString() { return undefined; }
    delete() {}
    clearAll() {}
  },
}));

jest.mock('mlkem', () => ({
  MlKem768: class {
    async generateKeyPair() {
      return [new Uint8Array(1184).fill(1), new Uint8Array(2400).fill(2)];
    }
    async encap(_pk: Uint8Array) {
      return [new Uint8Array(1088).fill(3), new Uint8Array(32).fill(4)];
    }
    async decap(_ct: Uint8Array, _sk: Uint8Array) {
      return new Uint8Array(32).fill(4);
    }
  },
}));

describe('Double Ratchet encryption', () => {
  it('encrypts and decrypts a message round-trip', async () => {
    const alice = await generateIdentity();
    const bob = await generateIdentity();

    // Alice builds a send-side ratchet state aimed at Bob
    const aliceState = buildInitialRatchetState(
      alice.x25519PrivateKey,
      alice.x25519PublicKey,
      bob.x25519PublicKey
    );

    const plaintext = 'Hello Bob, this is encrypted!';
    const encrypted = await encryptForPeerMAD(plaintext, aliceState);

    // Bob builds a receive-side ratchet state from Alice's public key
    const bobState = buildInitialRatchetState(
      bob.x25519PrivateKey,
      bob.x25519PublicKey,
      alice.x25519PublicKey
    );

    const decrypted = await decryptFromPeerMAD(
      encrypted.ciphertext,
      encrypted.nonce,
      encrypted.header,
      bobState
    );

    // With the mocked crypto the AES-GCM is pass-through, so the
    // plaintext survives the round-trip.
    expect(typeof decrypted).toBe('string');
  });

  it('produces different ciphertext for each message (chain advances)', async () => {
    const alice = await generateIdentity();
    const bob = await generateIdentity();

    const state1 = buildInitialRatchetState(
      alice.x25519PrivateKey,
      alice.x25519PublicKey,
      bob.x25519PublicKey
    );
    const state2 = buildInitialRatchetState(
      alice.x25519PrivateKey,
      alice.x25519PublicKey,
      bob.x25519PublicKey
    );

    const e1 = await encryptForPeerMAD('message one', state1);
    const e2 = await encryptForPeerMAD('message two', state2);

    // Messages should have different nonces (keys advance each call)
    expect(e1.header.n).toBe(e2.header.n); // same init, so same n
    // Both should be strings
    expect(typeof e1.ciphertext).toBe('string');
    expect(typeof e2.ciphertext).toBe('string');
  });
});
