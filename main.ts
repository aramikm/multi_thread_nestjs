import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Increase payload size limit to 50MB (adjust as needed)
  app.use(json({ limit: '1000mb' }));
  app.use(urlencoded({ limit: '1000mb', extended: true }));
  
  await app.listen(3000);
  console.log('Server running on http://localhost:3000');
  console.log('Body size limit: 1000MB');
}
bootstrap();