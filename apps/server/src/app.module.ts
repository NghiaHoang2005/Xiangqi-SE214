import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';

/**
 * Root module. Feature modules (room, match, rules, ai, clock, persistence, auth)
 * are registered here, kept separate per NFR-14 — see US-03.
 */
@Module({
  imports: [HealthModule],
})
export class AppModule {}
