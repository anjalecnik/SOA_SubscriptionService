import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import {
  Subscription,
  SubscriptionInterval,
} from './entities/subscription.entity';
import { RabbitLoggerService } from 'src/logging/rabbit-logger.service';

@Injectable()
export class SubscriptionService {
  private readonly expenseServiceUrl: string | undefined;
  private readonly notificationServiceUrl: string | undefined;

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    private readonly config: ConfigService,
    private readonly http: HttpService,
    private readonly rabbitLogger: RabbitLoggerService,
  ) {
    this.expenseServiceUrl = this.config.get<string>('EXPENSE_SERVICE_URL');
    this.notificationServiceUrl = this.config.get<string>(
      'NOTIFICATION_SERVICE_URL',
    );
  }

  async create(dto: CreateSubscriptionDto): Promise<Subscription> {
    const startDate = new Date(dto.startDate);

    const sub = this.subscriptionRepo.create({
      userId: dto.userId,
      name: dto.name,
      amount: dto.amount,
      currency: dto.currency,
      interval: dto.interval,
      startDate,
      nextRunAt: startDate, // prva bremenitev na startDate
      notificationOffsetDays: dto.notificationOffsetDays ?? 1,
      expenseCategoryId: dto.expenseCategoryId ?? null,
    });

    return this.subscriptionRepo.save(sub);
  }

  async findByUser(userId: string): Promise<Subscription[]> {
    return this.subscriptionRepo.find({
      where: { userId, isActive: true },
      order: { nextRunAt: 'ASC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Subscription | null> {
    return this.subscriptionRepo.findOne({ where: { id, userId } });
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateSubscriptionDto,
  ): Promise<Subscription> {
    const sub = await this.findOne(id, userId);
    if (!sub) {
      throw new Error('Subscription not found');
    }

    Object.assign(sub, dto);

    if (dto.startDate) {
      sub.startDate = new Date(dto.startDate);
    }

    return this.subscriptionRepo.save(sub);
  }

  async deactivate(id: string, userId: string): Promise<void> {
    await this.subscriptionRepo.update({ id, userId }, { isActive: false });
  }

  async manualTrigger(id: string) {
    const sub = await this.subscriptionRepo.findOne({ where: { id } });
    if (!sub) throw new Error('Subscription not found');

    const now = new Date();
    await this.createExpense(sub);
    await this.scheduleNextRun(sub, now);
    return this.subscriptionRepo.save(sub);
  }

  async pause(id: string) {
    await this.subscriptionRepo.update({ id }, { isActive: false });
    return { message: 'Subscription paused' };
  }

  async hardDelete(id: string) {
    await this.subscriptionRepo.delete({ id });
    return { message: 'Subscription permanently removed' };
  }

  // ─────────────────────────────────────────────
  // CRON JOB – vsako minuto preveri due subscriptione
  // ─────────────────────────────────────────────

  @Cron(CronExpression.EVERY_MINUTE)
  async processDueSubscriptions() {
    const now = new Date();

    const dueSubs = await this.subscriptionRepo.find({
      where: {
        isActive: true,
        nextRunAt: LessThanOrEqual(now),
      },
    });

    if (!dueSubs.length) return;

    await this.rabbitLogger.info(`Processing ${dueSubs.length} subscriptions`, {
      path: '/cron/processDueSubscriptions',
      detail: `count=${dueSubs.length}`,
    });

    for (const sub of dueSubs) {
      try {
        await this.handleReminder(sub, now);
        await this.createExpense(sub);
        await this.scheduleNextRun(sub, now);

        await this.subscriptionRepo.save(sub);
      } catch (err) {
        await this.rabbitLogger.error(
          `Error processing subscription ${sub.id}`,
          {
            path: '/cron/processDueSubscriptions',
            detail: (err as any)?.message ?? String(err),
          },
        );
      }
    }
  }

  private getNextRunDate(
    currentNextRun: Date,
    interval: SubscriptionInterval,
  ): Date {
    const next = new Date(currentNextRun);

    switch (interval) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }

    return next;
  }

  private async scheduleNextRun(sub: Subscription, now: Date) {
    sub.lastRunAt = now;
    sub.nextRunAt = this.getNextRunDate(sub.nextRunAt, sub.interval);
    // reset reminder, da ga bomo za naslednji termin znova pošiljali
    sub.lastReminderAt = null;
  }

  private async handleReminder(sub: Subscription, now: Date) {
    if (!this.notificationServiceUrl) return;
    if (sub.notificationOffsetDays <= 0) return;

    const reminderTime = new Date(sub.nextRunAt);
    reminderTime.setDate(reminderTime.getDate() - sub.notificationOffsetDays);

    // reminder še ni čas
    if (reminderTime > now) return;

    // reminder za ta termin je že bil poslan
    if (sub.lastReminderAt && sub.lastReminderAt >= reminderTime) return;

    await this.sendReminder(sub, reminderTime);
    sub.lastReminderAt = now;
  }

  private async sendReminder(sub: Subscription, sendAt: Date) {
    // prilagodi payload Notification servisu
    await lastValueFrom(
      this.http.post(`${this.notificationServiceUrl}/notifications`, {
        userId: sub.userId,
        title: `Opomnik za naročnino: ${sub.name}`,
        body: `Čez ${sub.notificationOffsetDays} dni bo bremenitev ${sub.amount} ${sub.currency}.`,
        sendAt: sendAt.toISOString(),
        meta: {
          subscriptionId: sub.id,
          type: 'subscription-reminder',
        },
      }),
    );
  }

  private async createExpense(sub: Subscription) {
    if (!this.expenseServiceUrl) return;

    // ExpenseRequest
    const payload = {
      description: `Subscription payment: ${sub.name}`,
      items: [
        {
          item_id: sub.id,
          item_name: sub.name,
          item_price: Number(sub.amount), // Expense API expects number
          item_quantity: 1,
        },
      ],
    };

    await lastValueFrom(
      this.http.post(`${this.expenseServiceUrl}/expenses`, payload),
    );
  }
}
