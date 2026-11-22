import type { ErrorCode } from '@xiangqi/shared';
import { ApiRequestError, type ClientOnlyCode } from '../../lib/errors';
import { newRequestId } from '../../lib/request-id';

/** Throws the same error shape the real backend produces. */
export function fail(code: ErrorCode | ClientOnlyCode, message: string): never {
  throw new ApiRequestError({ code, message, requestId: newRequestId() });
}

export function delay(ms: number): Promise<void> {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

export function randomHex(bytes: number): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** No 0/O/1/I so a code read aloud is not mistyped. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randomCode(length = 8): string {
  const buf = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(buf, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

/** Storage that lives only in memory: used by tests to simulate separate tabs. */
export function createMemoryStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

export type KeyValueStorage = ReturnType<typeof createMemoryStorage>;

export function readJson<T>(storage: KeyValueStorage, key: string): T | null {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(storage: KeyValueStorage, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked (private mode): the mock just forgets.
  }
}
