import { useConnectionStore } from '../../stores/connection';
import type { Services } from '../types';
import { createBroadcastBus, type MockBus } from './bus';
import { createMockRoomService, type MockEvent } from './room';
import { createMockSessionService } from './session';
import { createMemoryStorage, type KeyValueStorage } from './util';

export { createMemoryBus } from './bus';
export { MOCK_ERROR_CODES, type MockEvent } from './room';
export { createMemoryStorage } from './util';

export interface MockOptions {
  latencyMs?: number;
  /** Per tab, so two tabs are two guests. */
  sessionStorage?: KeyValueStorage;
  sharedStorage?: KeyValueStorage;
  bus?: MockBus<MockEvent>;
  now?: () => number;
}

function browserStorage(pick: () => Storage): KeyValueStorage {
  try {
    return pick();
  } catch {
    return createMemoryStorage(); // storage blocked (private mode)
  }
}

export function createMockServices(opts: MockOptions = {}): Services {
  const latencyMs = opts.latencyMs ?? 300;
  const session = createMockSessionService({
    storage: opts.sessionStorage ?? browserStorage(() => window.sessionStorage),
    latencyMs,
    now: opts.now,
  });
  const room = createMockRoomService({
    storage: opts.sharedStorage ?? browserStorage(() => window.localStorage),
    bus: opts.bus ?? createBroadcastBus<MockEvent>('xq.mock.events'),
    currentGuest: session.current,
    latencyMs,
    now: opts.now,
  });
  return {
    kind: 'mock',
    session,
    room,
    connect: () => {
      useConnectionStore.getState().setStatus('connected');
      return Promise.resolve(true);
    },
  };
}
