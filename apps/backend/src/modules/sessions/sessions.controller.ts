import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../auth/decorators/current-user.decorator';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { RecordSwipeDto } from './dto/record-swipe.dto';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  /**
   * Start a new swipe session.
   * POST /sessions  { "department": "WOMEN" }
   */
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSessionDto) {
    return this.sessions.create(user, dto);
  }

  /**
   * Get session state (phase, swipe count, swipe history).
   * GET /sessions/:id
   */
  @Get(':id')
  getSession(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sessions.getSession(user, id);
  }

  /**
   * Get the next product to show for swiping.
   * GET /sessions/:id/next
   *
   * Returns: { phase, swipeNumber, totalSwipes, product }
   * Call this before each swipe to get the card to display.
   */
  @Get(':id/next')
  getNext(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sessions.getNext(user, id);
  }

  /**
   * Record a swipe gesture on a product.
   * POST /sessions/:id/swipe  { "productId": "...", "direction": "RIGHT" | "LEFT" | "UP" }
   *
   * UP = "maybe" — always a REDUCED-WEIGHT POSITIVE signal (spec + CLAUDE.md constraint #7).
   * Phase and weight are computed server-side (client cannot forge them).
   */
  @Post(':id/swipe')
  recordSwipe(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordSwipeDto,
  ) {
    return this.sessions.recordSwipe(user, id, dto);
  }

  /**
   * Skip swiping and jump straight to results.
   * POST /sessions/:id/skip
   *
   * Results will use variety-enforced defaults when no swipe data exists.
   */
  @Post(':id/skip')
  @HttpCode(HttpStatus.OK)
  skip(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sessions.skip(user, id);
  }

  /**
   * Fetch results after swiping is complete (or after skipping).
   * GET /sessions/:id/results
   */
  @Get(':id/results')
  getResults(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sessions.getResults(user, id);
  }
}
