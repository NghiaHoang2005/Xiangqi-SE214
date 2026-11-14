import { Controller, Get } from '@nestjs/common';

/**
 * /api/health: the process is up (used by the Docker healthcheck).
 * /api/ready with a PostgreSQL check comes in US-05 (UC-14, FR-26).
 */
@Controller('health')
export class HealthController {
  @Get()
  health() {
    return { status: 'ok', uptimeSeconds: Math.round(process.uptime()) };
  }
}
