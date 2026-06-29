import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  /// Can be email OR phone — the service accepts either.
  @IsString()
  identifier: string;

  @IsString()
  @MinLength(8)
  password: string;
}
