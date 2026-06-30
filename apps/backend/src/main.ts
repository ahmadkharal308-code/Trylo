import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

// In Node 18+, an unhandled promise rejection terminates the process by default.
// On a hosted platform that surfaces as "the app ran fine, then crashed after a
// while" the first time an edge case (a dropped DB connection, a malformed
// request) slips through. Log loudly and keep serving instead of dying.
process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('[TRYLO] Unhandled promise rejection (kept alive):', reason);
});
process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('[TRYLO] Uncaught exception (kept alive):', err);
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow requests from the frontend (Vercel domain or custom domain).
  // CORS_ORIGIN env var accepts a comma-separated list; defaults to all origins in dev.
  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    origin: corsOrigin
      ? corsOrigin.split(',').map((s) => s.trim())
      : true,
    credentials: true,
  });

  // Validate/strip incoming payloads globally (used heavily from the next milestone on).
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);

  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`Trylo backend listening on port ${port}`);
}

bootstrap();
