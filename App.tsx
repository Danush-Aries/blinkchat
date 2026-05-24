import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/ui/navigation/AppNavigator';
import { generateIdentity, saveIdentity, loadIdentity } from './src/services/crypto/identity';
import { deriveOnionAddress, saveOnionAddress } from './src/services/tor/onionService';
import { modeManager } from './src/services/network/modeManager';
import { db } from './src/services/storage/db';
import { BLEScanner } from './src/services/ble/scanner';
import { BLEAdvertiser } from './src/services/ble/advertiser';
import { batteryOptimizer } from './src/services/network/batteryOptimizer';

export default function App() {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    async function initApp() {
      try {
        // 1. Identity Sovereignty
        let identity = loadIdentity();
        if (!identity) {
          identity = await generateIdentity();
          saveIdentity(identity);
        }

        // 2. Tor/Onion Setup
        const onion = await deriveOnionAddress(identity.publicKey);
        saveOnionAddress(onion);

        // 3. Database & Core Services
        await db.init();
        modeManager.start();

        // 4. BLE Mesh Activation
        const scanner = new BLEScanner();
        const advertiser = new BLEAdvertiser();

        // Initialize Battery Optimization
        batteryOptimizer.init(scanner);

        // Start Stealth Advertising
        advertiser.startAdvertising(
          identity.publicKey.toString('hex'),
          'BlinkUser'
        );

        // Start Mesh Scanning
        scanner.startScan((peer) => {
          // Peer discovered
        });

      } catch (e) {
        console.error('Hardware Init Details:', e);
        throw e;
      } finally {
        setReady(true);
      }
    }
    initApp();
  }, []);

  if (!ready) {
    return (
      <View style={styles.splash}>
        <View style={styles.circle} />
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
  },
  circle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#00ff88',
  },
});
