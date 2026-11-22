import { useConnectionStore } from '../../stores/connection';
import type { MatchStartedEvent, Services } from '../types';
import { createBroadcastBus, type MockBus } from './bus';
import { createMockRoomService } from './room';
import { createMockSessionService } from './session';
import { createMemoryStorage, type KeyValueStorage } from './util';

export { createMemoryBus } from './bus';
export { MOCK_ERROR_CODES } from './room';
export { createMemoryStorage } from './util';

export interface MockOptions {
  latencyMs?: number;
  /** Per-tab "cookie". Default sessionStorage. */
  sessionStorage?: KeyValueStorage;
  /** Rooms shared by every tab. Default localStorage. */
  sharedStorage?: KeyValueStorage;
  /** Server push channel. Default BroadcastChannel across tabs. */
  bus?: MockBus<MatchStartedEvent>;
  now?: () => number;
}

function browserStorage(pick: () => Storage): KeyValueStorage {
  try {
    return pick();
  } catch {
    return createMemoryStorage(); // blocked storage: keep working in memory
  }
}

/**
 * The whole backend, faked in the browser. Run with VITE_USE_MOCK=true.
 * Open two tabs: one creates a room, the other joins with the code, both get MatchStarted.
 */
export function createMockServices(opts: MockOptions = {}): Services {
  const latencyMs = opts.latencyMs ?? 300;
  const session = createMockSessionService({
    storage: opts.sessionStorage ?? browserStorage(() => window.sessionStorage),
    latencyMs,
    now: opts.now,
  });
  const room = createMockRoomService({
    storage: opts.sharedStorage ?? browserStorage(() => window.localStorage),
    bus: opts.bus ?? createBroadcastBus<MatchStartedEvent>('xq.mock.events'),
    currentGuest: session.current,
    latencyMs,
    now: opts.now,
  });
  return {
    kind: 'mock',
    session,
    room,
    connect: () => useConnectionStore.getState().setStatus('connected'),
  };
}
