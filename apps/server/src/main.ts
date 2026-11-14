import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  const port = Number(process.env.SERVER_PORT ?? 3000);
  await app.listen(port);
  console.log(`Server đang chạy tại http://localhost:${port}/api`);
}

void bootstrap();
