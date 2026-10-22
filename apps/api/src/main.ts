import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { loadConfig } from './config/app-config';
import { DomainErrorFilter } from './shared/domain-error.filter';

async function bootstrap() {
  const config = loadConfig();
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors({ origin: config.corsOrigins.length ? config.corsOrigins : false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new DomainErrorFilter());
  app.enableShutdownHooks();

  SwaggerModule.setup(
    'docs',
    app,
    SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Quero Assistir API').setVersion('1').addBearerAuth().build(),
    ),
  );

  await app.listen(config.port, '0.0.0.0');
  new Logger('Bootstrap').log(`API em http://localhost:${config.port} (docs em /docs)`);
}

void bootstrap();
