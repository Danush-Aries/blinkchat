import { create } from 'zustand';
import { Packet } from '../protocol/packet';

interface BurnMessage {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
}

interface BurnStore {
  burnMessages: BurnMessage[];
  addBurnMessage: (msg: BurnMessage) => void;
  purgeBurnMessage: (id: string) => void;
}

export const useBurnStore = create<BurnStore>((set) => ({
  burnMessages: [],
  addBurnMessage: (msg) => set((state) => ({
    burnMessages: [...state.burnMessages, msg]
  })),
  purgeBurnMessage: (id) => set((state) => ({
    burnMessages: state.burnMessages.filter(m => m.id !== id)
  })),
}));
