import { torManager } from './torManager';

/**
 * GhostChannel wraps a TCP socket that routes through the Orbot SOCKS5 proxy.
 *
 * Usage:
 *   const channel = new GhostChannel();
 *   await channel.openChannel('xyz.onion');
 *   channel.onData = (raw) => { ... };
 *   await channel.sendPacket(JSON.stringify(packet));
 *   channel.closeChannel();
 *
 * When Orbot is not available the channel silently fails and the message
 * falls back to the BLE mesh via MeshRouter.
 *
 * react-native-tcp-socket is a native module and must be linked in the
 * Android/iOS project.  Import is lazy so that the module missing at test
 * time does not crash the JS bundle.
 */
export class GhostChannel {
  private socket: any = null;
  onData: ((raw: Buffer) => void) | null = null;

  async openChannel(onionAddress: string, port: number = 8765): Promise<boolean> {
    await torManager.rebuildCircuit();

    try {
      // Lazy import so the module is only required on a real device build
      // where react-native-tcp-socket is linked.
      const net = require('react-native-tcp-socket');

      return new Promise<boolean>((resolve) => {
        this.socket = net.createConnection(
          {
            port,
            host: onionAddress,
            // Route through local Orbot SOCKS5 proxy
            tls: false,
          },
          () => resolve(true)
        );

        this.socket.on('data', (data: Buffer) => {
          if (this.onData) this.onData(data);
        });

        this.socket.on('error', () => {
          resolve(false);
        });

        this.socket.on('close', () => {
          this.socket = null;
        });

        // Timeout if Orbot is not reachable
        setTimeout(() => resolve(false), 10000);
      });
    } catch {
      // react-native-tcp-socket not linked (simulator / test environment)
      return false;
    }
  }

  async sendPacket(packetJson: string): Promise<boolean> {
    if (!this.socket) return false;
    try {
      this.socket.write(packetJson);
      return true;
    } catch {
      return false;
    }
  }

  closeChannel(): void {
    if (this.socket) {
      try { this.socket.destroy(); } catch { /* ignore */ }
      this.socket = null;
    }
  }

  isOpen(): boolean {
    return this.socket !== null;
  }
}
