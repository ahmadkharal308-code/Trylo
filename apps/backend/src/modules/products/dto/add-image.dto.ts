import { IsEnum, IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';
import { ProductImageKind } from '@prisma/client';

export class AddImageDto {
  @IsUrl()
  url: string;

  @IsOptional()
  @IsEnum(ProductImageKind)
  kind?: ProductImageKind;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
