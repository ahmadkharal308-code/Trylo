import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

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
