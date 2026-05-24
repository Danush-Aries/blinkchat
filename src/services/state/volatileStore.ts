import { create } from 'zustand';
import crypto from 'react-native-quick-crypto';

interface VolatileKeyStore {
  keys: Map<string, Uint8Array>;
  setKey: (id: string, key: Uint8Array) => void;
  shredKey: (id: string) => void;
}

export const useVolatileStore = create<VolatileKeyStore>((set, get) => ({
  keys: new Map(),
  setKey: (id, key) => {
    const newKeys = new Map(get().keys);
    newKeys.set(id, key);
    set({ keys: newKeys });
  },
  shredKey: (id) => {
    const currentKeys = get().keys;
    const key = currentKeys.get(id);

    if (key) {
      // MAD CORE: Aggressive Memory Zeroization
      // Instead of just deleting the reference, we overwrite the buffer with noise
      // to defeat cold-boot/forensic RAM extraction.
      const noise = crypto.randomBytes(key.length);
      for (let i = 0; i < key.length; i++) {
        key[i] = noise[i];
      }

      const newKeys = new Map(currentKeys);
      newKeys.delete(id);
      set({ keys: newKeys });
      // Key shredded from RAM.
    }
  },
}));
