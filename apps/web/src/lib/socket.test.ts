import { afterEach, describe, expect, it } from 'vitest';
import { useConnectionStore } from '../stores/connection';
import { emitWithAck, getSocket, resetSocketForTests } from './socket';

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
