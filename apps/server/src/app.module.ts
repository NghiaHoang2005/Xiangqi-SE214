import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { GatewayModule } from './gateway/gateway.module';
import { HealthModule } from './health/health.module';
import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClockModule } from './modules/clock/clock.module';
import { MatchModule } from './modules/match/match.module';
import { RoomModule } from './modules/room/room.module';
import { RulesModule } from './modules/rules/rules.module';

/** Root module. Each feature lives in its own module under src/modules (NFR-14). */
@Module({
  imports: [
    HealthModule,
    GatewayModule,
    AuthModule,
    RoomModule,
    MatchModule,
    RulesModule,
    ClockModule,
    AiModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
