import { encryptForPeerMAD, decryptFromPeerMAD } from '../encryption';
import { generateIdentity } from '../identity';

describe('MAD Cryptographic Red-Team', () => {
  it('should fail to decrypt with incorrect root key', async () => {
    const alice = await generateIdentity();
    const bob = await generateIdentity();

    const { ciphertext, nonce, salt, nextRoot } = await encryptForPeerMAD(
      'Secret Message',
      alice.privateKey,
      bob.publicKey
    );

    const fakeRootKey = new Uint8Array(32).fill(0);

    await expect(decryptFromPeerMAD(
      ciphertext,
      nonce,
      salt,
      bob.privateKey,
      alice.publicKey,
      fakeRootKey
    )).rejects.toThrow();
  });

  it('should be resistant to payload tampering (ChaCha20-Poly1305)', async () => {
    const alice = await generateIdentity();
    const bob = await generateIdentity();

    const { ciphertext, nonce, salt } = await encryptForPeerMAD(
      'Secure Payload',
      alice.privateKey,
      bob.publicKey
    );

    // Tamper with ciphertext (flip one bit)
    const cipherBuffer = Buffer.from(ciphertext, 'base64');
    cipherBuffer[0] ^= 1;
    const tamperedCiphertext = cipherBuffer.toString('base64');

    await expect(decryptFromPeerMAD(
      tamperedCiphertext,
      nonce,
      salt,
      bob.privateKey,
      alice.publicKey
    )).rejects.toThrow();
  });
});
