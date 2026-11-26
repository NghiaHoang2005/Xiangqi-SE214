import { Module } from '@nestjs/common';
import { AuthModule } from '../modules/auth/auth.module';
import { GameGateway } from './game.gateway';

@Module({ imports: [AuthModule], providers: [GameGateway] })
export class GatewayModule {}
