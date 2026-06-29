import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  fullName: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  /// Pakistan mobile number. Accepts +92XXXXXXXXXX or 03XXXXXXXXX formats.
  @IsString()
  @IsOptional()
  @Matches(/^(\+92|0)3[0-9]{9}$/, {
    message: 'phone must be a valid Pakistan mobile number (e.g. 03001234567)',
  })
  phone?: string;

  @IsString()
  @MinLength(8, { message: 'password must be at least 8 characters' })
  password: string;
}
