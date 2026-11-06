import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useStaticAssets(join(process.cwd(), process.env.UPLOAD_DIR || 'uploads'), { prefix: '/api/files/' });
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`MIRA API running on http://localhost:${port}/api`);
}
bootstrap();
