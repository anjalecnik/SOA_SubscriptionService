import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  AmqpConnectionManager,
  ChannelWrapper,
  connect as amqpConnect,
} from 'amqp-connection-manager';
import { getCorrelationId } from './correlation-id.storage';

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

@Injectable()
export class RabbitLoggerService implements OnModuleInit, OnModuleDestroy {
  private connection!: AmqpConnectionManager;
  private channel!: ChannelWrapper;
  private ready = false;

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
    const url = `amqp://${encodeURIComponent(this.user)}:${encodeURIComponent(
      this.pass,
    )}@${this.host}:${this.port}`;

    try {
      this.connection = amqpConnect([url]);
      this.channel = this.connection.createChannel({
        setup: async (ch) => {
          await ch.assertExchange(this.exchange, 'direct', { durable: true });
          await ch.assertQueue(this.queue, { durable: true });
          await ch.bindQueue(this.queue, this.exchange, this.routingKey);
        },
      });

      this.ready = true;

      // optional: test log
      await this.info('Rabbit logger started', {
        path: '/startup',
        method: 'INIT',
      });
    } catch (err) {
      this.ready = false;
      // eslint-disable-next-line no-console
      console.error('[RabbitLogger] Failed to initialize:', err);
    }
  }

  async onModuleDestroy() {
    try {
      await this.channel?.close();
    } catch {}
    try {
      await this.connection?.close();
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
    if (!this.ready) return;

    const correlationId = meta?.correlation_id ?? getCorrelationId();
    const url = meta?.url ?? meta?.path ?? '';
    const timestamp = new Date().toISOString();

    const payload = {
      timestamp,
      level,
      message,
      service: this.serviceName,
      correlation_id: correlationId ?? null,
      url,
      method: meta?.method ?? '',
      status_code: meta?.status_code ?? null,
      detail: meta?.detail ?? null,
      formatted: `${timestamp} ${level} ${url} Correlation:${correlationId ?? '-'} [${this.serviceName}] - ${message}`,
    };

    await this.channel.publish(
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
