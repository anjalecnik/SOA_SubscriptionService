import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { RequestLoggingInterceptor } from './logging/request-logging.interceptor';
import { RabbitLoggerService } from './logging/rabbit-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: true, credentials: true });

  const config = new DocumentBuilder()
    .setTitle('My API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const rabbitLogger = app.get(RabbitLoggerService);
  app.useGlobalInterceptors(new RequestLoggingInterceptor(rabbitLogger));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
