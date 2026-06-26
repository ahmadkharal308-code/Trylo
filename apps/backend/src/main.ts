import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  // Ensure the upload directory exists before Multer tries to write into it
  mkdirSync(join(process.cwd(), 'uploads', 'seller-docs'), { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  // Serve uploaded seller documents (CNIC photos, business proofs) as static files.
  // Files have random timestamped names; the admin page (auth-protected) links to them.
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);

  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Trylo backend listening on http://localhost:${port}`);
}

bootstrap();
