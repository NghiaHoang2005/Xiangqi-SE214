import { ErrorCode } from '@xiangqi/shared';
import { describe, expect, it } from 'vitest';
import { DomainException } from '../common/domain.exception';
import { runHandler } from './run-handler';

describe('runHandler', () => {
  it('wraps a result in a successful ack and keeps a safe requestId', async () => {
    const ack = await runHandler({ requestId: 'req_12345678' }, () => 42);
    expect(ack).toEqual({ ok: true, requestId: 'req_12345678', data: 42 });
  });

  it('turns a DomainException into an error ack with the shared code', async () => {
    const ack = await runHandler(undefined, () => {
      throw new DomainException(ErrorCode.ROOM_FULL, 'Room is full');
    });
    expect(ack.ok).toBe(false);
    if (!ack.ok) {
      expect(ack.error).toMatchObject({ code: 'ROOM_FULL', message: 'Room is full' });
      expect(ack.error.requestId).toBe(ack.requestId);
    }
  });

  it('hides internal error details', async () => {
    const ack = await runHandler(undefined, () => {
      throw new Error('db password is hunter2');
    });
    expect(ack.ok).toBe(false);
    if (!ack.ok)
      expect(ack.error).toMatchObject({ code: 'INTERNAL_ERROR', message: 'Internal error' });
  });

  it('replaces an unsafe client requestId', async () => {
    const ack = await runHandler({ requestId: 'bad id with spaces' }, () => null);
    expect(ack.requestId).not.toBe('bad id with spaces');
  });
});
