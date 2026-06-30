import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          // eslint-disable-next-line no-console
          console.warn('[TRYLO] WARNING: JWT_SECRET env var is not set. Using a temporary random secret — all tokens will be invalidated on restart. Set JWT_SECRET in Railway Variables immediately.');
        }
        return {
          secret: secret ?? require('crypto').randomBytes(32).toString('hex'),
          signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '7d') },
        };
      },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [JwtModule],
})
export class AuthModule {}
