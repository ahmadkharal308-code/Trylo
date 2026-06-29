import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { SellersModule } from './modules/sellers/sellers.module';
import { AdminModule } from './modules/admin/admin.module';

/**
 * Root application module.
 *
 * Milestone 2 adds: user auth (register/login/JWT), seller onboarding,
 * Gate 1 verification flow (CNIC + docs + phone OTP), and admin review endpoints.
 *
 * Feature modules for later milestones (products, taxonomy, swipes, orders, etc.)
 * are in src/modules/* as empty placeholders — they'll be registered here as
 * each milestone is built.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    SellersModule,
    AdminModule,
  ],
})
export class AppModule {}
