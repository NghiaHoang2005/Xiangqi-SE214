/**
 * Tiny pub/sub standing in for the server's push events.
 * The browser version also crosses tabs with BroadcastChannel, so two tabs can play
 * host and guest against the mock.
 */
export interface MockBus<T> {
  publish(message: T): void;
  subscribe(listener: (message: T) => void): () => void;
}

/** In-process only. Share one instance between mock services to simulate several tabs in tests. */
export function createMemoryBus<T>(): MockBus<T> {
  const listeners = new Set<(message: T) => void>();
  return {
    publish: (message) => listeners.forEach((l) => l(message)),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** Same tab via the memory bus, other tabs via BroadcastChannel (which skips the sender). */
export function createBroadcastBus<T>(name: string): MockBus<T> {
  const local = createMemoryBus<T>();
  if (typeof BroadcastChannel === 'undefined') return local;
  const channel = new BroadcastChannel(name);
  channel.onmessage = (e: MessageEvent<T>) => local.publish(e.data);
  return {
    publish(message) {
      local.publish(message);
      channel.postMessage(message);
    },
    subscribe: local.subscribe,
  };
}
