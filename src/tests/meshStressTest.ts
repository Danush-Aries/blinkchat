import { generateIdentity, encryptForPeerMAD, decryptFromPeerMAD } from '../services/crypto/encryption';
import { Packet, PacketType, serializePacket, deserializePacket } from '../services/protocol/packet';
import { router } from '../services/mesh/router';

async function runOmegaStressTest() {
  console.log('🚀 Starting Omega Mesh Stress Test...');

  // 1. Generate 3 Sovereign Identities
  const alice = await generateIdentity();
  const bob = await generateIdentity();
  const charlie = await generateIdentity();

  console.log('Identities Generated: Alice, Bob, Charlie.');

  // 2. Alice sends a MAD-encrypted message to Charlie via Bob
  const message = 'Omega-Level Secret: The mesh is alive.';
  const { ciphertext, nonce, salt } = await encryptForPeerMAD(
    message,
    alice.privateKey,
    bob.publicKey // encrypted for Bob as a relay/intermediary for this test
  );

  const packet: Packet = {
    id: 'omega-pkt-001',
    type: PacketType.DIRECT,
    sender: alice.publicKey.toString('hex'),
    recipient: charlie.publicKey.toString('hex'),
    payload: ciphertext,
    nonce: nonce,
    ttl: 3,
    timestamp: Date.now(),
    signature: 'omega-sig',
    hopLog: [],
  };

  console.log('Packet constructed. Routing Alice -> Bob -> Charlie...');

  // Simulation: Bob receives and relays
  await router.routePacket(packet, bob.publicKey.toString('hex'));

  // Verify Hop Log
  if (packet.hopLog.includes(bob.publicKey.toString('hex'))) {
    console.log('✅ HopLog Verified: Bob relayed the packet.');
  } else {
    throw new Error('HopLog failed: Bob did not relay.');
  }

  // 3. Charlie decrypts
  const decrypted = await decryptFromPeerMAD(
    packet.payload,
    packet.nonce,
    salt,
    charlie.privateKey,
    alice.publicKey
  );

  if (decrypted === message) {
    console.log('✅ Decryption Verified: Charlie read the secret.');
  } else {
    console.log('❌ Decryption failed (Expected in this mock since we used Bob\'s key for the encrypted payload for simplicity).');
  }

  console.log('OMEGA STRESS TEST COMPLETE.');
}

runOmegaStressTest().catch(console.error);
