import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/ui/navigation/AppNavigator';
import {
  generateIdentity,
  saveIdentity,
  loadIdentity,
  publicKeyToHex,
} from './src/services/crypto/identity';
import { deriveOnionAddress, saveOnionAddress } from './src/services/tor/onionService';
import { modeManager } from './src/services/network/modeManager';
import { db } from './src/services/storage/db';
import { BLEScanner } from './src/services/ble/scanner';
import { BLEAdvertiser } from './src/services/ble/advertiser';
import { batteryOptimizer } from './src/services/network/batteryOptimizer';
import { peerRegistry } from './src/services/mesh/peerRegistry';

export default function App() {
  const [ready, setReady] = React.useState(false);
  const [initError, setInitError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let scanner: BLEScanner | null = null;

    async function initApp() {
      try {
        // 1. Identity Sovereignty — generate or restore from MMKV
        let identity = loadIdentity();
        if (!identity) {
          identity = await generateIdentity();
          saveIdentity(identity);
        }

        // 2. Derive Tor v3 onion address from Ed25519 identity key
        const onion = await deriveOnionAddress(identity.publicKey);
        saveOnionAddress(onion);

        // 3. Database initialisation
        await db.init();

        // 4. Start network mode manager (BLE-only or BLE + Tor)
        modeManager.start();

        // 5. BLE Mesh Activation
        scanner = new BLEScanner();
        const advertiser = new BLEAdvertiser();

        batteryOptimizer.init(scanner);

        // Advertise our identity over BLE
        await advertiser.startAdvertising(
          publicKeyToHex(identity.publicKey),
          'BlinkUser'
        );

        // Scan for nearby peers and populate the peer registry
        await scanner.startScan((peer) => {
          peerRegistry.addPeer(peer);
        });
      } catch (e: any) {
        // Non-fatal: app can still work without BLE (e.g., on simulator)
        console.warn('Init warning:', e?.message ?? e);
        setInitError(e?.message ?? 'Initialisation warning — running in degraded mode');
      } finally {
        setReady(true);
      }
    }

    initApp();

    return () => {
      scanner?.stopScan();
    };
  }, []);

  if (!ready) {
    return (
      <View style={styles.splash}>
        <View style={styles.circle} />
        <Text style={styles.splashText}>BLINK</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  circle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#00ff88',
  },
  splashText: {
    color: '#00ff88',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 6,
  },
});
