import { afterEach, describe, expect, it } from 'vitest';
import { useConnectionStore } from '../stores/connection';
import { connectSocket, emitWithAck, getSocket, resetSocketForTests } from './socket';

afterEach(() => {
  resetSocketForTests();
  useConnectionStore.getState().setStatus('idle');
});

describe('socket client', () => {
  it('reuses one socket', () => {
    expect(getSocket()).toBe(getSocket());
  });

  it('does not emit while disconnected and returns NETWORK_ERROR instead', async () => {
    const ack = await emitWithAck('Ping', { requestId: 'req_12345678' });
    expect(ack).toMatchObject({
      ok: false,
      requestId: 'req_12345678',
      error: { code: 'NETWORK_ERROR' },
    });
  });

  it('connectSocket resolves true on connect', async () => {
    const socket = getSocket();
    const connected = connectSocket(1000);
    socket.listeners('connect').forEach((listener) => listener.call(socket));
    await expect(connected).resolves.toBe(true);
  });

  it('connectSocket resolves false when the connection does not come up in time', async () => {
    await expect(connectSocket(10)).resolves.toBe(false);
  });

  it('mirrors socket events in the connection store', () => {
    const socket = getSocket();
    // Manager.emit is typed as internal; reach it the way the socket does when retrying.
    (socket.io as unknown as { emit: (event: string, attempt: number) => void }).emit(
      'reconnect_attempt',
      1,
    );
    expect(useConnectionStore.getState().status).toBe('reconnecting');
  });
});
