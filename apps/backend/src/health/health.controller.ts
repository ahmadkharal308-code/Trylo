import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Liveness/readiness check. Confirms the app is up AND that it can reach the database,
 * so a non-technical operator can verify the whole stack with a single request.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    let database = 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'up';
    } catch {
      database = 'down';
    }

    return {
      status: database === 'up' ? 'ok' : 'degraded',
      service: 'trylo-backend',
      database,
      timestamp: new Date().toISOString(),
    };
  }
}
