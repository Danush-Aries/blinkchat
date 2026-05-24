import net from 'react-native-tcp-socket';
import { torManager } from './torManager';

export class GhostChannel {
  private socket: any = null;

  async openChannel(onionAddress: string) {
    await torManager.rebuildCircuit();

    this.socket = net.connect({ port: 8765, host: onionAddress }, () => {
      // Connection established via Tor SOCKS5 proxy
    });
    this.socket.on('data', (data: string | Buffer) => {
      // Data received via Tor SOCKS5 proxy
    });
  }

  async sendPacket(packetJson: string) {
    if (!this.socket) throw new Error('Channel not open');
    this.socket.write(packetJson);
  }

  closeChannel() {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
  }
}
