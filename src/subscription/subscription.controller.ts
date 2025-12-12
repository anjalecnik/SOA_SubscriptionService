import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { Subscription } from './entities/subscription.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  // ─────────────────────────────────────────────
  // POST (1) — Create subscription
  // ─────────────────────────────────────────────
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Ustvari novo naročnino (recurring subscription)' })
  @ApiBody({ type: CreateSubscriptionDto })
  @ApiResponse({
    status: 201,
    description: 'Naročnina ustvarjena',
    type: Subscription,
  })
  create(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptionService.create(dto);
  }

  // ─────────────────────────────────────────────
  // POST (2) — Trigger manual renewal
  // ─────────────────────────────────────────────
  @Post(':id/trigger')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Ročno sproži ustvarjanje novega expense-a' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: 'Expense uspešno ustvarjen' })
  async trigger(@Param('id') id: string) {
    return this.subscriptionService.manualTrigger(id);
  }

  // ─────────────────────────────────────────────
  // GET (1) — Subscriptions by user
  // ─────────────────────────────────────────────
  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Pridobi vse naročnine uporabnika' })
  @ApiParam({ name: 'userId', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Seznam naročnin',
    type: [Subscription],
  })
  findByUser(@Param('userId') userId: string) {
    return this.subscriptionService.findByUser(userId);
  }

  // ─────────────────────────────────────────────
  // GET (2) — One subscription
  // ─────────────────────────────────────────────
  @Get(':id/user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Pridobi eno naročnino' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiParam({ name: 'userId', type: 'string' })
  @ApiResponse({ status: 200, type: Subscription })
  findOne(@Param('id') id: string, @Param('userId') userId: string) {
    return this.subscriptionService.findOne(id, userId);
  }

  // ─────────────────────────────────────────────
  // PUT (1) — Update subscription
  // ─────────────────────────────────────────────
  @Put(':id/user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Posodobi naročnino' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiParam({ name: 'userId', type: 'string' })
  @ApiBody({ type: UpdateSubscriptionDto })
  @ApiResponse({
    status: 200,
    description: 'Naročnina posodobljena',
    type: Subscription,
  })
  update(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionService.update(id, userId, dto);
  }

  // ─────────────────────────────────────────────
  // PUT (2) — Pause subscription
  // ─────────────────────────────────────────────
  @Put(':id/pause')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Začasno ustavi naročnino' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: 'Naročnina je začasno ustavljena' })
  pause(@Param('id') id: string) {
    return this.subscriptionService.pause(id);
  }

  // ─────────────────────────────────────────────
  // DELETE (1) — Soft delete / deactivate
  // ─────────────────────────────────────────────
  @Delete(':id/user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Deaktiviraj naročnino' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiParam({ name: 'userId', type: 'string' })
  @ApiResponse({ status: 200, description: 'Naročnina deaktivirana' })
  deactivate(@Param('id') id: string, @Param('userId') userId: string) {
    return this.subscriptionService.deactivate(id, userId);
  }

  // ─────────────────────────────────────────────
  // DELETE (2) — Hard delete
  // ─────────────────────────────────────────────
  @Delete(':id/force')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Trajno izbriši naročnino (hard delete)' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: 'Naročnina je trajno izbrisana' })
  hardDelete(@Param('id') id: string) {
    return this.subscriptionService.hardDelete(id);
  }
}
