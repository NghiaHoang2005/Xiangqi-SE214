import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Temporary player identity (UC-01, FR-01). No password is stored; only the hash of the
 * 256-bit reconnect token is kept (NFR-08, NFR-10). Expires after 30 days of inactivity (CFG-07).
 */
@Entity({ name: 'guest_session' })
export class GuestSession {
  @PrimaryGeneratedColumn('uuid', { name: 'guest_id' })
  guestId!: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  nickname!: string | null;

  /** SHA-256 hex of the reconnect token; the raw token is never stored or logged. */
  @Index({ unique: true })
  @Column({ name: 'reconnect_token_hash', type: 'char', length: 64 })
  reconnectTokenHash!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'last_seen_at', type: 'timestamptz' })
  lastSeenAt!: Date;

  @Index()
  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;
}
