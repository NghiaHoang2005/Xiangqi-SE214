import { Controller, Get } from '@nestjs/common';

/**
 * /api/health: tiến trình đang chạy (dùng cho healthcheck Docker).
 * /api/ready kiểm tra PostgreSQL sẽ làm ở US-05 (UC-14, FR-26).
 */
@Controller('health')
export class HealthController {
  @Get()
  health() {
    return { status: 'ok', uptimeSeconds: Math.round(process.uptime()) };
  }
}
