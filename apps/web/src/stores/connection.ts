import { create } from 'zustand';

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected';

interface ConnectionState {
  status: ConnectionStatus;
  setStatus: (status: ConnectionStatus) => void;
}

/** Live Socket.IO status, written by lib/socket.ts and read by the UI. */
export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'idle',
  setStatus: (status) => set({ status }),
}));
