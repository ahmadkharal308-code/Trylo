import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
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

export class CreateVariantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  size: string;

  @IsInt()
  @Min(0)
  stockQty: number;
}

export class CreateProductDto {
  @IsEnum(Department)
  department: Department;

  @IsUUID()
  rootCategoryId: string;

  @IsOptional()
  @IsUUID()
  subStyleId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /** Price in paisa (PKR × 100). e.g. 2500 PKR = 250000 */
  @IsInt()
  @IsPositive()
  priceMinor: number;

  // --- Universal scoring attributes (Layer 1) ---

  @IsEnum(Pattern)
  pattern: Pattern;

  @IsEnum(Tone)
  tone: Tone;

  @IsEnum(Brightness)
  brightness: Brightness;

  @IsEnum(Saturation)
  saturation: Saturation;

  @IsEnum(Formality)
  formality: Formality;

  @IsEnum(Coverage)
  coverage: Coverage;

  @IsEnum(Cut)
  cut: Cut;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  silhouette: string;

  // --- Category-specific extras (JSON, not scored) ---
  @IsOptional()
  attributesExtra?: Record<string, unknown>;

  // --- Optional initial variants ---
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants?: CreateVariantDto[];
}
