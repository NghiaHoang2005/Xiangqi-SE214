import { CONNECTION_STATES, SIDES, type ConnectionState, type Side } from '@xiangqi/shared';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { GuestSession } from './guest-session.entity';
import { Room } from './room.entity';

/**
 * One of the two seats of a room (FR-04). The composite key (room, side) makes a third
 * seat impossible at the database level; (room, guest) stops one guest taking both seats.
 */
@Entity({ name: 'room_seat' })
@Index('uq_room_seat_guest', ['roomId', 'guestId'], { unique: true })
export class RoomSeat {
  @PrimaryColumn({ name: 'room_id', type: 'varchar', length: 43 })
  roomId!: string;

  @PrimaryColumn({ type: 'enum', enum: SIDES, enumName: 'side' })
  side!: Side;

  @Column({ name: 'guest_id', type: 'uuid' })
  guestId!: string;

  @ManyToOne(() => Room, (room) => room.seats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room?: Room;

  @ManyToOne(() => GuestSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'guest_id' })
  guest?: GuestSession;

  @Column({ name: 'joined_at', type: 'timestamptz', default: () => 'now()' })
  joinedAt!: Date;

  @Column({
    name: 'connection_state',
    type: 'enum',
    enum: CONNECTION_STATES,
    enumName: 'connection_state',
    default: 'CONNECTED',
  })
  connectionState!: ConnectionState;

  /** When the seat dropped; the 10-minute reconnect grace runs from here (CFG-08). */
  @Column({ name: 'disconnected_at', type: 'timestamptz', nullable: true })
  disconnectedAt!: Date | null;
}
