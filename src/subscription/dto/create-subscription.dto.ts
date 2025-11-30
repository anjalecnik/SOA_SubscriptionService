import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  IsNumber,
} from 'class-validator';
import type { SubscriptionInterval } from '../entities/subscription.entity';

export class CreateSubscriptionDto {
  @ApiProperty({
    description: 'ID uporabnika (UUID) iz Auth/Account servisa',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Ime naročnine / stroška',
    example: 'Netflix Premium',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Znesek naročnine',
    example: 15.99,
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'Valuta',
    example: 'EUR',
  })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({
    description: 'Interval ponavljanja',
    example: 'monthly',
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
  })
  @IsIn(['daily', 'weekly', 'monthly', 'yearly'])
  interval: SubscriptionInterval;

  @ApiProperty({
    description: 'Datum začetka naročnine (ISO)',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Koliko dni pred bremenitvijo pošljemo reminder',
    example: 3,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  notificationOffsetDays?: number;

  @ApiProperty({
    description: 'Kategorija stroška v Expense servisu',
    example: 'a56b47f1-7a8d-4c10-9e3a-123456789abc',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  expenseCategoryId?: string;
}
