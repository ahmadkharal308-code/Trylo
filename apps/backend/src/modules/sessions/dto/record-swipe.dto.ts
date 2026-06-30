import { IsEnum, IsUUID } from 'class-validator';
import { SwipeDirection } from '@prisma/client';

export class RecordSwipeDto {
  @IsUUID()
  productId: string;

  @IsEnum(SwipeDirection)
  direction: SwipeDirection;
}
