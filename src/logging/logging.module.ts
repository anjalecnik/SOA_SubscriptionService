import { Module } from '@nestjs/common';
import { RabbitLoggerService } from './rabbit-logger.service';
import { HttpCorrelationInterceptor } from './http-correlation.interceptor';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [RabbitLoggerService, HttpCorrelationInterceptor],
  exports: [RabbitLoggerService],
})
export class LoggingModule {}
