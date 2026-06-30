import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import {
  Department,
  Pattern,
  Tone,
  Brightness,
  Saturation,
  Formality,
  Coverage,
  Cut,
} from '@prisma/client';

export class UpdateProductDto {
  @IsOptional()
  @IsEnum(Department)
  department?: Department;

  @IsOptional()
  @IsUUID()
  rootCategoryId?: string;

  @IsOptional()
  @IsUUID()
  subStyleId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  priceMinor?: number;

  @IsOptional()
  @IsEnum(Pattern)
  pattern?: Pattern;

  @IsOptional()
  @IsEnum(Tone)
  tone?: Tone;

  @IsOptional()
  @IsEnum(Brightness)
  brightness?: Brightness;

  @IsOptional()
  @IsEnum(Saturation)
  saturation?: Saturation;

  @IsOptional()
  @IsEnum(Formality)
  formality?: Formality;

  @IsOptional()
  @IsEnum(Coverage)
  coverage?: Coverage;

  @IsOptional()
  @IsEnum(Cut)
  cut?: Cut;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  silhouette?: string;

  @IsOptional()
  attributesExtra?: Record<string, unknown>;
}
