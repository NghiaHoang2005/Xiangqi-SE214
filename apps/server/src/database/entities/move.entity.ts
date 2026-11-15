import { ACTOR_TYPES, type ActorType } from '@xiangqi/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Match, type MatchClocks } from './match.entity';

/** A board intersection, same shape as @xiangqi/rules `Square`. */
export interface SquareJson {
  file: number;
  rank: number;
}

/**
 * A committed move (FR-10, FR-22). Only accepted moves are stored; rejected ones never are.
 * (match, ply) is the primary key, so plies cannot repeat; (match, moveId) is unique, so a
 * client retry with the same moveId cannot commit twice (idempotency, SRS 3.3).
 */
@Entity({ name: 'move' })
@Index('uq_move_match_move_id', ['matchId', 'moveId'], { unique: true })
export class Move {
  @PrimaryColumn({ name: 'match_id', type: 'uuid' })
  matchId!: string;

  @PrimaryColumn({ type: 'integer' })
  ply!: number;

  @ManyToOne(() => Match, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'match_id' })
  match?: Match;

  /** Client-generated idempotency key (AI moves get a server-generated one). */
  @Column({ name: 'move_id', type: 'uuid' })
  moveId!: string;

  @Column({ name: 'actor_type', type: 'enum', enum: ACTOR_TYPES, enumName: 'actor_type' })
  actorType!: ActorType;

  /** Null for AI moves. */
  @Column({ name: 'guest_id', type: 'uuid', nullable: true })
  guestId!: string | null;

  @Column({ name: 'from_square', type: 'jsonb' })
  from!: SquareJson;

  @Column({ name: 'to_square', type: 'jsonb' })
  to!: SquareJson;

  /** Captured piece, if any (BR-10). */
  @Column({ type: 'jsonb', nullable: true })
  capture!: unknown | null;

  @Column({ name: 'clock_after', type: 'jsonb' })
  clockAfter!: MatchClocks;

  /** Hash of the board after this move, used to check both clients converge (NFR-06). */
  @Column({ name: 'state_hash', type: 'char', length: 64 })
  stateHash!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
