import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { als } from './correlation-id.storage';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = (req.header('X-Correlation-Id') || '').trim();
    const correlationId = incoming || randomUUID();

    res.setHeader('X-Correlation-Id', correlationId);

    als.run({ correlationId }, () => next());
  }
}
