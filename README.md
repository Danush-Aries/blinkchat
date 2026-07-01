# BlinkChat

[![Download APK](https://img.shields.io/github/v/release/Danush-Aries/blinkchat?label=Download%20APK&style=for-the-badge&logo=android&color=00ff88)](https://github.com/Danush-Aries/blinkchat/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/Danush-Aries/blinkchat/ci.yml?label=CI&style=for-the-badge)](https://github.com/Danush-Aries/blinkchat/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

**Privacy-first, serverless, post-quantum mobile messenger.** BLE mesh + optional Tor. No phone number, no email, no cloud.

---

## Install

<table>
<tr>
<td width="60%" valign="top">

### Get the APK

1. Tap the **Download APK** badge above (or open [Releases](https://github.com/Danush-Aries/blinkchat/releases/latest)).
2. Download `app-release.apk` to your Android device.
3. Enable **Install unknown apps** for your browser / file manager:
   *Settings → Apps → Special access → Install unknown apps.*
4. Open the APK and tap **Install**.
5. Grant Bluetooth + Location permissions on first launch (required for BLE mesh discovery).

### Or scan the QR

Point your phone camera at the QR on the right — it opens the latest release page directly.

### Optional: Tor routing

Install [Orbot](https://guardianproject.info/apps/org.torproject.android/) from F-Droid or Play Store, start it, and enable **Tor mode** in BlinkChat's Settings tab.

</td>
<td width="40%" valign="top" align="center">

<img src="assets/qr-install.png" alt="Scan to download BlinkChat" width="220" />

<sub>Scan → download latest APK</sub>

</td>
</tr>
</table>

---

> ### Security notice
>
> BlinkChat is **not distributed through Google Play**. The APK is signed by the developer, not by Google. Android will warn you when you sideload it — this is expected.
>
> - Verify the SHA-256 of the APK against the checksum published on each release page.
> - The app is unaudited experimental software. See [Security Notes](#security-notes) and use it accordingly.
> - Never sideload builds you did not download from this official Releases page.

---

![Platform: React Native](https://img.shields.io/badge/Platform-React%20Native-61DAFB.svg?logo=react)
![Crypto: Ed25519 + ML-KEM-768](https://img.shields.io/badge/Crypto-Ed25519%20%2B%20ML--KEM--768-blueviolet.svg)
![Network: BLE Mesh + Tor](https://img.shields.io/badge/Network-BLE%20Mesh%20%2B%20Tor-darkgreen.svg)
![No Servers](https://img.shields.io/badge/Infrastructure-Zero%20Servers-00ff88.svg)

---

## What It Does

BlinkChat lets two or more people exchange end-to-end encrypted messages without any internet infrastructure. When devices are nearby, they discover each other over BLE and route messages through an AODV mesh. When an internet connection is available, messages can optionally travel through the Tor anonymity network via Orbot.

All messages are encrypted with a hybrid post-quantum scheme: classical X25519 ECDH combined with ML-KEM-768 (Kyber) key encapsulation, ratcheted forward with the Double Ratchet algorithm so that compromising one message key reveals nothing about past or future keys.

---

## Features

- **Zero-knowledge identity** — Identity is an Ed25519 key pair generated on-device. No registration, no phone number, no email.
- **Post-quantum hybrid encryption** — Every session uses X25519 + ML-KEM-768 key exchange combined via HKDF, providing resistance to both classical and quantum adversaries.
- **Double Ratchet protocol** — Forward secrecy and break-in recovery per message, modelled after the Signal protocol.
- **BLE mesh networking** — Devices scan for and advertise to nearby peers using Bluetooth Low Energy. Messages hop through intermediate nodes (AODV routing) to reach recipients that are not directly reachable.
- **Delay-tolerant networking (DTN)** — Outbound packets that cannot be delivered immediately are queued in MMKV and flushed when a route becomes available.
- **Optional Tor routing** — When Orbot is installed, outbound traffic is tunnelled through the Tor network via a SOCKS5 proxy, providing IP anonymity for longer-range communication.
- **Tor v3 onion address** — Each identity derives a valid Tor v3 `.onion` address from its Ed25519 public key using the official SHA3-256 checksum algorithm.
- **Burn messages** — Ephemeral in-memory messages that vanish on release, leaving no trace in the database.
- **Panic wipe** — Triple-tap the BLINK logo in any chat to immediately erase all messages and identity keys.
- **Configurable TTL** — Every message has an expiry time. The database auto-purges expired messages every 60 seconds.
- **Offline-first SQLite** — Conversations persist in a local SQLite database via expo-sqlite. No cloud sync, no backups.
- **Mesh topology viewer** — A visual map of nearby peers and the mesh connections between them.
- **Key verification** — Out-of-band QR code scanning with a Short Authentication String (SAS) for trust establishment.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.81 |
| Language | TypeScript 5.9 |
| Navigation | React Navigation 7 (Stack + Bottom Tabs) |
| State | Zustand 5 |
| Crypto (classical) | `@noble/curves` (Ed25519, X25519), `@noble/hashes` (SHA-256/512/3, HKDF) |
| Crypto (post-quantum) | `mlkem` v2.7 (ML-KEM-768 / Kyber) |
| Symmetric encryption | AES-256-GCM via `react-native-quick-crypto` |
| Key storage | `react-native-mmkv` (encrypted, memory-mapped) |
| Database | `expo-sqlite` |
| BLE | `react-native-ble-plx` |
| Tor networking | `react-native-tcp-socket` + Orbot SOCKS5 proxy |
| Packet serialisation | CBOR via `cbor-x` |
| QR codes | `react-native-qrcode-svg` |

---

## Building From Source

### Prerequisites

- Node.js 18+
- React Native development environment ([official setup guide](https://reactnative.dev/docs/environment-setup))
- Android SDK (API 31+) or Xcode 15+ for iOS
- For Tor routing: [Orbot](https://guardianproject.info/apps/org.torproject.android/) installed on the device

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/Danush-Aries/blinkchat.git
cd blinkchat

# 2. Install dependencies
npm install

# 3. (iOS only) Install CocoaPods
cd ios && pod install && cd ..

# 4. Start Metro bundler
npm start

# 5. Run on Android
npm run android

# 6. Run on iOS
npm run ios
```

### Required Android Permissions

Add the following to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"
    android:usesPermissionFlags="neverForLocation" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
```

### Cutting a Signed Release

See [SIGNING.md](SIGNING.md) for the one-time keystore setup, then:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The `android-release` GitHub Actions workflow will build, sign, and attach the APK to a new Release automatically.

---

## Usage

### Sending Your First Message

```
1. Launch the app — an Ed25519 + X25519 + ML-KEM-768 identity is generated automatically.
2. Enable Bluetooth on both devices.
3. Tap the "PEERS" tab — nearby BlinkChat users appear as they are discovered over BLE.
4. Tap a peer row, then tap "Message" to open a chat.
5. Type a message and tap SEND.
   - The message is encrypted with the Double Ratchet (X25519 + ML-KEM chain).
   - It is serialised as CBOR and transmitted over BLE GATT.
   - If the recipient is not directly reachable, it is queued in the DTN outbox.
```

### Identity Management

```
1. Go to the "ID" tab.
2. Enter PIN 1234 to reveal your Hybrid Keybundle.
3. Share your QR code with peers for out-of-band key verification.
4. Enter PIN 0000 to trigger an emergency identity wipe and regenerate.
```

### Panic Wipe

Triple-tap the **BLINK** label in the top-left corner of any chat screen. A confirmation dialog appears. Confirming drops all SQLite tables and clears all MMKV keys — no forensic trace remains.

### Encryption Example

```typescript
import { generateIdentity } from './src/services/crypto/identity';
import {
  buildInitialRatchetState,
  encryptForPeerMAD,
  decryptFromPeerMAD,
} from './src/services/crypto/encryption';

// Alice generates her identity
const alice = await generateIdentity();
// Bob generates his identity
const bob = await generateIdentity();

// Alice builds a send-side Double Ratchet state aimed at Bob
const aliceState = buildInitialRatchetState(
  alice.x25519PrivateKey,
  alice.x25519PublicKey,
  bob.x25519PublicKey       // Alice needs Bob's X25519 public key
);

// Encrypt
const { ciphertext, nonce, header } = await encryptForPeerMAD(
  'Hello Bob!',
  aliceState
);

// Bob decrypts
const bobState = buildInitialRatchetState(
  bob.x25519PrivateKey,
  bob.x25519PublicKey,
  alice.x25519PublicKey
);
const plaintext = await decryptFromPeerMAD(ciphertext, nonce, header, bobState);
// => 'Hello Bob!'
```

---

## Architecture

```
BlinkChat/
├── App.tsx                    # Bootstrap: identity, BLE, DB, mode manager
├── index.ts                   # AppRegistry entry point
└── src/
    ├── services/
    │   ├── crypto/
    │   │   ├── identity.ts    # Ed25519 + X25519 + ML-KEM-768 keygen & MMKV storage
    │   │   └── encryption.ts  # Double Ratchet + AES-256-GCM
    │   ├── ble/
    │   │   ├── scanner.ts     # BLE scan, peer discovery
    │   │   ├── advertiser.ts  # BLE advertising
    │   │   └── gatt.ts        # GATT client: MTU negotiation, chunked write/notify
    │   ├── mesh/
    │   │   ├── router.ts      # AODV routing, DTN queue
    │   │   └── peerRegistry.ts
    │   ├── tor/
    │   │   ├── torManager.ts  # Orbot SOCKS5 state manager
    │   │   ├── ghostChannel.ts # TCP-over-Tor for .onion messaging
    │   │   └── onionService.ts # Tor v3 onion address derivation
    │   ├── storage/
    │   │   └── db.ts          # SQLite: messages, threads, outbox queue
    │   ├── protocol/
    │   │   └── packet.ts      # CBOR schema, chunk/reassemble
    │   ├── network/
    │   │   ├── modeManager.ts # BLE-only vs BLE+Tor switching
    │   │   └── batteryOptimizer.ts
    │   └── state/
    │       ├── burnStore.ts   # In-memory burn messages
    │       └── volatileStore.ts # Key cache with RAM zeroisation
    └── ui/
        ├── navigation/AppNavigator.tsx
        └── screens/
            ├── HomeScreen.tsx
            ├── ChatScreen.tsx         # Panic wipe, Double Ratchet send
            ├── ContactsScreen.tsx
            ├── TopologyScreen.tsx     # Mesh topology visualiser
            ├── IdentityScreen.tsx     # QR keybundle, PIN unlock
            ├── KeyVerificationScreen.tsx
            └── SettingsScreen.tsx
```

---

## Security Notes

- **Key material never leaves the device.** Private keys are stored in MMKV with no cloud sync.
- **Forward secrecy.** The Double Ratchet advances a new key for every message. Compromising one key does not expose past messages.
- **Post-quantum resistance.** ML-KEM-768 provides IND-CCA2 security against quantum adversaries (NIST FIPS 203).
- **No clearnet leaks.** `TorManager` does not make any clearnet HTTP requests; all connectivity checks use Orbot.
- **Memory zeroisation.** `VolatileStore.shredKey()` overwrites key bytes with random noise before deleting the reference.
- **Tor v3 compliance.** Onion addresses are derived using the official SHA3-256 checksum algorithm as specified in the Tor Rendezvous Specification v3.

---

## Contributing

Pull requests are welcome. Please open an issue first to discuss what you would like to change.

```bash
npm run typecheck   # TypeScript type-check
npm test            # Run Jest test suite
```

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

*BlinkChat is an experimental privacy tool. Use it responsibly and in accordance with local laws. No warranty is provided.*
