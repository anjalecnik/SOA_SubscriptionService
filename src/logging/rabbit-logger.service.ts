import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import { getCorrelationId } from './correlation-id.storage';

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

@Injectable()
export class RabbitLoggerService implements OnModuleInit, OnModuleDestroy {
  private conn?: amqp.Connection;
  private channel?: amqp.Channel;

  private readonly host = process.env.RABBITMQ_HOST ?? 'rabbitmq';
  private readonly port = Number(process.env.RABBITMQ_PORT ?? '5672');
  private readonly user = process.env.RABBITMQ_USER ?? 'guest';
  private readonly pass = process.env.RABBITMQ_PASSWORD ?? 'guest';
  private readonly exchange = process.env.RABBITMQ_EXCHANGE ?? 'logs-exchange';
  private readonly routingKey =
    process.env.RABBITMQ_ROUTING_KEY ?? 'logs.route';
  private readonly queue = process.env.RABBITMQ_QUEUE ?? 'logs-queue';

  private readonly serviceName = process.env.SERVICE_NAME ?? 'soa-subscription';

  async onModuleInit() {
    const url = `amqp://${encodeURIComponent(this.user)}:${encodeURIComponent(this.pass)}@${this.host}:${this.port}`;
    this.conn = await amqp.connect(url);
    this.channel = await this.conn.createChannel();

    await this.channel.assertExchange(this.exchange, 'direct', {
      durable: true,
    });

    await this.channel.assertQueue(this.queue, { durable: true });
    await this.channel.bindQueue(this.queue, this.exchange, this.routingKey);
  }

  async onModuleDestroy() {
    try {
      await this.channel?.close();
    } catch {}
    try {
      await this.conn?.close();
    } catch {}
  }

  async log(
    level: LogLevel,
    message: string,
    meta?: Partial<{
      url: string;
      path: string;
      method: string;
      status_code: number;
      detail: string;
      correlation_id: string;
    }>,
  ) {
    if (!this.channel) return;

    const correlationId = meta?.correlation_id ?? getCorrelationId();
    const url = meta?.url ?? meta?.path ?? '';

    const timestamp = new Date().toISOString();
    const payload = {
      timestamp,
      level,
      message,
      service: this.serviceName,
      correlation_id: correlationId,
      url,
      method: meta?.method ?? '',
      status_code: meta?.status_code ?? null,
      detail: meta?.detail ?? null,
      formatted: `${timestamp} ${level} ${url} Correlation:${correlationId ?? '-'} [${this.serviceName}] - ${message}`,
    };

    this.channel.publish(
      this.exchange,
      this.routingKey,
      Buffer.from(JSON.stringify(payload)),
      { contentType: 'application/json', persistent: true },
    );
  }

  info(message: string, meta?: any) {
    return this.log('INFO', message, meta);
  }
  warn(message: string, meta?: any) {
    return this.log('WARN', message, meta);
  }
  error(message: string, meta?: any) {
    return this.log('ERROR', message, meta);
  }
}
