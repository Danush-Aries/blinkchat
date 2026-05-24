// Type declarations for blinkchat native modules

declare module 'react-native-tcp-socket' {
  interface Socket {
    on(event: string, callback: (...args: any[]) => void): void;
    write(data: string | Buffer): void;
    destroy(): void;
  }
  interface ConnectOptions {
    port: number;
    host: string;
  }
  const net: {
    connect(options: ConnectOptions, callback?: () => void): Socket;
  };
  export default net;
  export { Socket, ConnectOptions };
}

declare module 'react-native-mmkv' {
  interface MMKVConfiguration {
    id: string;
  }
  export class MMKV {
    constructor(config: MMKVConfiguration);
    set(key: string, value: string | number | boolean): void;
    getString(key: string): string | undefined;
    getNumber(key: string): number | undefined;
    getBoolean(key: string): boolean | undefined;
    delete(key: string): void;
    clearAll(): void;
  }
}

declare module 'mlkem' {
  interface MLKemKeyPair {
    publicKey: Uint8Array;
    privateKey: Uint8Array;
  }
  interface MLKemCiphertext {
    ciphertext: Uint8Array;
    sharedSecret: Uint8Array;
  }
  export function generateKeyPair(): MLKemKeyPair;
  export function encapsulate(publicKey: Uint8Array): MLKemCiphertext;
  export function decapsulate(ciphertext: Uint8Array, privateKey: Uint8Array): Uint8Array;
}

declare module 'react-native-qrcode-svg' {
  import React from 'react';
  interface QRCodeProps {
    value: string;
    size?: number;
    color?: string;
    backgroundColor?: string;
  }
  const QRCode: React.FC<QRCodeProps>;
  export default QRCode;
}
