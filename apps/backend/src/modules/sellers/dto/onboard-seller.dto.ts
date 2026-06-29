import { IsOptional, IsString, MaxLength } from 'class-validator';

export class OnboardSellerDto {
  @IsString()
  @MaxLength(200)
  businessName: string;

  @IsString()
  @MaxLength(300)
  location: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  addressLine?: string;
}
