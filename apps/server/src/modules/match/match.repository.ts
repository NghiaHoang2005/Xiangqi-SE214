import { Inject, Injectable } from '@nestjs/common';
import type {
  ActorType,
  CheckState,
  EndReason,
  Match,
  Move,
  Prisma,
  PrismaClient,
  Side,
} from '@prisma/client';
import { ErrorCode, type MoveRejectionCode, type Piece, type Square } from '@xiangqi/shared';
import { DomainException } from '../../common/domain.exception';
import { PrismaService } from '../../database/prisma.service';

const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

/** A SubmitMove as the gateway received it. The caller has already checked the seat. */
export interface MoveSubmission {
  moveId: string;
  actorType: ActorType;
  /** Null for AI moves. */
  guestId: string | null;
  from: Square;
  to: Square;
}

/** How a match ended (FR-19). `winner` is null on a draw. */
export interface MatchEnd {
  winner: Side | null;
  endReason: EndReason;
}

/** The reducer accepted the move: the position and clocks after it. */
export interface AcceptedMove {
  kind: 'accept';
  capture: Piece | null;
  /** Board after the move. */
  snapshot: Prisma.InputJsonValue;
  fen: string;
  stateHash: string;
  /** Check state of the side to move next. */
  checkState: CheckState;
  clocks: Prisma.InputJsonValue;
  turn: Side;
  /** Set when this move ends the match (checkmate, stalemate). */
  end?: MatchEnd;
}

/**
 * The reducer refused the move. With `end` the match is finished and stored before the
 * refusal, e.g. a move that arrives after the clock deadline: GAME_FINISHED + TIMEOUT (FR-18).
 */
export interface RejectedMove {
  kind: 'reject';
  code: MoveRejectionCode;
  end?: MatchEnd & { clocks: Prisma.InputJsonValue };
}

export type MoveDecision = AcceptedMove | RejectedMove;

/**
 * `match` is the row after the transaction, so the caller can build the Ack or the
 * MoveRejected snapshot from it (docs/api-contract.md section 6).
 */
export type CommitResult =
  | { status: 'accepted'; move: Move; match: Match; replayed: boolean }
  | { status: 'rejected'; code: MoveRejectionCode; match: Match };

const sameSquare = (stored: Prisma.JsonValue, square: Square) => {
  const s = stored as Partial<Square> | null;
  return s?.file === square.file && s?.rank === square.rank;
};

const finished = (end: MatchEnd, now: Date) => ({
  status: 'FINISHED' as const,
  winner: end.winner,
  endReason: end.endReason,
  endedAt: now,
});

@Injectable()
export class MatchRepository {
  constructor(@Inject(PrismaService) private readonly db: PrismaClient) {}

  /** Runs `work` in a transaction holding the match row lock, so commits are serialized. */
  async withLockedMatch<T>(
    matchId: string,
    work: (tx: Prisma.TransactionClient, match: Match) => Promise<T>,
  ): Promise<T> {
    if (!UUID.test(matchId)) throw new DomainException(ErrorCode.NOT_FOUND);
    return this.db.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ match_id: string }>>`
        SELECT match_id FROM "match" WHERE match_id = ${matchId}::uuid FOR UPDATE
      `;
      if (!locked.length) throw new DomainException(ErrorCode.NOT_FOUND);
      const match = await tx.match.findUniqueOrThrow({ where: { matchId } });
      return work(tx, match);
    });
  }

  /**
   * Commits one move against `expectedVersion` (SRS 3.3). `decide` is the rules reducer: it
   * runs on the locked match, after the version check, and never sees a finished match.
   *
   * Refusals are returned, not thrown, so a match that `decide` finishes is stored with them.
   * A retry with a committed moveId returns that move even after the match moved on or ended.
   */
  async commitMove(
    matchId: string,
    expectedVersion: number,
    submission: MoveSubmission,
    decide: (match: Match) => MoveDecision,
  ): Promise<CommitResult> {
    return this.withLockedMatch(matchId, async (tx, match) => {
      const existing = await tx.move.findUnique({
        where: { matchId_moveId: { matchId, moveId: submission.moveId } },
      });
      if (existing) {
        const same =
          existing.guestId === submission.guestId &&
          sameSquare(existing.fromSquare, submission.from) &&
          sameSquare(existing.toSquare, submission.to);
        // A reused moveId for another move is a client bug, not a retry.
        if (!same) {
          throw new DomainException(
            ErrorCode.VALIDATION_FAILED,
            'moveId was already used for another move',
            undefined,
            { field: 'moveId' },
          );
        }
        return { status: 'accepted', move: existing, match, replayed: true };
      }

      if (match.status !== 'IN_PROGRESS') {
        return { status: 'rejected', code: ErrorCode.GAME_FINISHED, match };
      }
      if (match.version !== expectedVersion) {
        return { status: 'rejected', code: ErrorCode.STALE_STATE, match };
      }

      const decision = decide(match);
      const now = new Date();

      if (decision.kind === 'reject') {
        if (!decision.end) return { status: 'rejected', code: decision.code, match };
        const ended = await tx.match.update({
          where: { matchId },
          data: {
            ...finished(decision.end, now),
            clocks: decision.end.clocks,
            version: { increment: 1 },
          },
        });
        return { status: 'rejected', code: decision.code, match: ended };
      }

      const version = match.version + 1;
      const last = await tx.move.findFirst({
        where: { matchId },
        orderBy: { ply: 'desc' },
        select: { ply: true },
      });
      const move = await tx.move.create({
        data: {
          matchId,
          ply: (last?.ply ?? 0) + 1,
          moveId: submission.moveId,
          actorType: submission.actorType,
          guestId: submission.guestId,
          fromSquare: { file: submission.from.file, rank: submission.from.rank },
          toSquare: { file: submission.to.file, rank: submission.to.rank },
          capture: decision.capture ? { ...decision.capture } : undefined,
          clockAfter: decision.clocks,
          stateHash: decision.stateHash,
          version,
          fen: decision.fen,
          checkState: decision.checkState,
        },
      });
      const updated = await tx.match.update({
        where: { matchId },
        data: {
          snapshot: decision.snapshot,
          clocks: decision.clocks,
          turn: decision.turn,
          version,
          ...(decision.end ? finished(decision.end, now) : {}),
        },
      });
      return { status: 'accepted', move, match: updated, replayed: false };
    });
  }
}
