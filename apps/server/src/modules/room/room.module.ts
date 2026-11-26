import { Module } from '@nestjs/common';
import { RoomService } from './room.service';

/** Private rooms: create, join by link/code, seats, expiry (US-13, US-14, US-15). */
@Module({ providers: [RoomService], exports: [RoomService] })
export class RoomModule {}
