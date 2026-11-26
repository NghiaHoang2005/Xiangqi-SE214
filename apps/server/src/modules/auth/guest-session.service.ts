import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ErrorCode,
  GUEST_SESSION_COOKIE,
  GUEST_SESSION_IDLE_DAYS,
  isValidNickname,
  normalizeNickname,
  type GuestSessionView,
} from '@xiangqi/shared';
import { createHash, randomBytes } from 'node:crypto';
import { DomainException } from '../../common/domain.exception';
import { PrismaService } from '../../database/prisma.service';

export const GUEST_SESSION_TTL_MS = GUEST_SESSION_IDLE_DAYS * 24 * 60 * 60 * 1000;

const sessionViewFields = { guestId: true, nickname: true, expiresAt: true } as const;
type Session = Prisma.GuestSessionGetPayload<{ select: typeof sessionViewFields }>;

function view(session: Session): GuestSessionView {
  const { guestId, nickname, expiresAt } = session;
  return { guestId, nickname, expiresAt: expiresAt.toISOString() };
}

function parseNickname(raw: unknown): string | null {
  if (typeof raw === 'string') {
    const nickname = normalizeNickname(raw);
    if (nickname === null || isValidNickname(nickname)) return nickname;
  }
  throw new DomainException(ErrorCode.VALIDATION_FAILED, 'Invalid nickname', undefined, {
    field: 'nickname',
  });
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function sessionTimestamps() {
  const lastSeenAt = new Date();
  return { lastSeenAt, expiresAt: new Date(lastSeenAt.getTime() + GUEST_SESSION_TTL_MS) };
}

export function readGuestSessionToken(cookieHeader: string | undefined): string | undefined {
  for (const cookie of cookieHeader?.split(';') ?? []) {
    const [name, value, extra] = cookie.trim().split('=');
    if (name === GUEST_SESSION_COOKIE && extra === undefined && /^[\w-]{43}$/.test(value ?? '')) {
      return value;
    }
  }
  return undefined;
}

@Injectable()
export class GuestSessionService {
  constructor(private readonly db: PrismaService) {}

  async createOrReuse(token: string | undefined, rawNickname: unknown) {
    if (token) {
      const reused = await this.db.$transaction(async (tx) => {
        const session = await this.touch(tx, token);
        if (!session) return null;
        if (session.nickname !== null || rawNickname === undefined) return session;
        const nickname = parseNickname(rawNickname);
        if (nickname === null) return session;
        return tx.guestSession.update({
          where: { guestId: session.guestId },
          data: { nickname },
          select: sessionViewFields,
        });
      });
      if (reused) return { session: view(reused), token, created: false };
    }

    const nickname = rawNickname === undefined ? null : parseNickname(rawNickname);
    const newToken = randomBytes(32).toString('base64url');
    const session = await this.db.guestSession.create({
      data: { nickname, reconnectTokenHash: tokenHash(newToken), ...sessionTimestamps() },
      select: sessionViewFields,
    });
    return { session: view(session), token: newToken, created: true };
  }

  async authenticate(token: string | undefined): Promise<GuestSessionView | null> {
    const session = token ? await this.touch(this.db, token) : null;
    return session ? view(session) : null;
  }

  async require(token: string | undefined): Promise<GuestSessionView> {
    const session = await this.authenticate(token);
    if (!session) throw this.accessDenied();
    return session;
  }

  async updateNickname(token: string | undefined, rawNickname: unknown): Promise<GuestSessionView> {
    if (!token) throw this.accessDenied();
    const session = await this.db.$transaction(async (tx) => {
      const current = await this.touch(tx, token);
      if (!current) throw this.accessDenied();
      return tx.guestSession.update({
        where: { guestId: current.guestId },
        data: { nickname: parseNickname(rawNickname) },
        select: sessionViewFields,
      });
    });
    return view(session);
  }

  private async touch(db: Pick<Prisma.TransactionClient, 'guestSession'>, token: string) {
    const timestamps = sessionTimestamps();
    try {
      return await db.guestSession.update({
        where: { reconnectTokenHash: tokenHash(token), expiresAt: { gt: timestamps.lastSeenAt } },
        data: timestamps,
        select: sessionViewFields,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  private accessDenied(): DomainException {
    return new DomainException(
      ErrorCode.ACCESS_DENIED,
      'Guest session required',
      HttpStatus.UNAUTHORIZED,
    );
  }
}
