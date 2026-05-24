import { create } from 'zustand';
import { BLEScanner } from '../ble/scanner';
import { Platform } from 'react-native';

export enum ScanMode {
  LOW_LATENCY = 'LOW_LATENCY',
  BALANCED = 'BALANCED',
  OPPORTUNISTIC = 'OPPORTUNISTIC',
}

interface BatteryOptimizerState {
  currentMode: ScanMode;
  setMode: (mode: ScanMode) => void;
}

export const useBatteryOptimizer = create<BatteryOptimizerState>((set) => ({
  currentMode: ScanMode.LOW_LATENCY,
  setMode: (mode) => set({ currentMode: mode }),
}));

class BatteryOptimizer {
  private scanner: BLEScanner | null = null;

  constructor(scanner: BLEScanner) {
    this.scanner = scanner;
    this.initStationaryDetection();
  }

  private initStationaryDetection() {
    // In a real implementation, we use react-native-sensors for Accelerometer
    // or expo-location for Geofencing.
    // If (accelerometer.magnitude < threshold) => setMode(OPPORTUNISTIC)

    setInterval(() => {
      const isStationary = this.checkStationaryStatus();
      const targetMode = isStationary ? ScanMode.OPPORTUNISTIC : ScanMode.LOW_LATENCY;

      if (useBatteryOptimizer.getState().currentMode !== targetMode) {
        // Device state changed. Switching mode.
        useBatteryOptimizer.getState().setMode(targetMode);
        this.applyScanMode(targetMode);
      }
    }, 60000); // Check every minute
  }

  private checkStationaryStatus(): boolean {
    // Mocking stationary check: in a real app, this reads from the accelerometer
    return Math.random() > 0.7;
  }

  private applyScanMode(mode: ScanMode) {
    if (!this.scanner) return;

    // Stop current scan and restart with the new mode
    this.scanner.stopScan().then(() => {
      // The scanner.startScan would be updated to accept a mode parameter
      // for now we simulate the power shift in logs
      // BLE Scanning power adjusted.
    });
  }
}

export const batteryOptimizer = {
  init: (scanner: BLEScanner) => new BatteryOptimizer(scanner)
};
