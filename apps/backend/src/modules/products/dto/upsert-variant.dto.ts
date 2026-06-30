import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class UpsertVariantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  size: string;

  @IsInt()
  @Min(0)
  stockQty: number;
}
