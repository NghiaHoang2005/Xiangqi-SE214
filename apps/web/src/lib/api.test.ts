import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './api';
import { ApiRequestError } from './errors';

afterEach(() => vi.unstubAllGlobals());

function stubFetch(impl: (url: string, init: RequestInit) => Promise<Response>) {
  const fn = vi.fn(impl);
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('apiFetch', () => {
  it('calls /api with a request id and returns JSON', async () => {
    const fetchMock = stubFetch(async () => Response.json({ status: 'ok' }));
    await expect(apiFetch('/health')).resolves.toEqual({ status: 'ok' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/health');
    expect(new Headers(init.headers).get('x-request-id')).toBeTruthy();
    expect(init.credentials).toBe('include');
  });

  it('throws the server ApiError', async () => {
    stubFetch(async () =>
      Response.json(
        { code: 'ROOM_FULL', message: 'Room is full', requestId: 'r1' },
        { status: 409 },
      ),
    );
    const err = await apiFetch('/rooms/x/join').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiRequestError);
    expect((err as ApiRequestError).error.code).toBe('ROOM_FULL');
    expect((err as ApiRequestError).status).toBe(409);
  });

  it('turns a network failure into NETWORK_ERROR', async () => {
    stubFetch(async () => {
      throw new TypeError('Failed to fetch');
    });
    const err = await apiFetch('/health').catch((e: unknown) => e);
    expect((err as ApiRequestError).error.code).toBe('NETWORK_ERROR');
  });
});
