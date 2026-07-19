import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3333);
  // eslint-disable-next-line no-console
  console.log('Example app listening on http://localhost:3333');
}

bootstrap();
