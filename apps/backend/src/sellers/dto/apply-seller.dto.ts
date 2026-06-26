import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class ApplySellerDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  businessName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsString()
  @IsOptional()
  addressLine?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{5}-\d{7}-\d$/, {
    message: 'cnicNumber must be in the format XXXXX-XXXXXXX-X (e.g. 35201-1234567-8)',
  })
  cnicNumber: string;
}
