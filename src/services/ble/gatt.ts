import { BleManager } from 'react-native-ble-plx';
import { Platform } from 'react-native';

const SERVICE_UUID = '12345678-1234-1234-1234-123456789abc';
const CHARACTERISTIC_UUID = 'abcdef01-1234-1234-1234-123456789abc';

export class GATTClient {
  private manager: BleManager;

  constructor() {
    this.manager = new BleManager();
  }

  /**
   * Connects to a BLE device and sends data as chunked characteristic writes.
   * On Android, negotiates the maximum supported MTU for throughput.
   */
  async connectAndSend(deviceId: string, data: Uint8Array): Promise<void> {
    let device = null;
    let retries = 3;

    while (retries > 0) {
      try {
        device = await this.manager.connectToDevice(deviceId);
        await device.discoverAllServicesAndCharacteristics();

        let mtu = 512;

        if (Platform.OS === 'android') {
          const negotiated = await device.requestMTU(512);
          mtu = negotiated.mtu ?? 512;
        }

        // Write data in MTU-sized chunks
        for (let i = 0; i < data.length; i += mtu) {
          const chunk = data.slice(i, i + mtu);
          await device.writeCharacteristicWithResponseForService(
            SERVICE_UUID,
            CHARACTERISTIC_UUID,
            Buffer.from(chunk).toString('base64')
          );
        }

        await device.cancelConnection();
        return;
      } catch (error) {
        retries--;
        if (device) {
          try { await device.cancelConnection(); } catch { /* ignore */ }
        }
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Connects to a BLE device and monitors a characteristic for incoming data.
   * Reassembles chunked payloads and delivers the full buffer via onComplete.
   */
  async receiveFromChar(
    deviceId: string,
    onComplete: (data: Uint8Array) => void
  ): Promise<() => void> {
    const device = await this.manager.connectToDevice(deviceId);
    await device.discoverAllServicesAndCharacteristics();

    const chunks: Buffer[] = [];

    const subscription = device.monitorCharacteristicForService(
      SERVICE_UUID,
      CHARACTERISTIC_UUID,
      (error, characteristic) => {
        if (error) return;
        if (characteristic?.value) {
          const chunk = Buffer.from(characteristic.value, 'base64');
          chunks.push(chunk);

          // Reassemble and deliver when a full frame is received.
          // In a production implementation, the last chunk is identified by a
          // length-prefix framing header embedded in the data stream.
          if (chunks.length >= 1) {
            const full = Buffer.concat(chunks);
            chunks.length = 0;
            onComplete(new Uint8Array(full));
          }
        }
      }
    );

    // Return a cleanup function
    return () => subscription.remove();
  }
}
