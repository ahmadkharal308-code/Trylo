import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { VerificationStatus } from '@prisma/client';

const ALLOWED = [VerificationStatus.VERIFIED, VerificationStatus.REJECTED] as const;

export class ReviewSellerDto {
  @IsEnum(ALLOWED, {
    message: 'decision must be VERIFIED or REJECTED',
  })
  decision: (typeof ALLOWED)[number];

  /// Optional internal note visible to admins only (reason for rejection, flags, etc.).
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  note?: string;
}
