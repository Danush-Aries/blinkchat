import { generateIdentity, encryptForPeer, decryptFromPeer } from '../services/crypto/encryption';
import { signPacket, verifyPacket } from '../services/crypto/identity';

async function runCryptoTest() {
  console.log('Starting Crypto Round Trip Test...');
  const alice = await generateIdentity();
  const bob = await generateIdentity();
  const msg = 'hello blinkchat';

  const { ciphertext, nonce, salt } = await encryptForPeer(msg, alice.privateKey, bob.publicKey);
  const decrypted = await decryptFromPeer(ciphertext, nonce, salt, bob.privateKey, alice.publicKey);

  if (decrypted === msg) {
    console.log('CRYPTO ROUND TRIP PASS');
  } else {
    throw new Error(`Decryption failed. Got: ${decrypted}`);
  }
}

runCryptoTest().catch(console.error);
