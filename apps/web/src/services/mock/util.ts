import {
  JOIN_CODE_ALPHABET,
  JOIN_CODE_LENGTH,
  type ApiErrorDetails,
  type ErrorCode,
} from '@xiangqi/shared';
import { ApiRequestError, type ClientOnlyCode } from '../../lib/errors';
import { newRequestId } from '../../lib/request-id';

export function fail(
  code: ErrorCode | ClientOnlyCode,
  message: string,
  details?: ApiErrorDetails,
): never {
  throw new ApiRequestError({ code, message, requestId: newRequestId(), details });
}

export function delay(ms: number): Promise<void> {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

export function randomBase64Url(bytes: number): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function randomJoinCode(): string {
  const buf = crypto.getRandomValues(new Uint8Array(JOIN_CODE_LENGTH));
  return Array.from(buf, (b) => JOIN_CODE_ALPHABET[b % JOIN_CODE_ALPHABET.length]).join('');
}

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
    // Storage full or blocked: the mock just forgets.
  }
}
