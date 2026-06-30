import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Department } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../auth/decorators/current-user.decorator';
import { RecommendationService } from './recommendation.service';

class FeedQueryDto {
  @IsEnum(Department)
  department: Department;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationsController {
  constructor(private readonly rec: RecommendationService) {}

  /**
   * Personalised product feed based on the user's full swipe history.
   * GET /recommendations?department=WOMEN
   *
   * Response includes the taste profile so the frontend can show
   * "because you liked embroidered, semi-formal styles" type hints.
   */
  @Get()
  feed(@CurrentUser() user: AuthUser, @Query() query: FeedQueryDto) {
    return this.rec.personalizedFeed(user.id, query.department, query.limit);
  }
}
