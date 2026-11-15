import {
  AI_DIFFICULTIES,
  END_REASONS,
  GAME_MODES,
  MATCH_STATUSES,
  SIDES,
  type AiDifficulty,
  type EndReason,
  type GameMode,
  type MatchStatus,
  type Side,
  type TimeControl,
} from '@xiangqi/shared';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GuestSession } from './guest-session.entity';
import { Room } from './room.entity';

/** Remaining time per side at the last committed state (server clock, FR-13). */
export interface MatchClocks {
  redMs: number;
  blackMs: number;
  /** When the side to move started thinking; null before the first move or after the end. */
  turnStartedAt: string | null;
}

/**
 * A PVP, PVE or ranked game (SRS 3.4, 8.2). The server is the source of truth:
 * `version` increases on every committed change and `snapshot` is the board at that version.
 * PVP matches have a room and two guests; PVE matches have no room, one guest and an AI side.
 */
@Entity({ name: 'match' })
@Check(
  'chk_match_pve_has_ai',
  `(mode <> 'PVE') OR (ai_side IS NOT NULL AND ai_difficulty IS NOT NULL)`,
)
@Check('chk_match_version_non_negative', `version >= 0`)
export class Match {
  @PrimaryGeneratedColumn('uuid', { name: 'match_id' })
  matchId!: string;

  @Column({ type: 'enum', enum: GAME_MODES, enumName: 'game_mode' })
  mode!: GameMode;

  @Column({ name: 'room_id', type: 'varchar', length: 43, nullable: true })
  roomId!: string | null;

  @ManyToOne(() => Room, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'room_id' })
  room?: Room | null;

  @Index()
  @Column({ name: 'red_guest_id', type: 'uuid', nullable: true })
  redGuestId!: string | null;

  @ManyToOne(() => GuestSession, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'red_guest_id' })
  redGuest?: GuestSession | null;

  @Index()
  @Column({ name: 'black_guest_id', type: 'uuid', nullable: true })
  blackGuestId!: string | null;

  @ManyToOne(() => GuestSession, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'black_guest_id' })
  blackGuest?: GuestSession | null;

  @Column({ name: 'ai_side', type: 'enum', enum: SIDES, enumName: 'side', nullable: true })
  aiSide!: Side | null;

  @Column({
    name: 'ai_difficulty',
    type: 'enum',
    enum: AI_DIFFICULTIES,
    enumName: 'ai_difficulty',
    nullable: true,
  })
  aiDifficulty!: AiDifficulty | null;

  @Column({ type: 'enum', enum: MATCH_STATUSES, enumName: 'match_status', default: 'IN_PROGRESS' })
  status!: MatchStatus;

  @Column({ name: 'time_control', type: 'jsonb' })
  timeControl!: TimeControl;

  @Column({ type: 'enum', enum: SIDES, enumName: 'side', default: 'RED' })
  turn!: Side;

  @Column({ type: 'integer', default: 0 })
  version!: number;

  /** Board state at `version`; the format is defined by @xiangqi/rules (US-08). */
  @Column({ type: 'jsonb' })
  snapshot!: unknown;

  @Column({ type: 'jsonb' })
  clocks!: MatchClocks;

  /** Winner side; null while in progress or on a draw. */
  @Column({ type: 'enum', enum: SIDES, enumName: 'side', nullable: true })
  winner!: Side | null;

  @Column({
    name: 'end_reason',
    type: 'enum',
    enum: END_REASONS,
    enumName: 'end_reason',
    nullable: true,
  })
  endReason!: EndReason | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  /** Used by the 30-day retention job (BR-20). */
  @Index()
  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt!: Date | null;
}
