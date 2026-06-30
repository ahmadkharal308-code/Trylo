import { Module } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { RecommendationsController } from './recommendations.controller';

@Module({
  providers: [RecommendationService],
  controllers: [RecommendationsController],
  exports: [RecommendationService],
})
export class RecommendationsModule {}
