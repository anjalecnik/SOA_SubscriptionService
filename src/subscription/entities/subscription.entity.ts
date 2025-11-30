import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type SubscriptionInterval = 'daily' | 'weekly' | 'monthly' | 'yearly';

@Entity()
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // user from Auth/Account servisa (UUID)
  @Column({ type: 'uuid' })
  userId: string;

  @Column()
  name: string; // npr. "Netflix", "Najemnina"

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column({ default: 'EUR' })
  currency: string;

  @Column({ type: 'varchar' })
  interval: SubscriptionInterval;

  @Column({ type: 'timestamptz' })
  startDate: Date;

  // naslednji termin izvršitve (kadar crearamo expense)
  @Column({ type: 'timestamptz' })
  nextRunAt: Date;

  // zadnjič, ko je bil expense ustvarjen
  @Column({ type: 'timestamptz', nullable: true })
  lastRunAt: Date | null;

  // reminder logika
  @Column({ type: 'int', default: 1 })
  notificationOffsetDays: number; // koliko dni prej pošljemo reminder

  @Column({ type: 'timestamptz', nullable: true })
  lastReminderAt: Date | null;

  @Column({ default: true })
  isActive: boolean;

  // opcijsko: kategorija v Expense servisu
  @Column({ type: 'uuid', nullable: true })
  expenseCategoryId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
