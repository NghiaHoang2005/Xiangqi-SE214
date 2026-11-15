import { GuestSession } from './guest-session.entity';
import { Match } from './match.entity';
import { Move } from './move.entity';
import { RoomSeat } from './room-seat.entity';
import { Room } from './room.entity';

export { GuestSession, Match, Move, Room, RoomSeat };
export type { MatchClocks } from './match.entity';
export type { SquareJson } from './move.entity';

export const ENTITIES = [GuestSession, Room, RoomSeat, Match, Move];
