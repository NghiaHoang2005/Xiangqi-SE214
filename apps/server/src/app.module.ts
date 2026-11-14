import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';

/**
 * Module gốc. Các module nghiệp vụ (room, match, rules, ai, clock, persistence, auth)
 * thêm vào đây theo NFR-14 — xem US-03.
 */
@Module({
  imports: [HealthModule],
})
export class AppModule {}
