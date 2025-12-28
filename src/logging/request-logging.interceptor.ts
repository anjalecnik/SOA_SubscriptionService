import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { RabbitLoggerService } from './rabbit-logger.service';
import { getCorrelationId } from './correlation-id.storage';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly rabbitLogger: RabbitLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const started = Date.now();
    const http = context.switchToHttp();
    const req: any = http.getRequest();
    const res: any = http.getResponse();

    const url = req?.originalUrl ?? req?.url ?? '';
    const method = req?.method ?? '';

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - started;
        void this.rabbitLogger.info('Request handled', {
          correlation_id: getCorrelationId(),
          url,
          method,
          status_code: res?.statusCode,
          detail: `${ms}ms`,
        });
      }),
      catchError((err) => {
        const ms = Date.now() - started;
        void this.rabbitLogger.error('Request failed', {
          correlation_id: getCorrelationId(),
          url,
          method,
          status_code: res?.statusCode ?? 500,
          detail: `${ms}ms - ${err?.message ?? String(err)}`,
        });
        throw err;
      }),
    );
  }
}
