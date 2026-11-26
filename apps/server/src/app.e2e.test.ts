import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { INITIAL_FEN, createInitialPosition } from '@xiangqi/rules';
import {
  ClientEvent,
  GUEST_SESSION_COOKIE,
  ServerEvent,
  SystemEvent,
  isValidJoinCode,
  type Ack,
  type MatchStartedPayload,
  type PingResult,
  type RoomView,
} from '@xiangqi/shared';
import { createHash } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { io, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { PrismaService } from './database/prisma.service';
import { TEST_DATABASE_URL, hasTestDb, resetTestDatabase } from './test/test-db';

describe.skipIf(!hasTestDb)('server (e2e)', () => {
  let app: INestApplication;
  let baseUrl: string;

  async function connectGuest(nickname: string) {
    const response = await fetch(`${baseUrl}/api/guest-session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nickname }),
    });
    expect(response.status).toBe(201);
    const { guestId } = await response.json();
    const cookie = response.headers.get('set-cookie')?.split(';')[0] ?? '';
    const socket = io(baseUrl, {
      transports: ['websocket'],
      reconnection: false,
      extraHeaders: { cookie },
    });
    return { guestId, socket };
  }

  function nextEvent<T>(socket: Socket, event: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.off(event, onEvent);
        reject(new Error(`Timed out waiting for ${event}`));
      }, 2000);
      function onEvent(payload: T) {
        clearTimeout(timer);
        resolve(payload);
      }
      socket.once(event, onEvent);
    });
  }

  beforeAll(async () => {
    await (await resetTestDatabase()).$disconnect();
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

  it('creates a guest, reuses its cookie, and keeps the token out of storage and response bodies', async () => {
    const url = `${baseUrl}/api/guest-session`;
    const created = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nickname: '  Kỳ   thủ  ' }),
    });
    const session = await created.json();
    expect(created.status).toBe(201);
    expect(session).toEqual({
      guestId: expect.stringMatching(/^[\da-f-]{36}$/),
      nickname: 'Kỳ thủ',
      expiresAt: expect.any(String),
    });
    const setCookie = created.headers.get('set-cookie') ?? '';
    expect(setCookie).toMatch(
      new RegExp(`^${GUEST_SESSION_COOKIE}=[\\w-]{43}; Max-Age=2592000; Path=/`),
    );
    expect(setCookie).toContain('HttpOnly; Secure; SameSite=Lax');
    const cookie = setCookie.split(';')[0];
    const token = cookie.slice(GUEST_SESSION_COOKIE.length + 1);
    const db = app.get(PrismaService);
    const stored = await db.guestSession.findUniqueOrThrow({ where: { guestId: session.guestId } });
    expect(stored.reconnectTokenHash).toBe(createHash('sha256').update(token).digest('hex'));

    const reused = await fetch(url, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ nickname: 'Ignored on reuse' }),
    });
    expect(reused.status).toBe(200);
    expect(await reused.json()).toMatchObject({ guestId: session.guestId, nickname: 'Kỳ thủ' });

    const updated = await fetch(`${url}/me`, {
      method: 'PATCH',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ nickname: 'Người chơi' }),
    });
    expect(updated.status).toBe(200);
    expect(await updated.json()).toMatchObject({
      guestId: session.guestId,
      nickname: 'Người chơi',
    });

    const current = await fetch(`${url}/me`, { headers: { cookie } });
    expect(current.status).toBe(200);
    expect(await current.json()).toMatchObject({
      guestId: session.guestId,
      nickname: 'Người chơi',
    });

    await db.guestSession.update({
      where: { guestId: session.guestId },
      data: { expiresAt: new Date(0) },
    });
    const expired = await fetch(`${url}/me`, { headers: { cookie } });
    expect(expired.status).toBe(401);
    expect(await expired.json()).toMatchObject({ code: 'ACCESS_DENIED' });
    const replacement = await fetch(url, { method: 'POST', headers: { cookie } });
    expect(replacement.status).toBe(201);
    expect((await replacement.json()).guestId).not.toBe(session.guestId);
  });

  it('rejects an invalid nickname and missing guest credentials', async () => {
    const invalid = await fetch(`${baseUrl}/api/guest-session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nickname: 'A' }),
    });
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({
      code: 'VALIDATION_FAILED',
      details: { field: 'nickname' },
    });
    const missing = await fetch(`${baseUrl}/api/guest-session/me`);
    expect(missing.status).toBe(401);
    expect(await missing.json()).toMatchObject({ code: 'ACCESS_DENIED' });
  });

  it('creates a private room, persists the host seat and only allows the host to close it', async () => {
    const host = await connectGuest('Room host');
    const other = await connectGuest('Other guest');
    const anonymous = io(baseUrl, { transports: ['websocket'], reconnection: false });
    const timeControl = { initialMinutes: 10, incrementSeconds: 5 };
    try {
      const denied = await anonymous.timeout(2000).emitWithAck(ClientEvent.CreateRoom, {
        timeControl,
        preferredSide: 'BLACK',
      });
      expect(denied).toMatchObject({ ok: false, error: { code: 'ACCESS_DENIED' } });

      const invalid = await host.socket.timeout(2000).emitWithAck(ClientEvent.CreateRoom, {
        timeControl: { initialMinutes: 7, incrementSeconds: 0 },
        preferredSide: 'RED',
      });
      expect(invalid).toMatchObject({
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          details: { field: 'timeControl', allowed: expect.any(Array) },
        },
      });

      const created: Ack<RoomView> = await host.socket
        .timeout(2000)
        .emitWithAck(ClientEvent.CreateRoom, {
          timeControl,
          preferredSide: 'BLACK',
          requestId: 'create_12345',
        });
      expect(created.ok).toBe(true);
      if (!created.ok) throw new Error('CreateRoom failed');
      expect(created.requestId).toBe('create_12345');
      const { roomId, joinCode } = created.data;
      expect(roomId).toMatch(/^[\w-]{43}$/);
      expect(isValidJoinCode(joinCode)).toBe(true);
      expect(created.data).toMatchObject({
        status: 'WAITING',
        timeControl,
        hostGuestId: host.guestId,
        hostSide: 'BLACK',
        yourSide: 'BLACK',
        seats: [{ guestId: host.guestId, side: 'BLACK', connectionState: 'CONNECTED' }],
        matchId: null,
      });
      const seat = await app.get(PrismaService).roomSeat.findUnique({
        where: { roomId_side: { roomId, side: 'BLACK' } },
      });
      expect(seat?.guestId).toBe(host.guestId);

      const forbidden = await other.socket
        .timeout(2000)
        .emitWithAck(ClientEvent.CloseRoom, { roomId });
      expect(forbidden).toMatchObject({ ok: false, error: { code: 'ACCESS_DENIED' } });
      const update = nextEvent<RoomView>(host.socket, ServerEvent.RoomUpdated);
      const closed = await host.socket.timeout(2000).emitWithAck(ClientEvent.CloseRoom, { roomId });
      expect(closed).toMatchObject({ ok: true, data: { roomId, status: 'CLOSED' } });
      await expect(update).resolves.toMatchObject({ roomId, status: 'CLOSED', yourSide: 'BLACK' });
    } finally {
      host.socket.close();
      other.socket.close();
      anonymous.close();
    }
  });

  it('allocates the last seat once under concurrent joins and starts the same match for both players', async () => {
    const host = await connectGuest('Host player');
    const first = await connectGuest('First challenger');
    const second = await connectGuest('Second challenger');
    try {
      const created: Ack<RoomView> = await host.socket
        .timeout(2000)
        .emitWithAck(ClientEvent.CreateRoom, {
          timeControl: { initialMinutes: 5, incrementSeconds: 0 },
          preferredSide: 'BLACK',
        });
      if (!created.ok) throw new Error('CreateRoom failed');
      const { roomId, joinCode } = created.data;
      const hostUpdate = nextEvent<RoomView>(host.socket, ServerEvent.RoomUpdated);
      const hostStarted = nextEvent<MatchStartedPayload>(host.socket, ServerEvent.MatchStarted);
      const receivedMatches = new Map<string, MatchStartedPayload>();
      const receivedRooms = new Map<string, RoomView>();
      for (const guest of [first, second]) {
        guest.socket.on(ServerEvent.MatchStarted, (match: MatchStartedPayload) => {
          receivedMatches.set(guest.guestId, match);
        });
        guest.socket.on(ServerEvent.RoomUpdated, (room: RoomView) => {
          receivedRooms.set(guest.guestId, room);
        });
      }

      const joinByCode = `${joinCode.slice(0, 4)}-${joinCode.slice(4)}`.toLowerCase();
      const joins: Array<Ack<RoomView>> = await Promise.all([
        first.socket.timeout(2000).emitWithAck(ClientEvent.JoinRoom, { joinCode: joinByCode }),
        second.socket.timeout(2000).emitWithAck(ClientEvent.JoinRoom, { roomId }),
      ]);
      const winningIndex = joins.findIndex((join) => join.ok);
      expect(winningIndex).toBeGreaterThanOrEqual(0);
      const winner = [first, second][winningIndex];
      const [accepted, refused] = [joins[winningIndex], joins[1 - winningIndex]];
      if (!accepted.ok) throw new Error('JoinRoom failed');
      expect(refused).toMatchObject({ ok: false, error: { code: 'ROOM_FULL' } });
      const matchId = accepted.data.matchId;
      expect(accepted.data).toMatchObject({ roomId, status: 'STARTED', yourSide: 'RED' });

      await expect(hostUpdate).resolves.toMatchObject({
        roomId,
        matchId,
        status: 'STARTED',
        yourSide: 'BLACK',
      });
      const started = await hostStarted;
      expect(started).toMatchObject({
        roomId,
        matchId,
        version: 0,
        turn: 'RED',
        fen: INITIAL_FEN,
        clocks: { redMs: 300_000, blackMs: 300_000 },
        players: { RED: { guestId: winner.guestId }, BLACK: { guestId: host.guestId } },
      });
      await expect.poll(() => receivedMatches.get(winner.guestId)).toEqual(started);
      expect(receivedRooms.get(winner.guestId)).toMatchObject({ matchId, yourSide: 'RED' });

      const retried = await winner.socket
        .timeout(2000)
        .emitWithAck(ClientEvent.JoinRoom, { roomId });
      expect(retried).toMatchObject({ ok: true, data: { matchId, yourSide: 'RED' } });
      const db = app.get(PrismaService);
      expect(await db.roomSeat.count({ where: { roomId } })).toBe(2);
      expect(await db.match.findMany({ where: { roomId } })).toMatchObject([
        {
          matchId,
          version: 0,
          mode: 'PVP',
          turn: 'RED',
          snapshot: createInitialPosition(),
          redGuestId: winner.guestId,
          blackGuestId: host.guestId,
        },
      ]);
    } finally {
      host.socket.close();
      first.socket.close();
      second.socket.close();
    }
  });

  it('rejects unknown join codes and closed or expired rooms', async () => {
    const host = await connectGuest('Waiting host');
    const guest = await connectGuest('Waiting guest');
    try {
      const missing = await guest.socket
        .timeout(2000)
        .emitWithAck(ClientEvent.JoinRoom, { joinCode: 'wrong-code' });
      expect(missing).toMatchObject({ ok: false, error: { code: 'ROOM_NOT_FOUND' } });
      const created: Ack<RoomView> = await host.socket
        .timeout(2000)
        .emitWithAck(ClientEvent.CreateRoom, {
          timeControl: { initialMinutes: 15, incrementSeconds: 5 },
          preferredSide: 'RANDOM',
        });
      if (!created.ok) throw new Error('CreateRoom failed');
      const { roomId, joinCode } = created.data;
      await host.socket.timeout(2000).emitWithAck(ClientEvent.CloseRoom, { roomId });
      const closed = await guest.socket
        .timeout(2000)
        .emitWithAck(ClientEvent.JoinRoom, { joinCode });
      expect(closed).toMatchObject({ ok: false, error: { code: 'ROOM_EXPIRED' } });

      await app.get(PrismaService).room.update({
        where: { roomId },
        data: { status: 'WAITING', expiresAt: new Date(0) },
      });
      const expired = await guest.socket
        .timeout(2000)
        .emitWithAck(ClientEvent.JoinRoom, { roomId });
      expect(expired).toMatchObject({ ok: false, error: { code: 'ROOM_EXPIRED' } });
    } finally {
      host.socket.close();
      guest.socket.close();
    }
  });
});
