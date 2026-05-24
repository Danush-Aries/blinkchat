import { create } from 'zustand';
import { torManager } from '../tor/torManager';

export enum NetworkMode {
  OFFLINE_MESH = 'OFFLINE_MESH',
  ONLINE_TOR = 'ONLINE_TOR',
  UNSAFE = 'UNSAFE',
}

class ModeManager {
  private currentMode: NetworkMode = NetworkMode.OFFLINE_MESH;

  async start() {
    setInterval(async () => {
      const online = await torManager.isOnline();
      if (!online) {
        this.currentMode = NetworkMode.OFFLINE_MESH;
      } else {
        const torOk = await torManager.verifyTor();
        this.currentMode = torOk ? NetworkMode.ONLINE_TOR : NetworkMode.UNSAFE;
      }
      useModeManager.getState().setMode(this.currentMode);
    }, 15000);
  }

  getCurrentMode() { return this.currentMode; }
}

export const modeManager = new ModeManager();

export const useModeManager = create<{
  mode: NetworkMode;
  setMode: (mode: NetworkMode) => void;
}>((set) => ({
  mode: NetworkMode.OFFLINE_MESH,
  setMode: (mode) => set({ mode }),
}));
