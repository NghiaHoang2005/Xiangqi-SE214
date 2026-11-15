import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SystemEvent, type Ack, type PingResult } from '@xiangqi/shared';
import type { AddressInfo } from 'node:net';
import { io, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { TEST_DATABASE_URL, hasTestDb, resetTestDatabase } from './test/test-db';

describe.skipIf(!hasTestDb)('server skeleton (e2e)', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    await (await resetTestDatabase()).destroy();
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    app.useLogger(false);
    await app.listen(0);
    const { port } = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('answers /api/health and returns a request id header', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-request-id')).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
  });

  it('echoes a safe client request id', async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: { 'x-request-id': 'client_abc123' },
    });
    expect(res.headers.get('x-request-id')).toBe('client_abc123');
  });

  it('returns unknown routes as an ApiError body', async () => {
    const res = await fetch(`${baseUrl}/api/does-not-exist`, {
      headers: { 'x-request-id': 'client_404test' },
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: 'NOT_FOUND', requestId: 'client_404test' });
  });

  it('acknowledges a Socket.IO ping', async () => {
    const socket: Socket = io(baseUrl, { transports: ['websocket'], reconnection: false });
    try {
      const ack: Ack<PingResult> = await socket.timeout(2000).emitWithAck(SystemEvent.Ping, {
        requestId: 'ping_12345678',
      });
      expect(ack.ok).toBe(true);
      expect(ack.requestId).toBe('ping_12345678');
      if (ack.ok) expect(typeof ack.data.serverTime).toBe('number');
    } finally {
      socket.close();
    }
  });
});
