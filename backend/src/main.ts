import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import * as express from 'express';
import { join } from 'path';

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { UPLOADS_DIR } from './modules/uploads/uploads.controller';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  app.setGlobalPrefix('api');

  // Mismo prefijo /api que el resto de la API, para que el proxy de nginx
  // del frontend (que ya reenvía todo /api/*) sirva las imágenes sin
  // necesitar una regla nueva.
  app.use('/api/uploads', express.static(UPLOADS_DIR));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,

      transform: true,

      forbidNonWhitelisted: true,
    }),
  );

  // Necesario para que @Exclude() de class-transformer tenga efecto
  // en las entidades (por ejemplo, ocultar el password de User).
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  const config = new DocumentBuilder()
    .setTitle('Mapa Social API')
    .setDescription('API REST del proyecto Mapa Social')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT || 3000);

  console.log(
    `🚀 API ejecutándose en http://localhost:${process.env.PORT || 3000}`,
  );

  console.log(
    `📚 Swagger disponible en http://localhost:${process.env.PORT || 3000}/docs`,
  );
}

bootstrap();
