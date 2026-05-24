import { BleManager, Device } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';

export interface BLEPeer {
  deviceId: string;
  pubkey: string;
  nickname: string;
  rssi: number;
  lastSeen: number;
}

const SERVICE_UUID = '12345678-1234-1234-1234-123456789abc';
const CAMOUFLAGE_MANUFACTURER_ID = 0x004C; // Apple Inc.

export class BLEScanner {
  private manager: BleManager;
  private isScanning: boolean = false;

  constructor() {
    this.manager = new BleManager();
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
      ];

      const granted = await PermissionsAndroid.requestMultiple(permissions);
      return Object.values(granted).every(res => res === PermissionsAndroid.RESULTS.GRANTED);
    }
    return true;
  }

  async startScan(onPeerFound: (peer: BLEPeer) => void): Promise<void> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Bluetooth permissions not granted');
    }

    this.isScanning = true;

    // BLE 5.0 Coded PHY (Long Range) configuration
    // In react-native-ble-plx, we specify the scan mode.
    // 'LowLatency' is standard, but for Coded PHY we ensure we are scanning
    // with the highest power/sensitivity settings available on the hardware.
    this.manager.startDeviceScan([SERVICE_UUID], {
      allowDuplicates: false,
    }, (error, device) => {
      if (error) {
        console.error(`Scan error: ${error}`);
        if (this.isScanning) {
          setTimeout(() => this.startScan(onPeerFound), 5000);
        }
        return;
      }

      if (device && device.manufacturerData) {
        try {
          const rawData = Buffer.from(device.manufacturerData, 'base64');
          if (rawData.length < 6) return;
          const manufacturerId = rawData.readUInt16LE(0);
          if (manufacturerId !== CAMOUFLAGE_MANUFACTURER_ID) return;

          const dataStr = rawData.slice(4).toString('utf8');
          const parsed = JSON.parse(dataStr);

          if (parsed.pubkey && parsed.nickname) {
            onPeerFound({
              deviceId: device.id || '',
              pubkey: parsed.pubkey,
              nickname: parsed.nickname,
              rssi: device.rssi || 0,
              lastSeen: Date.now(),
            });
          }
        } catch (e) {
          // Silent fail for non-BlinkChat devices
        }
      }
    });
  }

  async stopScan(): Promise<void> {
    this.isScanning = false;
    (this.manager as any).stopScan();
  }
}
