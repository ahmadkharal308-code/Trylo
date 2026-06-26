import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';

/**
 * Root application module.
 *
 * Milestone 1 wires only the foundation: configuration, the database (Prisma), and a
 * health check. Feature modules under `src/modules/*` are intentionally empty
 * placeholders and will be registered here as each later milestone is built.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
  ],
})
export class AppModule {}
