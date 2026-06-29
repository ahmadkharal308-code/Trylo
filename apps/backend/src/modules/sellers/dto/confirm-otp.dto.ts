import { IsString, Length, Matches } from 'class-validator';

export class ConfirmOtpDto {
  @IsString()
  @Matches(/^(\+92|0)3[0-9]{9}$/, {
    message: 'phone must be a valid Pakistan mobile number',
  })
  phone: string;

  @IsString()
  @Length(6, 6, { message: 'code must be exactly 6 digits' })
  @Matches(/^[0-9]{6}$/, { message: 'code must be 6 digits' })
  code: string;
}
