import { Module } from '@nestjs/common';
import { AuthModule } from '../modules/auth/auth.module';
import { RoomModule } from '../modules/room/room.module';
import { GameGateway } from './game.gateway';

@Module({ imports: [AuthModule, RoomModule], providers: [GameGateway] })
export class GatewayModule {}
