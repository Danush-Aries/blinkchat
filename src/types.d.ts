// Type declarations for blinkchat native modules and third-party packages.

// ---- react-native-tcp-socket ----
declare module 'react-native-tcp-socket' {
  interface Socket {
    on(event: 'data', handler: (data: Buffer) => void): this;
    on(event: 'error', handler: (err: Error) => void): this;
    on(event: 'close', handler: () => void): this;
    on(event: string, handler: (...args: any[]) => void): this;
    write(data: string | Buffer): void;
    destroy(): void;
  }

  interface ConnectOptions {
    port: number;
    host: string;
    tls?: boolean;
  }

  export function createConnection(
    options: ConnectOptions,
    callback?: () => void
  ): Socket;

  const _default: { createConnection: typeof createConnection };
  export default _default;
}

// ---- react-native-mmkv ----
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

// ---- mlkem (v2.7.x class-based API) ----
declare module 'mlkem' {
  export class MlKem512 {
    generateKeyPair(): Promise<[Uint8Array, Uint8Array]>; // [publicKey, privateKey]
    encap(publicKey: Uint8Array): Promise<[Uint8Array, Uint8Array]>; // [ciphertext, sharedSecret]
    decap(ciphertext: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array>;
  }

  export class MlKem768 {
    generateKeyPair(): Promise<[Uint8Array, Uint8Array]>;
    encap(publicKey: Uint8Array): Promise<[Uint8Array, Uint8Array]>;
    decap(ciphertext: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array>;
  }

  export class MlKem1024 {
    generateKeyPair(): Promise<[Uint8Array, Uint8Array]>;
    encap(publicKey: Uint8Array): Promise<[Uint8Array, Uint8Array]>;
    decap(ciphertext: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array>;
  }
}

// ---- react-native-qrcode-svg ----
declare module 'react-native-qrcode-svg' {
  import React from 'react';

  interface QRCodeProps {
    value: string;
    size?: number;
    color?: string;
    backgroundColor?: string;
    quietZone?: number;
    ecl?: 'L' | 'M' | 'Q' | 'H';
    getRef?: (ref: any) => void;
    onError?: (err: any) => void;
  }

  const QRCode: React.FC<QRCodeProps>;
  export default QRCode;
}
