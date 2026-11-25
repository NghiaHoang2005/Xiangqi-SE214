import { Inject, Injectable } from '@nestjs/common';
import type { Match, Prisma, PrismaClient, Side } from '@prisma/client';
import { ErrorCode } from '@xiangqi/shared';
import { DomainException } from '../../common/domain.exception';
import { PrismaService } from '../../database/prisma.service';

type MoveData = Omit<Prisma.MoveUncheckedCreateInput, 'matchId' | 'ply' | 'clockAfter'>;

interface NextPosition {
  snapshot: Prisma.InputJsonValue;
  clocks: Prisma.InputJsonValue;
  turn: Side;
}

@Injectable()
export class MatchRepository {
  constructor(@Inject(PrismaService) private readonly db: PrismaClient) {}

  async withLockedMatch<T>(
    matchId: string,
    work: (tx: Prisma.TransactionClient, match: Match) => Promise<T>,
  ): Promise<T> {
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(matchId)) {
      throw new DomainException(ErrorCode.NOT_FOUND);
    }
    return this.db.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ match_id: string }>>`
        SELECT match_id FROM "match" WHERE match_id = ${matchId}::uuid FOR UPDATE
      `;
      if (!locked.length) throw new DomainException(ErrorCode.NOT_FOUND);
      const match = await tx.match.findUniqueOrThrow({ where: { matchId } });
      return work(tx, match);
    });
  }

  // The caller verifies seat access. The reducer validates the move against the locked state.
  async commitMove(
    matchId: string,
    expectedVersion: number,
    move: MoveData,
    advance: (match: Match) => NextPosition,
  ) {
    return this.withLockedMatch(matchId, async (tx, match) => {
      const existing = await tx.move.findUnique({
        where: { matchId_moveId: { matchId, moveId: move.moveId } },
      });
      if (existing) return { move: existing, replayed: true };
      if (match.status !== 'IN_PROGRESS') throw new DomainException(ErrorCode.GAME_FINISHED);
      if (match.version !== expectedVersion) throw new DomainException(ErrorCode.STALE_STATE);

      const next = advance(match);
      const last = await tx.move.findFirst({
        where: { matchId },
        orderBy: { ply: 'desc' },
        select: { ply: true },
      });
      const stored = await tx.move.create({
        data: { ...move, matchId, ply: (last?.ply ?? 0) + 1, clockAfter: next.clocks },
      });
      await tx.match.update({
        where: { matchId },
        data: { ...next, version: { increment: 1 } },
      });
      return { move: stored, replayed: false };
    });
  }
}
