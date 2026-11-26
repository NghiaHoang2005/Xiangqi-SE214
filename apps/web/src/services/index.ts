import type { Services } from './types';

export * from './types';

let current: Services | null = null;

/** True when the app should run against the in-browser mock backend. */
export function isMockEnabled(): boolean {
  return import.meta.env.VITE_USE_MOCK === 'true';
}

/**
 * Picks the mock or the real backend once, at startup.
 * The mock is loaded with a dynamic import behind the env check, so a production
 * build without VITE_USE_MOCK never ships it.
 */
export async function initServices(): Promise<Services> {
  if (current) return current;
  if (isMockEnabled()) {
    const { createMockServices } = await import('./mock');
    const latency = Number(import.meta.env.VITE_MOCK_LATENCY_MS ?? 300);
    current = createMockServices({ latencyMs: Number.isFinite(latency) ? latency : 300 });
  } else {
    const { createRealServices } = await import('./real');
    current = createRealServices();
  }
  return current;
}

/** The services chosen by initServices(). Throws if called before it. */
export function getServices(): Services {
  if (!current) throw new Error('getServices() called before initServices()');
  return current;
}

/** Tests: install a fake (or mock) implementation; null forgets it. */
export function setServicesForTests(services: Services | null): void {
  current = services;
}
