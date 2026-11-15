import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { loadDotEnv } from './env';

loadDotEnv();

async function bootstrap() {
  const app = configureApp(await NestFactory.create(AppModule));
  const port = Number(process.env.SERVER_PORT ?? 3000);
  await app.listen(port);
  console.log(`Server listening on http://localhost:${port}/api`);
}

void bootstrap();
